import type { QueryDocumentSnapshot } from "firebase/firestore";
import { AdminPokemonList, Bookmark } from "../../components/types/typesUsed";
import { getDb } from "../../context/firebase";
import { pokemonData } from "../../data/pokemon";
import { ForumPost, ForumThread } from "./types";

function threadsPath(forum: string) {
  return ["forum", forum, "threads"] as const;
}

/**
 * One page-sized fetch of the newest threads for a category, filtered to the
 * requested archive state SERVER-SIDE via `where("closed", "==", archive)` +
 * `orderBy("timePosted")`. This needs the composite index (closed ASC,
 * timePosted DESC) in firestore.indexes.json. If that index is not built yet
 * (or the query is otherwise rejected) it falls back to fetching the page and
 * filtering `closed` client-side, so the list never breaks during rollout.
 *
 * Note: `pinned` is a sparse field (many threads lack it), so it is NOT part of
 * the server orderBy; pinned threads are floated to the top client-side within
 * the fetched page.
 */
export const getThreadList = async (
  forum: string,
  archive = false
): Promise<ForumThread[]> => {
  const { collection, getDocs, limit, orderBy, query, where } = await import("firebase/firestore");
  const db = await getDb();
  const colRef = collection(db, ...threadsPath(forum));
  let snapshot;
  try {
    snapshot = await getDocs(
      query(colRef, where("closed", "==", archive), orderBy("timePosted", "desc"), limit(200))
    );
  } catch {
    snapshot = await getDocs(query(colRef, orderBy("timePosted", "desc"), limit(200)));
  }
  const threads: ForumThread[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (Object.keys(data).length === 0) return;
    // Enforce the archive state in both paths (redundant for the indexed query,
    // required for the fallback query which fetches every state).
    if (!!(data as ForumThread).closed !== archive) return;
    threads.push({ id: docSnap.id, ...data } as ForumThread);
  });
  // Pinned threads always sit above the normal latest-activity ordering.
  return threads.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (b.timePosted?.seconds ?? 0) - (a.timePosted?.seconds ?? 0);
  });
};

export const getThread = async (forum: string, threadId: string): Promise<ForumThread | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, ...threadsPath(forum), threadId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ForumThread;
};

export const getPostsCount = async (forum: string, threadId: string): Promise<number> => {
  const { collection, getCountFromServer, query } = await import("firebase/firestore");
  const db = await getDb();
  const colRef = collection(db, ...threadsPath(forum), threadId, "posts");
  const snapshot = await getCountFromServer(query(colRef));
  return snapshot.data().count;
};

/**
 * Fetch a single page of posts (ascending order within the thread). The last
 * page queries in reverse with a small limit so deep threads never load from
 * the start; earlier pages read up to the requested page only.
 */
// Forward-pagination cursor cache: the last document of each fetched page,
// keyed by forum/thread/page. Lets the next page start right after it instead
// of re-reading every earlier post (Firestore bills per document scanned).
const pageCursors = new Map<string, QueryDocumentSnapshot>();
const cursorKey = (forum: string, threadId: string, page: number) =>
  `${forum}/${threadId}/${page}`;

export const getPostsPage = async (
  forum: string,
  threadId: string,
  page: number,
  perPage: number,
  totalCount: number
): Promise<ForumPost[]> => {
  const { collection, getDocs, limit, orderBy, query, startAfter } = await import(
    "firebase/firestore"
  );
  const db = await getDb();
  const colRef = collection(db, ...threadsPath(forum), threadId, "posts");
  const lastPage = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(1, page), lastPage);

  // Last page: read only the tail newest-first, then flip to chronological.
  if (safePage === lastPage) {
    const tailCount = totalCount - (lastPage - 1) * perPage || perPage;
    const snapshot = await getDocs(query(colRef, orderBy("timePosted", "desc"), limit(tailCount)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ForumPost).reverse();
  }

  // Forward path via cursors: start from the nearest cached page boundary at or
  // before safePage-1, then walk forward one page at a time with
  // startAfter + limit(perPage), caching each boundary as we go. Only when no
  // earlier cursor is cached (a cold jump to a middle page) do we walk from the
  // top, and even then we read a single page at a time (not safePage*perPage at
  // once) and populate every intermediate cursor so later jumps are cheap.
  let startPage = 1;
  let cursor: QueryDocumentSnapshot | undefined;
  for (let p = safePage - 1; p >= 1; p--) {
    const cached = pageCursors.get(cursorKey(forum, threadId, p));
    if (cached) {
      cursor = cached;
      startPage = p + 1;
      break;
    }
  }

  let docs: QueryDocumentSnapshot[] = [];
  for (let p = startPage; p <= safePage; p++) {
    const q = cursor
      ? query(colRef, orderBy("timePosted", "asc"), startAfter(cursor), limit(perPage))
      : query(colRef, orderBy("timePosted", "asc"), limit(perPage));
    docs = (await getDocs(q)).docs;
    if (!docs.length) break; // ran past the end
    const last = docs[docs.length - 1];
    if (!last) break; // docs is non-empty past the check above
    cursor = last;
    pageCursors.set(cursorKey(forum, threadId, p), cursor);
  }

  return docs.map((d) => ({ id: d.id, ...d.data() }) as ForumPost);
};

export const getPost = async (
  forum: string,
  threadId: string,
  postId: string
): Promise<ForumPost | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, ...threadsPath(forum), threadId, "posts", postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ForumPost;
};

/**
 * Encounter lists come from the existing admin pokemon-list library
 * (admin/pokemon_lists, managed under Dashboard → Admin → Adjust Lists).
 * Any member may pick a public list; private lists are visible to their
 * creator and to admins (who may use anyone's). Seeded mission-default pools
 * stay out of the picker; pickUpMission attaches them.
 */
export const getEncounterLists = async (
  username?: string,
  admin = false
): Promise<AdminPokemonList[]> => {
  const { getPokemonLists } = await import("../../queries/admin");
  const { formattedData } = await getPokemonLists();
  return formattedData
    .filter((list) => !list.missionDefault)
    .filter((list) => list.public || admin || (!!username && list.creator === username));
};

/**
 * Server-rolled results waiting to attach to the user's next post in a thread
 * (dice/random/encounter, see functions/src). Read-own, written by functions.
 */
export const getPendingActions = async (
  forum: string,
  threadId: string,
  uid: string
): Promise<{
  dice?: import("./types").DiceBlock;
  random?: import("./types").RandomBlock;
  /** Legacy single encounter (older in-flight threads). */
  encounter?: import("./types").EncounterBlock;
  /** Per-character encounters, keyed by characterId. */
  encounters?: Record<string, import("./types").EncounterBlock>;
}> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, ...threadsPath(forum), threadId, "pending", uid));
  return (snap.data() as any) ?? {};
};

/** A single saved draft (dashboard Drafts shape) for composer preloading. */
export const getDraft = async (uid: string, draftId: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "users", uid, "drafts", draftId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as import("../../components/types/typesUsed").Draft;
};

/** The user's bookmarks for one forum location (threadId-keyed map doc). */
export const getForumBookmarks = async (
  uid: string,
  forum: string
): Promise<Record<string, Bookmark>> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "users", uid, "bookmarks", forum));
  return (snap.data() as Record<string, Bookmark>) ?? {};
};

/** Resolve a list's rule (only / all-except) into concrete pokemon slugs. */
export function resolveListSlugs(list: AdminPokemonList | undefined): string[] {
  if (!list) return [];
  if (list.rule === "except") {
    const excluded = new Set(list.pokemons);
    return pokemonData.filter((p) => !excluded.has(p.slug)).map((p) => p.slug);
  }
  return list.pokemons;
}
