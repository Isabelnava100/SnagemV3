/**
 * Snagem forum — server-side integrity layer.
 *
 * Everything a hostile client could forge happens here instead:
 * dice/random rolls, encounter rolls + allowances, inventory decrements,
 * catch resolution, post/thread publishing, poll votes and boss battles.
 *
 * Rolls are BOUND to the player's next post in the thread: each roll is
 * stored in forum/{forum}/threads/{threadId}/pending/{uid} and consumed by
 * publishForumPost. You cannot re-roll by abandoning a draft — a pending
 * result stays attached until it is published.
 *
 * Deploy: firebase deploy --only functions  (requires the Blaze plan)
 */
import { randomInt, randomUUID } from "crypto";
import { initializeApp } from "firebase-admin/app";
import {
  DocumentReference,
  DocumentSnapshot,
  FieldValue,
  getFirestore,
  Transaction,
} from "firebase-admin/firestore";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import pokemonJSON from "./pokemon.json";

initializeApp();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Species catalog (same source file as the web app)
// ---------------------------------------------------------------------------

interface CatalogEntry {
  name: string;
  slug: string;
  idx: string;
}

const catalog: CatalogEntry[] = Object.values(pokemonJSON as Record<string, any>).map((p) => ({
  name: p.name.eng as string,
  slug: p.slug.eng as string,
  idx: p.idx as string,
}));
const catalogBySlug = new Map(catalog.map((p) => [p.slug, p]));

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];
const GEN_CAPS = [151, 251, 386, 493, 649, 721, 809, 898];
const GEN_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// Thread-creation matrix (mirrors src/Pages/forum/config.ts)
const ADMIN_CREATE_FORUMS = ["Main-Forum", "The-Colosseum", "Master-Mission"];
const EVENT_FORUM = "Events";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Member {
  uid: string;
  username: string;
  avatar: string;
  badges: string[] | null;
  permissions: string;
  capabilities: string[];
}

function requireAuth(request: CallableRequest): string {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in first.");
  return request.auth.uid;
}

async function loadMember(uid: string): Promise<Member> {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "No member profile found.");
  const data = snap.data()!;
  if (data.permissions === "Applicant" || data.permissions === "Disabled") {
    throw new HttpsError("permission-denied", "Your account cannot post.");
  }
  return {
    uid,
    username: (data.username as string) ?? "",
    avatar: (data.avatar as string) ?? "",
    badges: (data.badges as string[]) ?? null,
    permissions: (data.permissions as string) ?? "",
    capabilities: (data.capabilities as string[]) ?? [],
  };
}

const isAdmin = (m: Member) => m.permissions === "Admin";
const hasCap = (m: Member, cap: string) => isAdmin(m) || m.capabilities.includes(cap);

function threadRef(forum: string, threadId: string): DocumentReference {
  return db.doc(`forum/${forum}/threads/${threadId}`);
}
function pendingRef(forum: string, threadId: string, uid: string): DocumentReference {
  return threadRef(forum, threadId).collection("pending").doc(uid);
}

function requireString(value: unknown, field: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return value;
}

function assertOpenThread(snap: DocumentSnapshot): FirebaseFirestore.DocumentData {
  if (!snap.exists) throw new HttpsError("not-found", "Thread not found.");
  const data = snap.data()!;
  if (data.closed) throw new HttpsError("failed-precondition", "This thread is archived.");
  return data;
}

function isHost(thread: FirebaseFirestore.DocumentData, member: Member): boolean {
  if (thread.hostUid) return thread.hostUid === member.uid;
  return thread.createdBy === member.username; // legacy threads
}

function mayPost(thread: FirebaseFirestore.DocumentData, member: Member): boolean {
  if (isAdmin(member) || isHost(thread, member)) return true;
  if (!thread.restricted) return true;
  return ((thread.allowedPosters as string[]) ?? []).includes(member.username);
}

function resolveListSlugs(
  lists: Record<string, any> | undefined,
  listId: string | undefined
): string[] {
  const list = listId ? lists?.[listId] : undefined;
  if (!list) return [];
  if (list.rule === "except") {
    const excluded = new Set<string>(list.pokemons ?? []);
    return catalog.filter((p) => !excluded.has(p.slug)).map((p) => p.slug);
  }
  return (list.pokemons as string[]) ?? [];
}

/** Sanitize the client-provided character strips (display data only). */
function sanitizeCharacters(input: unknown): any[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 12).map((c: any) => ({
    id: String(c?.id ?? "").slice(0, 100),
    name: String(c?.name ?? "").slice(0, 100),
    imageURL: String(c?.imageURL ?? "").slice(0, 500),
    ...(c?.teamId ? { teamId: String(c.teamId).slice(0, 100) } : {}),
    ...(c?.teamName ? { teamName: String(c.teamName).slice(0, 100) } : {}),
    pokemon: (Array.isArray(c?.pokemon) ? c.pokemon : [])
      .slice(0, 6)
      .filter((p: any) => catalogBySlug.has(p?.slug))
      .map((p: any) => ({
        slug: p.slug as string,
        name: catalogBySlug.get(p.slug)!.name,
      })),
  }));
}

function authorFields(member: Member) {
  return {
    owner: member.username,
    ownerUid: member.uid,
    avatar: member.avatar,
    badges: member.badges,
  };
}

function activityUpdate(member: Member, now: Date, extra: Record<string, unknown> = {}) {
  return {
    timePosted: now,
    lastPost: { by: member.username, avatar: member.avatar, at: now },
    [`participants.${member.uid}`]: { name: member.username, avatar: member.avatar },
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Rolls — bound to the caller's next post in the thread
// ---------------------------------------------------------------------------

export const rollDice = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const threadId = requireString(request.data?.threadId, "threadId", 20);
  const sides = Number(request.data?.sides);
  const count = Number(request.data?.count);
  if (!DICE_TYPES.includes(sides)) throw new HttpsError("invalid-argument", "Unknown die type.");
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new HttpsError("invalid-argument", "Roll between 1 and 20 dice.");
  }
  await loadMember(uid);

  const dice = {
    sides,
    count,
    results: Array.from({ length: count }, () => randomInt(1, sides + 1)),
  };

  await db.runTransaction(async (tx) => {
    const [threadSnap, pendingSnap] = await Promise.all([
      tx.get(threadRef(forum, threadId)),
      tx.get(pendingRef(forum, threadId, uid)),
    ]);
    assertOpenThread(threadSnap);
    if (pendingSnap.data()?.dice) {
      throw new HttpsError(
        "failed-precondition",
        "You already rolled dice for your next post in this thread."
      );
    }
    tx.set(pendingRef(forum, threadId, uid), { dice }, { merge: true });
  });

  return dice;
});

export const rollRandom = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const threadId = requireString(request.data?.threadId, "threadId", 20);
  const min = Math.trunc(Number(request.data?.min));
  const max = Math.trunc(Number(request.data?.max));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new HttpsError("invalid-argument", "Lowest must be below highest.");
  }
  if (Math.abs(min) > 1_000_000_000 || Math.abs(max) > 1_000_000_000) {
    throw new HttpsError("invalid-argument", "Bounds are too large.");
  }
  await loadMember(uid);

  const random = { min, max, result: randomInt(min, max + 1) };

  await db.runTransaction(async (tx) => {
    const [threadSnap, pendingSnap] = await Promise.all([
      tx.get(threadRef(forum, threadId)),
      tx.get(pendingRef(forum, threadId, uid)),
    ]);
    assertOpenThread(threadSnap);
    if (pendingSnap.data()?.random) {
      throw new HttpsError(
        "failed-precondition",
        "You already generated a random number for your next post in this thread."
      );
    }
    tx.set(pendingRef(forum, threadId, uid), { random }, { merge: true });
  });

  return random;
});

export const rollEncounter = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const threadId = requireString(request.data?.threadId, "threadId", 20);
  const chosenSlug = request.data?.chosenSlug ? String(request.data.chosenSlug) : undefined;
  await loadMember(uid);

  const listsSnap = await db.doc("admin/pokemon_lists").get();
  const lists = (listsSnap.data() as Record<string, any>) ?? {};

  const encounter = await db.runTransaction(async (tx) => {
    const [threadSnap, pendingSnap] = await Promise.all([
      tx.get(threadRef(forum, threadId)),
      tx.get(pendingRef(forum, threadId, uid)),
    ]);
    const thread = assertOpenThread(threadSnap);
    const config = thread.encounterConfig;
    if (!config?.enabled) throw new HttpsError("failed-precondition", "Encounters are not enabled here.");
    if (config.disabled) throw new HttpsError("failed-precondition", "The host turned off encounters.");
    if (pendingSnap.data()?.encounter) {
      throw new HttpsError(
        "failed-precondition",
        "You already have an encounter waiting for your next post."
      );
    }
    const claims = (thread.encounterClaims as Record<string, number>) ?? {};
    if ((claims[uid] ?? 0) >= (config.perUserLimit ?? 0)) {
      throw new HttpsError("failed-precondition", "You have no encounters left on this thread.");
    }

    const nonCatchSlugs = new Set(resolveListSlugs(lists, config.nonCatchable?.listId));
    const pool = [...new Set([...resolveListSlugs(lists, config.listId), ...nonCatchSlugs])];
    if (!pool.length) throw new HttpsError("failed-precondition", "The encounter list is empty.");

    let slug: string;
    let mode: "roll" | "choose";
    if (config.mode === "choose") {
      if (!chosenSlug || !pool.includes(chosenSlug)) {
        throw new HttpsError("invalid-argument", "That pokemon is not in the host's list.");
      }
      slug = chosenSlug;
      mode = "choose";
    } else {
      slug = pool[randomInt(pool.length)];
      mode = "roll";
    }

    const result = {
      slug,
      name: catalogBySlug.get(slug)?.name ?? slug,
      mode,
      catchable: !nonCatchSlugs.has(slug) && !thread.bossBattle?.active,
    };
    tx.set(pendingRef(forum, threadId, uid), { encounter: result }, { merge: true });
    tx.update(threadRef(forum, threadId), {
      [`encounterClaims.${uid}`]: FieldValue.increment(1),
    });
    return result;
  });

  return encounter;
});

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

interface ItemRequest {
  itemId: string;
  qty: number;
  note?: string;
}

function readItemRequests(input: unknown): ItemRequest[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((i: any) => ({
      itemId: String(i?.itemId ?? "").slice(0, 100),
      qty: Math.trunc(Number(i?.qty)),
      note: i?.note ? String(i.note).slice(0, 500) : undefined,
    }))
    .filter((i) => i.itemId && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 999);
}

export const publishForumPost = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const threadId = requireString(request.data?.threadId, "threadId", 20);
  const html = requireString(request.data?.html, "post body", 100_000);
  const editPostId = request.data?.editPostId ? String(request.data.editPostId) : undefined;
  const characters = sanitizeCharacters(request.data?.characters);
  const itemRequests = readItemRequests(request.data?.items);
  const member = await loadMember(uid);

  const tRef = threadRef(forum, threadId);
  const pRef = pendingRef(forum, threadId, uid);
  const bagRef = db.doc(`users/${uid}/bag/items`);
  const ownedRef = db.doc(`users/${uid}/bag/owned_pokemons`);

  const postId = await db.runTransaction(async (tx) => {
    // -- reads (all before any write) --------------------------------------
    const [threadSnap, pendingSnap] = await Promise.all([tx.get(tRef), tx.get(pRef)]);
    const thread = assertOpenThread(threadSnap);
    if (!mayPost(thread, member)) {
      throw new HttpsError("permission-denied", "The host limited who can post on this thread.");
    }

    let editSnap: DocumentSnapshot | undefined;
    if (editPostId) {
      editSnap = await tx.get(tRef.collection("posts").doc(editPostId));
      if (!editSnap.exists) throw new HttpsError("not-found", "Post not found.");
      const prev = editSnap.data()!;
      if (prev.ownerUid !== uid) {
        throw new HttpsError("permission-denied", "Only the author can edit a post.");
      }
      if (prev.type && prev.type !== "user") {
        throw new HttpsError("failed-precondition", "System posts cannot be edited.");
      }
    }

    let bag: Record<string, any> = {};
    if (itemRequests.length) {
      const bagSnap = await tx.get(bagRef);
      bag = (bagSnap.data() as Record<string, any>) ?? {};
    }

    // -- compute ------------------------------------------------------------
    const bossActiveForUser =
      !!thread.bossBattle?.active &&
      !((thread.bossBattle.excluded as string[]) ?? []).includes(member.username);

    const itemsUsed = itemRequests.map((req) => {
      const owned = bag[req.itemId];
      if (!owned || (owned.quantity ?? 0) < req.qty) {
        throw new HttpsError(
          "failed-precondition",
          `You do not have ${req.qty}x ${owned?.name ?? "that item"}.`
        );
      }
      const isBall = String(owned.category ?? "").toLowerCase().includes("ball");
      if (isBall && bossActiveForUser) {
        throw new HttpsError("failed-precondition", "Balls cannot be used in a team battle.");
      }
      return {
        itemId: req.itemId,
        name: owned.name as string,
        filePath: (owned.filePath as string) ?? "",
        qty: req.qty,
        isBall,
        ...(req.note ? { note: req.note } : {}),
      };
    });

    const pending = pendingSnap.data() ?? {};
    const encounter = pending.encounter ? { ...pending.encounter } : undefined;
    if (encounter) {
      const ball = itemsUsed.find((i) => i.isBall);
      encounter.caught = !!ball && !!encounter.catchable;
      if (encounter.caught && ball) (ball as any).caughtPokemon = encounter.name;
    }

    const blocks: Record<string, unknown> = {};
    if (encounter) blocks.encounters = [encounter];
    if (itemsUsed.length) {
      blocks.itemsUsed = itemsUsed.map(({ isBall, ...item }) => item);
    }
    if (pending.dice) blocks.dice = [pending.dice];
    if (pending.random) blocks.randoms = [pending.random];
    if (bossActiveForUser && !editPostId) {
      blocks.boss = { slug: thread.bossBattle.slug, name: thread.bossBattle.name };
    }

    const now = new Date();

    // -- writes ---------------------------------------------------------------
    itemsUsed.forEach((item) => {
      tx.set(
        bagRef,
        { [item.itemId]: { quantity: FieldValue.increment(-item.qty) } },
        { merge: true }
      );
    });

    // The post id must be known before the catch write so the caught pokemon
    // can carry its provenance (which thread/post it was caught in).
    const newPostRef = editPostId ? undefined : tRef.collection("posts").doc();

    if (encounter?.caught) {
      const info = catalogBySlug.get(encounter.slug);
      const idx = Number(info?.idx ?? 0);
      const genIndex = GEN_CAPS.findIndex((cap) => idx <= cap);
      tx.set(
        ownedRef,
        {
          [randomUUID()]: {
            date_caught: { nt: now.getTime(), seconds: Math.floor(now.getTime() / 1000) },
            gender: randomInt(2) === 0 ? "M" : "F",
            generation: `Generation ${GEN_NAMES[genIndex === -1 ? 7 : genIndex]}`,
            image_slug: encounter.slug,
            name: encounter.name,
            pokedex: String(idx || ""),
            regiondex: "",
            species: encounter.name,
            type1: "Unknown",
            caughtIn: {
              forum,
              threadId,
              postId: editPostId ?? newPostRef!.id,
              threadTitle: (thread.title as string) ?? "",
            },
          },
        },
        { merge: true }
      );
    }

    let resultPostId: string;
    if (editPostId && editSnap) {
      const prev = editSnap.data()!;
      const prevBlocks = prev.blocks ?? {};
      const merged = {
        ...(prevBlocks.boss ? { boss: prevBlocks.boss } : {}),
        encounters: [...(prevBlocks.encounters ?? []), ...((blocks.encounters as any[]) ?? [])],
        itemsUsed: [...(prevBlocks.itemsUsed ?? []), ...((blocks.itemsUsed as any[]) ?? [])],
        dice: [...(prevBlocks.dice ?? []), ...((blocks.dice as any[]) ?? [])],
        randoms: [...(prevBlocks.randoms ?? []), ...((blocks.randoms as any[]) ?? [])],
      };
      tx.update(editSnap.ref, { text: html, blocks: merged, editedAt: now });
      resultPostId = editPostId;
    } else {
      tx.create(newPostRef!, {
        ...authorFields(member),
        character: characters.map((c) => c.name).join(", "),
        characters,
        text: html,
        timePosted: now,
        type: "user",
        blocks,
      });
      tx.update(tRef, activityUpdate(member, now, { replyCount: FieldValue.increment(1) }));
      resultPostId = newPostRef!.id;
    }

    if (pendingSnap.exists) tx.delete(pRef);
    return resultPostId;
  });

  return { postId };
});

export const publishForumThread = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const title = requireString(request.data?.title, "title", 200);
  const html = requireString(request.data?.html, "first post", 100_000);
  const member = await loadMember(uid);

  // Thread-creation permission matrix.
  if (ADMIN_CREATE_FORUMS.includes(forum) && !isAdmin(member)) {
    throw new HttpsError("permission-denied", "Only admins can create threads here.");
  }
  if (forum === EVENT_FORUM && !hasCap(member, "HostEvents")) {
    throw new HttpsError("permission-denied", "Only event hosts can create event threads.");
  }
  const pinned = !!request.data?.pinned && isAdmin(member);

  const characters = sanitizeCharacters(request.data?.characters);
  const instructions = String(request.data?.instructions ?? "").slice(0, 2000);
  const tags = (Array.isArray(request.data?.tags) ? request.data.tags : [])
    .slice(0, 15)
    .map((t: unknown) => String(t).slice(0, 40));
  const restricted = !!request.data?.restricted;
  const allowedPosters = (Array.isArray(request.data?.allowedPosters)
    ? request.data.allowedPosters
    : []
  )
    .slice(0, 100)
    .map((n: unknown) => String(n).slice(0, 100));

  let poll: any = null;
  if (request.data?.poll?.question) {
    const options = (Array.isArray(request.data.poll.options) ? request.data.poll.options : [])
      .slice(0, 20)
      .map((o: any) => ({
        id: String(o?.id ?? randomUUID()).slice(0, 50),
        text: String(o?.text ?? "").slice(0, 200),
      }))
      .filter((o: any) => o.text.trim());
    if (options.length >= 2) {
      poll = {
        question: String(request.data.poll.question).slice(0, 300),
        options,
        votes: {},
      };
    }
  }

  let encounterConfig: any = null;
  const rawConfig = request.data?.encounterConfig;
  if (rawConfig?.enabled && rawConfig.listId) {
    encounterConfig = {
      enabled: true,
      disabled: false,
      listId: String(rawConfig.listId).slice(0, 100),
      listName: String(rawConfig.listName ?? "").slice(0, 100),
      mode: rawConfig.mode === "choose" ? "choose" : "roll",
      perUserLimit: Math.min(50, Math.max(1, Math.trunc(Number(rawConfig.perUserLimit)) || 1)),
      nonCatchable: rawConfig.nonCatchable?.listId
        ? {
            listId: String(rawConfig.nonCatchable.listId).slice(0, 100),
            listName: String(rawConfig.nonCatchable.listName ?? "").slice(0, 100),
          }
        : null,
    };
  }

  const threadsCol = db.collection(`forum/${forum}/threads`);
  const countSnap = await threadsCol.count().get();
  const threadId = String(countSnap.data().count + 1);
  const now = new Date();

  const batch = db.batch();
  const tRef = threadsCol.doc(threadId);
  batch.create(tRef, {
    title,
    createdBy: member.username,
    hostUid: uid,
    closed: false,
    private: false,
    pinned,
    tags,
    instructions,
    restricted,
    allowedPosters: restricted ? allowedPosters : [],
    createdAt: now,
    timePosted: now,
    replyCount: 0,
    lastPost: { by: member.username, avatar: member.avatar, at: now },
    participants: { [uid]: { name: member.username, avatar: member.avatar } },
    poll,
    encounterConfig,
    encounterClaims: {},
    bossBattle: null,
  });
  batch.create(tRef.collection("posts").doc(), {
    ...authorFields(member),
    character: characters.map((c) => c.name).join(", "),
    characters,
    text: html,
    timePosted: now,
    type: "user",
    blocks: {},
  });
  await batch.commit();

  return { threadId };
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const MAX_ENABLED_BADGES = 5;

/**
 * Toggle a badge between inserted (displayed) and disabled. Ownership lives in
 * users/{uid}/bag/badges (admin-granted, admin-write-only per rules); the
 * enabled set syncs into users/{uid}.badges, which forum post cards snapshot
 * at publish time. Max 5 badges may be enabled at once.
 */
export const setBadgeEnabled = onCall(async (request) => {
  const uid = requireAuth(request);
  const label = requireString(request.data?.label, "badge", 100);
  const enabled = !!request.data?.enabled;
  await loadMember(uid);

  const badgeBagRef = db.doc(`users/${uid}/bag/badges`);
  const userRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (tx) => {
    const bagSnap = await tx.get(badgeBagRef);
    // Tuple shape: Record<key, [label, background, enabled]>
    const bag = (bagSnap.data() as Record<string, [string, string, boolean]>) ?? {};
    const entry = Object.entries(bag).find(([, tuple]) => tuple[0] === label);
    if (!entry) throw new HttpsError("permission-denied", "You do not own that badge.");
    const [key, tuple] = entry;

    const enabledCount = Object.values(bag).filter((t) => t[2]).length;
    if (enabled && !tuple[2] && enabledCount >= MAX_ENABLED_BADGES) {
      throw new HttpsError(
        "failed-precondition",
        `You can only display ${MAX_ENABLED_BADGES} badges at once.`
      );
    }

    bag[key] = [tuple[0], tuple[1], enabled];
    tx.update(badgeBagRef, { [key]: bag[key] });
    tx.update(userRef, {
      badges: Object.values(bag).filter((t) => t[2]).map((t) => t[0]),
    });
  });

  return { ok: true };
});

// ---------------------------------------------------------------------------
// Polls & boss battles
// ---------------------------------------------------------------------------

export const voteForumPoll = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const threadId = requireString(request.data?.threadId, "threadId", 20);
  const optionId = requireString(request.data?.optionId, "option", 50);
  await loadMember(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(threadRef(forum, threadId));
    const thread = assertOpenThread(snap);
    const options: Array<{ id: string }> = thread.poll?.options ?? [];
    if (!options.some((o) => o.id === optionId)) {
      throw new HttpsError("invalid-argument", "That poll option does not exist.");
    }
    tx.update(threadRef(forum, threadId), { [`poll.votes.${uid}`]: optionId });
  });

  return { ok: true };
});

export const setBossBattle = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const threadId = requireString(request.data?.threadId, "threadId", 20);
  const action = request.data?.action;
  if (action !== "start" && action !== "end") {
    throw new HttpsError("invalid-argument", "Unknown boss battle action.");
  }
  const member = await loadMember(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(threadRef(forum, threadId));
    const thread = assertOpenThread(snap);
    if (!isHost(thread, member) && !isAdmin(member)) {
      throw new HttpsError("permission-denied", "Only the host can manage boss battles.");
    }
    const now = new Date();

    if (action === "start") {
      if (thread.bossBattle?.active) {
        throw new HttpsError("failed-precondition", "A boss battle is already active.");
      }
      const slug = requireString(request.data?.slug, "boss pokemon", 100);
      const info = catalogBySlug.get(slug);
      if (!info) throw new HttpsError("invalid-argument", "Unknown pokemon.");
      const description = String(request.data?.description ?? "").slice(0, 2000);
      const excluded = (Array.isArray(request.data?.excluded) ? request.data.excluded : [])
        .slice(0, 100)
        .map((n: unknown) => String(n).slice(0, 100));

      const boss = {
        active: true,
        slug,
        name: info.name,
        description,
        excluded,
        startedAt: now,
      };
      tx.update(
        threadRef(forum, threadId),
        activityUpdate(member, now, { replyCount: FieldValue.increment(1), bossBattle: boss })
      );
      tx.create(threadRef(forum, threadId).collection("posts").doc(), {
        ...authorFields(member),
        character: "",
        characters: [],
        text: description,
        timePosted: now,
        type: "boss_start",
        blocks: { boss: { slug, name: info.name } },
      });
    } else {
      const boss = thread.bossBattle;
      if (!boss?.active) {
        throw new HttpsError("failed-precondition", "There is no active boss battle.");
      }
      tx.update(
        threadRef(forum, threadId),
        activityUpdate(member, now, {
          replyCount: FieldValue.increment(1),
          bossBattle: { ...boss, active: false },
        })
      );
      tx.create(threadRef(forum, threadId).collection("posts").doc(), {
        ...authorFields(member),
        character: "",
        characters: [],
        text: "",
        timePosted: now,
        type: "boss_end",
        blocks: { boss: { slug: boss.slug, name: boss.name } },
      });
    }
  });

  return { ok: true };
});
