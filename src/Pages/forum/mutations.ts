import { v4 as uuid } from "uuid";
import { Bookmark, User } from "../../components/types/typesUsed";
import { db } from "../../context/firebase";
import { pokemonData } from "../../data/pokemon";
import {
  BossBattle,
  EncounterConfig,
  ForumThread,
  PostBlocks,
  PostCharacter,
  ThreadPoll,
} from "./types";

function bag(uid: string, docName: string) {
  return ["users", uid, "bag", docName] as const;
}

function threadDocPath(forum: string, threadId: string) {
  return ["forum", forum, "threads", threadId] as const;
}

function authorFields(user: User) {
  return {
    owner: user.displayName ?? user.username,
    ownerUid: user.uid,
    avatar: user.avatar ?? "",
    badges: user.otherinfo?.badges ?? null,
  };
}

/** Denormalized fields every published post refreshes on its thread doc. */
function threadActivityUpdate(user: User, extra: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    timePosted: now,
    lastPost: { by: user.displayName ?? user.username, avatar: user.avatar ?? "", at: now },
    [`participants.${user.uid}`]: {
      name: user.displayName ?? user.username,
      avatar: user.avatar ?? "",
    },
    ...extra,
  };
}

/** Inventory decrements + auto-catch bag writes shared by publish and edit. */
async function applyItemSideEffects(
  batch: import("firebase/firestore").WriteBatch,
  user: User,
  blocks: PostBlocks | undefined
) {
  const { doc, increment } = await import("firebase/firestore");
  const items = blocks?.itemsUsed ?? [];
  if (items.length) {
    const itemsRef = doc(db, ...bag(user.uid, "items"));
    const updates: Record<string, { quantity: ReturnType<typeof increment> }> = {};
    items.forEach((item) => {
      updates[item.itemId] = { quantity: increment(-item.qty) };
    });
    batch.set(itemsRef, updates, { merge: true });
  }

  // A successful catch adds the pokemon to the player's owned pokemon.
  const caught = blocks?.encounters?.find((e) => e.caught);
  if (caught) {
    const info = pokemonData.find((p) => p.slug === caught.slug);
    const idx = Number(info?.idx ?? 0);
    const genCaps = [151, 251, 386, 493, 649, 721, 809, 898];
    const genIndex = genCaps.findIndex((cap) => idx <= cap);
    const now = Date.now();
    const ownedRef = doc(db, ...bag(user.uid, "owned_pokemons"));
    batch.set(
      ownedRef,
      {
        [uuid()]: {
          date_caught: { nt: now, seconds: Math.floor(now / 1000) },
          gender: Math.random() < 0.5 ? "M" : "F",
          generation: `Generation ${["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][genIndex === -1 ? 7 : genIndex]}`,
          image_slug: caught.slug,
          name: caught.name,
          pokedex: String(idx || ""),
          regiondex: "",
          species: caught.name,
          type1: "Unknown",
        },
      },
      { merge: true }
    );
  }
}

export interface PublishThreadInput {
  user: User;
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

/** Creates the thread and its first post in one batch; the creator becomes host. */
export async function publishThread(input: PublishThreadInput): Promise<string> {
  const { collection, doc, getCountFromServer, writeBatch } = await import("firebase/firestore");
  const { user, forum } = input;
  const threadsCol = collection(db, "forum", forum, "threads");
  const snapshot = await getCountFromServer(threadsCol);
  const newThreadId = String(snapshot.data().count + 1);

  const now = new Date();
  const batch = writeBatch(db);
  const threadRef = doc(threadsCol, newThreadId);
  batch.set(threadRef, {
    title: input.title,
    createdBy: user.displayName ?? user.username,
    hostUid: user.uid,
    closed: false,
    private: false,
    pinned: input.pinned,
    tags: input.tags,
    instructions: input.instructions,
    restricted: input.restricted,
    allowedPosters: input.allowedPosters,
    createdAt: now,
    timePosted: now,
    replyCount: 0,
    lastPost: { by: user.displayName ?? user.username, avatar: user.avatar ?? "", at: now },
    participants: {
      [user.uid]: { name: user.displayName ?? user.username, avatar: user.avatar ?? "" },
    },
    poll: input.poll,
    encounterConfig: input.encounterConfig,
    encounterClaims: {},
    bossBattle: null,
  });

  batch.set(doc(collection(threadRef, "posts")), {
    ...authorFields(user),
    character: input.characters.map((c) => c.name).join(", "),
    characters: input.characters,
    text: input.html,
    timePosted: now,
    type: "user",
    blocks: {},
  });

  await batch.commit();
  return newThreadId;
}

export interface PublishPostInput {
  user: User;
  forum: string;
  threadId: string;
  characters: PostCharacter[];
  html: string;
  blocks: PostBlocks;
}

export async function publishPost(input: PublishPostInput): Promise<void> {
  const { collection, doc, increment, writeBatch } = await import("firebase/firestore");
  const { user, forum, threadId, blocks } = input;
  const batch = writeBatch(db);
  const threadRef = doc(db, ...threadDocPath(forum, threadId));

  batch.set(doc(collection(threadRef, "posts")), {
    ...authorFields(user),
    character: input.characters.map((c) => c.name).join(", "),
    characters: input.characters,
    text: input.html,
    timePosted: new Date(),
    type: "user",
    blocks,
  });

  const claimed = blocks.encounters?.length ?? 0;
  batch.update(
    threadRef,
    threadActivityUpdate(user, {
      replyCount: increment(1),
      ...(claimed ? { [`encounterClaims.${user.uid}`]: increment(claimed) } : {}),
    })
  );

  await applyItemSideEffects(batch, user, blocks);
  await batch.commit();
}

export interface EditPostInput {
  user: User;
  forum: string;
  threadId: string;
  postId: string;
  html: string;
  /** Full blocks value: previously published blocks plus newly added ones. */
  blocks: PostBlocks;
  /** Only the blocks added during this edit trigger inventory side-effects. */
  addedBlocks: PostBlocks;
}

/** Author-only edit: text is editable, published game blocks stay locked. */
export async function publishPostEdits(input: EditPostInput): Promise<void> {
  const { doc, writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(db);
  const postRef = doc(db, ...threadDocPath(input.forum, input.threadId), "posts", input.postId);
  batch.update(postRef, {
    text: input.html,
    blocks: input.blocks,
    editedAt: new Date(),
  });
  await applyItemSideEffects(batch, input.user, input.addedBlocks);
  await batch.commit();
}

export async function votePoll(
  forum: string,
  threadId: string,
  uid: string,
  optionId: string
): Promise<void> {
  const { doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, ...threadDocPath(forum, threadId)), {
    [`poll.votes.${uid}`]: optionId,
  });
}

export interface ThreadDetailsUpdate {
  title?: string;
  instructions?: string;
  tags?: string[];
  pinned?: boolean;
  restricted?: boolean;
  allowedPosters?: string[];
  encounterConfig?: EncounterConfig | null;
}

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

/** Posts the in-stream announcement card and flips the thread's boss state. */
export async function startBossBattle(
  user: User,
  forum: string,
  threadId: string,
  boss: Omit<BossBattle, "active" | "startedAt">
): Promise<void> {
  const { collection, doc, increment, writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(db);
  const threadRef = doc(db, ...threadDocPath(forum, threadId));
  const now = new Date();
  batch.update(
    threadRef,
    threadActivityUpdate(user, {
      replyCount: increment(1),
      bossBattle: { ...boss, active: true, startedAt: now },
    })
  );
  batch.set(doc(collection(threadRef, "posts")), {
    ...authorFields(user),
    character: "",
    characters: [],
    text: boss.description ?? "",
    timePosted: now,
    type: "boss_start",
    blocks: { boss: { slug: boss.slug, name: boss.name } },
  });
  await batch.commit();
}

export async function endBossBattle(
  user: User,
  forum: string,
  threadId: string,
  boss: BossBattle
): Promise<void> {
  const { collection, doc, increment, writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(db);
  const threadRef = doc(db, ...threadDocPath(forum, threadId));
  batch.update(
    threadRef,
    threadActivityUpdate(user, {
      replyCount: increment(1),
      bossBattle: { ...boss, active: false },
    })
  );
  batch.set(doc(collection(threadRef, "posts")), {
    ...authorFields(user),
    character: "",
    characters: [],
    text: "",
    timePosted: new Date(),
    type: "boss_end",
    blocks: { boss: { slug: boss.slug, name: boss.name } },
  });
  await batch.commit();
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
