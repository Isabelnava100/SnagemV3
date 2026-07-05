import { Bookmark, User } from "../../components/types/typesUsed";
import { db } from "../../context/firebase";
import {
  callPublishPost,
  callPublishThread,
  callSetBossBattle,
  callVotePoll,
} from "./functionsClient";
import { EncounterConfig, ForumThread, PostCharacter, ThreadPoll } from "./types";

/**
 * All game-relevant forum writes (threads, posts, rolls, votes, boss battles,
 * inventory effects) go through Cloud Functions. The server rolls, validates
 * allowances/quantities and writes transactionally, so a hostile client can't
 * forge results. Only low-stakes personal data (bookmarks, drafts, tickets)
 * and host-gated thread details are still written directly, backed by rules.
 */

function threadDocPath(forum: string, threadId: string) {
  return ["forum", forum, "threads", threadId] as const;
}

export interface PublishThreadInput {
  forum: string;
  title: string;
  instructions: string;
  tags: string[];
  pinned: boolean;
  restricted: boolean;
  allowedPosters: string[];
  poll: ThreadPoll | null;
  encounterConfig: EncounterConfig | null;
  characters: PostCharacter[];
  html: string;
  xpConfig?: Record<string, number> | null;
  xpAward?: "instant" | "onClose";
  attachSignature?: boolean;
}

/** Creates the thread and its first post server-side; the creator becomes host. */
export async function publishThread(input: PublishThreadInput): Promise<string> {
  const { threadId } = await callPublishThread(input);
  return threadId;
}

export interface PublishPostInput {
  forum: string;
  threadId: string;
  characters: PostCharacter[];
  html: string;
  items: Array<{ itemId: string; qty: number; note?: string }>;
  /** When set, edits that post (author-only, text + newly added blocks). */
  editPostId?: string;
  attachSignature?: boolean;
  /** Opt-in: this post attacks the active boss. */
  attackBoss?: boolean;
}

/**
 * Publishes a reply or edits. Pending rolls/encounters made for this thread
 * are attached server-side and consumed; items decrement transactionally.
 */
export async function publishPost(input: PublishPostInput): Promise<string> {
  const { postId } = await callPublishPost(input);
  return postId;
}

export async function votePoll(
  forum: string,
  threadId: string,
  optionId: string
): Promise<void> {
  await callVotePoll(forum, threadId, optionId);
}

export async function startBossBattle(
  forum: string,
  threadId: string,
  boss: { slug: string; description: string; excluded: string[]; stage: string }
): Promise<void> {
  await callSetBossBattle({ forum, threadId, action: "start", ...boss });
}

export async function endBossBattle(forum: string, threadId: string): Promise<void> {
  await callSetBossBattle({ forum, threadId, action: "end" });
}

// ---------------------------------------------------------------------------
// Direct writes (personal data / host-gated, enforced by firestore.rules)
// ---------------------------------------------------------------------------

export interface ThreadDetailsUpdate {
  title?: string;
  instructions?: string;
  tags?: string[];
  pinned?: boolean;
  restricted?: boolean;
  allowedPosters?: string[];
  encounterConfig?: EncounterConfig | null;
  /** Staff XP controls (server gates instant to staff-created threads). */
  xpAward?: "instant" | "onClose";
  xpConfig?: Record<string, number> | null;
}

/** Host-only (rules-enforced via hostUid) thread detail update. */
export async function updateThreadDetails(
  forum: string,
  threadId: string,
  update: ThreadDetailsUpdate
): Promise<void> {
  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, ...threadDocPath(forum, threadId)), { ...update });
}

export async function setThreadArchived(
  forum: string,
  threadId: string,
  archived: boolean
): Promise<void> {
  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, ...threadDocPath(forum, threadId)), { closed: archived });
}

/**
 * Bookmarks live at users/{uid}/bookmarks/{forumLink} as a threadId-keyed map
 * (the model the dashboard Bookmarks page reads). Also keeps the thread's
 * legacy notifyviaDiscord list in sync for the Discord notifier.
 */
export async function addBookmark(
  user: User,
  forum: string,
  thread: ForumThread
): Promise<void> {
  const { arrayUnion, doc, setDoc, updateDoc } = await import("firebase/firestore");
  const now = Date.now();
  const bookmark: Omit<Bookmark, "id"> = {
    title: thread.title,
    color: "#762B77",
    date: { nt: now, seconds: Math.floor(now / 1000) },
    send2discord: user.otherinfo?.discordUID ?? "",
    threadID: thread.id,
    threadLocation: forum,
    ...(thread.lastPost
      ? {
          latestPostBy: thread.lastPost.by,
          latestPostAt: {
            seconds: thread.lastPost.at?.seconds ?? Math.floor(now / 1000),
            nanoseconds: 0,
          },
        }
      : {}),
  };
  await setDoc(
    doc(db, "users", user.uid, "bookmarks", forum),
    { [thread.id]: bookmark },
    { merge: true }
  );
  // watcherUids powers in-app "new post in bookmarked thread" notifications;
  // notifyviaDiscord stays for the (optional, later) Discord channel.
  await updateDoc(doc(db, ...threadDocPath(forum, thread.id)), {
    watcherUids: arrayUnion(user.uid),
    ...(user.otherinfo?.discordUID
      ? { notifyviaDiscord: arrayUnion(user.otherinfo.discordUID) }
      : {}),
  });
}

export async function removeBookmark(
  user: User,
  forum: string,
  threadId: string
): Promise<void> {
  const { arrayRemove, deleteField, doc, setDoc, updateDoc } = await import("firebase/firestore");
  await setDoc(
    doc(db, "users", user.uid, "bookmarks", forum),
    { [threadId]: deleteField() },
    { merge: true }
  );
  await updateDoc(doc(db, ...threadDocPath(forum, threadId)), {
    watcherUids: arrayRemove(user.uid),
    ...(user.otherinfo?.discordUID
      ? { notifyviaDiscord: arrayRemove(user.otherinfo.discordUID) }
      : {}),
  });
}

export interface SaveDraftInput {
  user: User;
  forum: string;
  threadId: string;
  title: string;
  characterNames: string;
  html: string;
  /** Full composer state (ComposerDraftSettings) so every setting is restored. */
  settings?: Record<string, unknown>;
}

export const MAX_DRAFTS = 60;
export const DRAFT_WARNING_AT = 55;

/**
 * Saves into users/{uid}/drafts (dashboard Drafts shape). Enforces the
 * 60-draft cap; returns the new count so composers can warn from 55 (Q3).
 */
export async function saveDraft(input: SaveDraftInput): Promise<number> {
  const { addDoc, collection, getCountFromServer } = await import("firebase/firestore");
  const draftsCol = collection(db, "users", input.user.uid, "drafts");
  const count = (await getCountFromServer(draftsCol)).data().count;
  if (count >= MAX_DRAFTS) {
    throw new Error(
      `You've reached the ${MAX_DRAFTS}-draft limit. Delete some drafts from your dashboard first.`
    );
  }
  const now = Date.now();
  await addDoc(draftsCol, {
    category: input.forum,
    character_name: input.characterNames,
    color: "#762B77",
    date_saved: { nanoseconds: 0, seconds: Math.floor(now / 1000) },
    location_db: input.forum,
    long_text: input.html,
    thread_id: input.threadId,
    title_thread: input.title,
    // JSON round-trip strips undefined so Firestore accepts the nested state.
    ...(input.settings
      ? { settings: JSON.parse(JSON.stringify(input.settings)) }
      : {}),
  });
  return count + 1;
}

/** A draft is consumed (deleted) once a post is published from it (Q3). */
export async function deleteDraft(uid: string, draftId: string): Promise<void> {
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "users", uid, "drafts", draftId)).catch(() => undefined);
}

/** Clear-all for the Drafts tab (offered from 40 drafts up). */
export async function deleteAllDrafts(uid: string): Promise<void> {
  const { collection, deleteDoc, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "users", uid, "drafts"));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Closes a thread (archives it, making it read-only) and, when the closer left
 * a note about items/money/pokemon they roleplayed finding, files that note as
 * an xp_reward ticket for an admin to review. The thread creator and admins
 * can always close; reward-granting directors are permitted by the rules too.
 */
export async function closeThread(
  user: User,
  forum: string,
  threadId: string,
  threadTitle: string,
  note: string
): Promise<void> {
  const { addDoc, collection, doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, ...threadDocPath(forum, threadId)), { closed: true });
  if (note) {
    await addDoc(collection(db, "tickets"), {
      type: "xp_reward",
      actorUid: user.uid,
      actorName: user.displayName ?? user.username,
      threadPath: `Forum/${forum}/thread/${threadId}`,
      threadTitle,
      note,
      createdAt: new Date(),
    });
  }
}
