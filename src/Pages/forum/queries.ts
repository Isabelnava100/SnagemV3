import type { QueryDocumentSnapshot } from "firebase/firestore";
import { AdminPokemonList, Bookmark } from "../../components/types/typesUsed";
import { db } from "../../context/firebase";
import { pokemonData } from "../../data/pokemon";
import { ForumPost, ForumThread } from "./types";

function threadsPath(forum: string) {
  return ["forum", forum, "threads"] as const;
}

/**
 * One page-sized fetch of the newest threads for a category (both open and
 * archived; the archive toggle filters client-side so it flips instantly).
 * Server-side thread pagination stays deferred until a composite index exists
 * (see CLAUDE.md known deferred work).
 */
export const getThreadList = async (forum: string): Promise<ForumThread[]> => {
  const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
  const colRef = collection(db, ...threadsPath(forum));
  const snapshot = await getDocs(query(colRef, orderBy("timePosted", "desc"), limit(200)));
  const threads: ForumThread[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (Object.keys(data).length === 0) return;
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
  const snap = await getDoc(doc(db, ...threadsPath(forum), threadId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ForumThread;
};

export const getPostsCount = async (forum: string, threadId: string): Promise<number> => {
  const { collection, getCountFromServer, query } = await import("firebase/firestore");
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
  const colRef = collection(db, ...threadsPath(forum), threadId, "posts");
  const lastPage = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(1, page), lastPage);

  // Last page: read only the tail newest-first, then flip to chronological.
  if (safePage === lastPage) {
    const tailCount = totalCount - (lastPage - 1) * perPage || perPage;
    const snapshot = await getDocs(query(colRef, orderBy("timePosted", "desc"), limit(tailCount)));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ForumPost).reverse();
  }

  // If we hold the previous page's boundary cursor, start right after it and
  // read a single page. Otherwise (a cold jump straight to a middle page) fall
  // back to reading from the top, but still record the cursor for next time.
  const prevCursor =
    safePage > 1 ? pageCursors.get(cursorKey(forum, threadId, safePage - 1)) : undefined;

  let docs;
  if (safePage === 1 || prevCursor) {
    const q = prevCursor
      ? query(colRef, orderBy("timePosted", "asc"), startAfter(prevCursor), limit(perPage))
      : query(colRef, orderBy("timePosted", "asc"), limit(perPage));
    docs = (await getDocs(q)).docs;
  } else {
    const snapshot = await getDocs(
      query(colRef, orderBy("timePosted", "asc"), limit(safePage * perPage))
    );
    docs = snapshot.docs.slice((safePage - 1) * perPage);
  }

  // Record this page's last doc so the following page can start after it.
  if (docs.length) pageCursors.set(cursorKey(forum, threadId, safePage), docs[docs.length - 1]);
  return docs.map((d) => ({ id: d.id, ...d.data() }) as ForumPost);
};

export const getPost = async (
  forum: string,
  threadId: string,
  postId: string
): Promise<ForumPost | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, ...threadsPath(forum), threadId, "posts", postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ForumPost;
};

/**
 * Encounter lists come from the existing admin pokemon-list library
 * (admin/pokemon_lists, managed under Dashboard → Admin → Adjust Lists).
 * Hosts may pick any public list or one they created themselves.
 */
export const getEncounterLists = async (username?: string): Promise<AdminPokemonList[]> => {
  const { getPokemonLists } = await import("../../queries/admin");
  const { formattedData } = await getPokemonLists();
  return formattedData.filter((list) => list.public || (!!username && list.creator === username));
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
  encounter?: import("./types").EncounterBlock;
}> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, ...threadsPath(forum), threadId, "pending", uid));
  return (snap.data() as any) ?? {};
};

/** A single saved draft (dashboard Drafts shape) for composer preloading. */
export const getDraft = async (uid: string, draftId: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
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
