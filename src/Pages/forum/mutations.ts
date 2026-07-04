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
 * inventory effects) go through Cloud Functions — the server rolls, validates
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
  boss: { slug: string; description: string; excluded: string[] }
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
    threadLocation: forum as Bookmark["threadLocation"],
  };
  await setDoc(
    doc(db, "users", user.uid, "bookmarks", forum),
    { [thread.id]: bookmark },
    { merge: true }
  );
  if (user.otherinfo?.discordUID) {
    await updateDoc(doc(db, ...threadDocPath(forum, thread.id)), {
      notifyviaDiscord: arrayUnion(user.otherinfo.discordUID),
    });
  }
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
  if (user.otherinfo?.discordUID) {
    await updateDoc(doc(db, ...threadDocPath(forum, threadId)), {
      notifyviaDiscord: arrayRemove(user.otherinfo.discordUID),
    });
  }
}

export interface SaveDraftInput {
  user: User;
  forum: string;
  threadId: string;
  title: string;
  characterNames: string;
  html: string;
}

/** Saves into users/{uid}/drafts with the shape the dashboard Drafts page reads. */
export async function saveDraft(input: SaveDraftInput): Promise<void> {
  const { addDoc, collection } = await import("firebase/firestore");
  const now = Date.now();
  await addDoc(collection(db, "users", input.user.uid, "drafts"), {
    category: input.forum,
    character_name: input.characterNames,
    color: "#762B77",
    date_saved: { nanoseconds: 0, seconds: Math.floor(now / 1000) },
    location_db: input.forum,
    long_text: input.html,
    thread_id: input.threadId,
    title_thread: input.title,
  });
}

/**
 * SubmitXP files an XP-review request into the tickets collection (readable by
 * admins). The XP accrual flow itself is still an open product question — see
 * docs/FORUM.md.
 */
export async function submitXP(
  user: User,
  forum: string,
  threadId: string,
  threadTitle: string,
  note: string
): Promise<void> {
  const { addDoc, collection } = await import("firebase/firestore");
  await addDoc(collection(db, "tickets"), {
    type: "xp_submission",
    actorUid: user.uid,
    actorName: user.displayName ?? user.username,
    threadPath: `Forum/${forum}/thread/${threadId}`,
    threadTitle,
    note,
    createdAt: new Date(),
  });
}
