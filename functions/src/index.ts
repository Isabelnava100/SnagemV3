/**
 * Snagem forum server-side integrity layer.
 *
 * Everything a hostile client could forge happens here instead:
 * dice/random rolls, encounter rolls + allowances, inventory decrements,
 * catch resolution, post/thread publishing, poll votes and boss battles.
 *
 * Rolls are BOUND to the player's next post in the thread: each roll is
 * stored in forum/{forum}/threads/{threadId}/pending/{uid} and consumed by
 * publishForumPost. You cannot re-roll by abandoning a draft; a pending
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
import { setGlobalOptions } from "firebase-functions/v2";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import pokemonJSON from "./pokemon.json";
import battleStages from "./battleStages.json";

// Each 2nd-gen function is a Cloud Run service reserving CPU = maxInstances x cpu.
// This project's regional CPU quota is capped at 20,000 milli vCPU (20 vCPU) and
// is not currently raiseable, so all ~39 functions must fit inside it. cpu 0.25 x
// maxInstances 1 = 250m each (~9,750m total), well under the cap with room to
// spare. This guild's traffic is tiny; one instance at concurrency 80 is plenty.
setGlobalOptions({ maxInstances: 1, cpu: 0.25 });

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

// Battle stage of a species (baked map) and the posts needed to capture an
// encounter of that stage (admin/battle_config, with defaults).
const stageForDex = (idx: number): string =>
  (battleStages as Record<string, string>)[String(idx)] ?? "stage2";
const DEFAULT_ENCOUNTER_COSTS: Record<string, number> = {
  stage1: 4,
  stage2: 7,
  stage3: 10,
  legendary: 13,
};
function encounterRequiredFromConfig(cfg: FirebaseFirestore.DocumentData | undefined, stage: string): number {
  const configured = Number(cfg?.encounter?.[stage]);
  const fallback = DEFAULT_ENCOUNTER_COSTS[stage] ?? 7;
  const value = Number.isFinite(configured) && configured > 0 ? configured : fallback;
  return Math.max(1, Math.min(100, value));
}
const GEN_CAPS = [151, 251, 386, 493, 649, 721, 809, 898];
const GEN_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// Modern main-series full-odds shiny rate. Every Pokemon obtained through a
// random means (a caught encounter, and future eggs/mystery boxes) rolls this.
const SHINY_ODDS = 4096;
const rollShiny = (): boolean => randomInt(SHINY_ODDS) === 0;

/** Build an owned-pokemon doc value from a slug (shared by catch + grants). */
function buildOwnedPokemon(
  slug: string,
  now: Date,
  opts: { shiny?: boolean; characterId?: string; caughtIn?: Record<string, unknown> } = {}
): Record<string, unknown> {
  const info = catalogBySlug.get(slug);
  const idx = Number(info?.idx ?? 0);
  return {
    date_caught: { nt: now.getTime(), seconds: Math.floor(now.getTime() / 1000) },
    gender: randomInt(2) === 0 ? "M" : "F",
    generation: generationFor(String(idx || "")),
    image_slug: slug,
    name: info?.name ?? slug,
    pokedex: String(idx || ""),
    regiondex: "",
    species: info?.name ?? slug,
    type1: "Unknown",
    shiny: !!opts.shiny,
    ...(opts.characterId ? { characterId: opts.characterId } : {}),
    ...(opts.caughtIn ? { caughtIn: opts.caughtIn } : {}),
  };
}

// Thread-creation matrix (mirrors src/Pages/forum/config.ts). Any forum not
// listed here is open to any approved member (Side-Roleplay, The-Colosseum, ...).
type CreatePolicy = "admin" | "main-host" | "event-host" | "master" | "none";
const FORUM_CREATE_POLICY: Record<string, CreatePolicy> = {
  "Main-Forum": "main-host",
  Events: "event-host",
  "Master-Mission": "master",
  Quests: "none",
  "The-Colosseum": "main-host",
};

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
  signature: string;
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
    signature: String(data.signature ?? "").slice(0, 10_000),
  };
}

const isAdmin = (m: Member) => m.permissions === "Admin";
const hasCap = (m: Member, cap: string) => isAdmin(m) || m.capabilities.includes(cap);

/** Whether a member may create a thread in a forum (see FORUM_CREATE_POLICY). */
function canCreateInForum(forum: string, member: Member): boolean {
  switch (FORUM_CREATE_POLICY[forum]) {
    case "none":
      return false;
    case "admin":
      return isAdmin(member);
    case "main-host":
      return hasCap(member, "HostMainForum");
    case "event-host":
      return hasCap(member, "HostEvents");
    case "master":
      return isAdmin(member) || member.permissions === "Master";
    default:
      return true; // any approved member (loadMember already blocks Applicant/Disabled)
  }
}

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

/** Fire-and-forget in-app notifications (users/{uid}/notifications). */
async function notifyUsers(
  uids: string[],
  notification: { type: string; text: string; link: string }
): Promise<void> {
  const unique = [...new Set(uids)].filter(Boolean);
  if (!unique.length) return;
  const batch = db.batch();
  const now = new Date();
  unique.slice(0, 400).forEach((uid) => {
    batch.create(db.collection(`users/${uid}/notifications`).doc(), {
      ...notification,
      read: false,
      createdAt: now,
    });
  });
  await batch.commit().catch(() => undefined); // never block the main action
}

/** Resolve @mention usernames (data-id attributes in Tiptap HTML) to uids. */
async function mentionedUids(html: string, excludeUid: string): Promise<string[]> {
  const names = [...new Set([...html.matchAll(/data-id="([^"]{1,60})"/g)].map((m) => m[1]))];
  if (!names.length) return [];
  const uids: string[] = [];
  for (const chunk of [names.slice(0, 30)]) {
    const snap = await db.collection("users").where("username", "in", chunk).get();
    snap.forEach((docSnap) => {
      if (docSnap.id !== excludeUid) uids.push(docSnap.id);
    });
  }
  return uids;
}

/** Currency values are stored as STRINGS (legacy): parse, add, restringify. */
function addCurrencyString(current: unknown, amount: number): string {
  const parsed = parseInt(String(current ?? "0"), 10);
  return String((Number.isFinite(parsed) ? parsed : 0) + amount);
}

const CURRENCY_KEYS = ["pokecoin", "gengarcoin", "snagemblem"] as const;
type CurrencyKey = (typeof CURRENCY_KEYS)[number];

// The four pokemon stats awarded per qualifying post: config key (on the
// thread's xpConfig / admin defaults) -> pokemon doc field.
const XP_STATS = [
  { cfg: "experiencePerPost", field: "experience" },
  { cfg: "friendshipPerPost", field: "friendship" },
  { cfg: "purificationPerPost", field: "purification" },
  { cfg: "shadowPerPost", field: "shadow" },
] as const;

interface XpConfig {
  experiencePerPost: number;
  friendshipPerPost: number;
  purificationPerPost: number;
  shadowPerPost: number;
  minPostLength: number;
}

/** Clamp + backfill an XP config from raw admin/thread data (legacy `perPost` = experience). */
function normalizeXpConfig(raw: unknown): XpConfig {
  const data = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, max = 100_000) =>
    Math.min(max, Math.max(0, Math.trunc(Number(v)) || 0));
  return {
    experiencePerPost: num(data.experiencePerPost ?? data.perPost, 10_000),
    friendshipPerPost: num(data.friendshipPerPost, 10_000),
    purificationPerPost: num(data.purificationPerPost, 10_000),
    shadowPerPost: num(data.shadowPerPost, 10_000),
    minPostLength: num(data.minPostLength),
  };
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
// Rolls, bound to the caller's next post in the thread
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
  // Characters the roller is capturing this encounter for (their own). Empty =
  // personal: any of the roller's posts count toward the capture.
  const forCharacterIds = (Array.isArray(request.data?.forCharacterIds) ? request.data.forCharacterIds : [])
    .slice(0, 6)
    .map((c: unknown) => String(c).slice(0, 60));
  await loadMember(uid);

  const listsSnap = await db.doc("admin/pokemon_lists").get();
  const lists = (listsSnap.data() as Record<string, any>) ?? {};
  const battleCfg = (await db.doc("admin/battle_config").get()).data();

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

    const stage = stageForDex(Number(catalogBySlug.get(slug)?.idx ?? 0));
    const required = encounterRequiredFromConfig(battleCfg, stage);
    const result = {
      slug,
      name: catalogBySlug.get(slug)?.name ?? slug,
      mode,
      catchable: !nonCatchSlugs.has(slug) && !thread.bossBattle?.active,
      // Capture progress: it takes `required` qualifying posts before a ball
      // can catch it. `forCharacterIds` restricts which posts count (empty =
      // any of the roller's posts).
      stage,
      required,
      progress: 0,
      forCharacterIds,
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
  // Gaia-style signature: attached by default, snapshotted at publish time.
  const attachSignature = request.data?.attachSignature !== false;
  const member = await loadMember(uid);

  const tRef = threadRef(forum, threadId);
  const pRef = pendingRef(forum, threadId, uid);
  const bagRef = db.doc(`users/${uid}/bag/items`);
  const ownedRef = db.doc(`users/${uid}/bag/owned_pokemons`);
  const teamsRef = db.doc(`users/${uid}/bag/teams`);

  let threadForNotify: FirebaseFirestore.DocumentData | undefined;
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

    threadForNotify = thread;

    let bag: Record<string, any> = {};
    if (itemRequests.length) {
      const bagSnap = await tx.get(bagRef);
      bag = (bagSnap.data() as Record<string, any>) ?? {};
    }

    // XP: pokemon on the teams brought into this post earn the thread's
    // per-post stats (experience/friendship/purification/shadow), if the post
    // meets the minimum length (Q5).
    const xpConfig = normalizeXpConfig(thread.xpConfig);
    const strippedLength = html.replace(/<[^>]*>/g, "").trim().length;
    const teamIds = characters.map((c: any) => c.teamId).filter(Boolean) as string[];
    const anyStat = XP_STATS.some((s) => (xpConfig[s.cfg] ?? 0) > 0);
    // XP is applied instantly only when a staff-created thread chose "instant";
    // otherwise it accrues into pendingXp for the close review. Legacy threads
    // (no xpAward) keep the original behavior keyed off createdByAdmin.
    let deferXp: boolean;
    if (thread.xpAward === "instant") deferXp = !(thread.staffCreated === true);
    else if (thread.xpAward === "onClose") deferXp = true;
    else deferXp = thread.createdByAdmin === false;
    let xpPokemonIds: string[] = [];
    let ownedForXp: Record<string, any> = {};
    if (
      !editPostId &&
      teamIds.length &&
      anyStat &&
      strippedLength >= (xpConfig.minPostLength ?? 0)
    ) {
      const teamsSnap = await tx.get(teamsRef);
      const teams = (teamsSnap.data() as Record<string, { pokemon_ids?: string[] }>) ?? {};
      xpPokemonIds = [
        ...new Set(teamIds.flatMap((teamId) => teams[teamId]?.pokemon_ids ?? [])),
      ];
      // Deferred accrual needs pokemon display names for the close-time review.
      if (deferXp && xpPokemonIds.length) {
        ownedForXp = ((await tx.get(ownedRef)).data() as Record<string, any>) ?? {};
      }
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
    let encounterCaught = false;
    let encounterForCharacter = "";
    if (encounter) {
      // Capture progress: a qualifying post weakens the encounter; a ball only
      // catches once progress has reached the required number of posts.
      const required = Number(encounter.required) || 1;
      const forIds: string[] = Array.isArray(encounter.forCharacterIds)
        ? encounter.forCharacterIds
        : [];
      encounterForCharacter = forIds[0] ?? "";
      const postCharIds = characters.map((c: any) => c.id);
      const qualifies = forIds.length === 0 || postCharIds.some((id: string) => forIds.includes(id));
      let progress = Number(encounter.progress) || 0;
      if (!editPostId && qualifies && progress < required) progress += 1;
      encounter.progress = progress;
      const ball = itemsUsed.find((i) => i.isBall);
      encounter.caught = !!ball && !!encounter.catchable && progress >= required;
      encounterCaught = !!encounter.caught;
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
      // Any caught Pokemon rolls for shiny at the standard full-odds rate.
      tx.set(
        ownedRef,
        {
          [randomUUID()]: buildOwnedPokemon(encounter.slug, now, {
            shiny: rollShiny(),
            characterId: encounterForCharacter || undefined,
            caughtIn: {
              forum,
              threadId,
              postId: editPostId ?? newPostRef!.id,
              threadTitle: (thread.title as string) ?? "",
            },
          }),
        },
        { merge: true }
      );
    }

    if (xpPokemonIds.length) {
      if (deferXp) {
        // Accrue per-pokemon XP into the thread's pending ledger (keyed by the
        // posting user) for review + commit at close via finalizeThreadRewards.
        const pending: Record<string, Record<string, unknown>> = {};
        xpPokemonIds.forEach((pokeId) => {
          const poke = ownedForXp[pokeId] ?? {};
          const entry: Record<string, unknown> = {
            name: poke.species ?? poke.name ?? pokeId,
            slug: poke.image_slug ?? "",
          };
          XP_STATS.forEach((stat) => {
            const amount = xpConfig[stat.cfg] ?? 0;
            if (amount > 0) entry[stat.field] = FieldValue.increment(amount);
          });
          pending[pokeId] = entry;
        });
        if (Object.keys(pending).length) {
          tx.set(tRef, { pendingXp: { [uid]: pending } }, { merge: true });
        }
      } else {
        // Admin-created (or legacy) threads: apply immediately to the pokemon.
        const xpUpdates: Record<string, Record<string, ReturnType<typeof FieldValue.increment>>> = {};
        xpPokemonIds.forEach((pokeId) => {
          const inc: Record<string, ReturnType<typeof FieldValue.increment>> = {};
          XP_STATS.forEach((stat) => {
            const amount = xpConfig[stat.cfg] ?? 0;
            if (amount > 0) inc[stat.field] = FieldValue.increment(amount);
          });
          if (Object.keys(inc).length) xpUpdates[pokeId] = inc;
        });
        if (Object.keys(xpUpdates).length) tx.set(ownedRef, xpUpdates, { merge: true });
      }
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
        signature: attachSignature ? member.signature : "",
        timePosted: now,
        type: "user",
        blocks,
      });

      // Attacking the boss: opt-in per post, only when a boss is active for
      // this player. Attack posts total across everyone until the boss is down.
      const attackBoss = request.data?.attackBoss === true;
      const bossExtra: Record<string, unknown> = {};
      let bossDefeated = false;
      if (attackBoss && bossActiveForUser) {
        const boss = thread.bossBattle;
        const required = Number(boss.requiredPosts) || Infinity;
        const next = (Number(boss.attackPosts) || 0) + 1;
        bossExtra["bossBattle.attackPosts"] = FieldValue.increment(1);
        if (next >= required) {
          bossExtra["bossBattle.active"] = false;
          bossDefeated = true;
        }
      }
      tx.update(
        tRef,
        activityUpdate(member, now, { replyCount: FieldValue.increment(1), ...bossExtra })
      );
      if (bossDefeated) {
        tx.create(tRef.collection("posts").doc(), {
          ...authorFields(member),
          character: "",
          characters: [],
          text: "",
          timePosted: now,
          type: "boss_end",
          blocks: { boss: { slug: thread.bossBattle.slug, name: thread.bossBattle.name } },
        });
      }
      resultPostId = newPostRef!.id;
    }

    // Consume the per-post rolls. A catchable, uncaught encounter survives (with
    // its new progress) so it can be weakened over several posts and caught
    // later; non-catchable encounters are consumed as before.
    if (!editPostId && encounter && encounter.catchable && !encounterCaught) {
      tx.set(pRef, { encounter });
    } else if (pendingSnap.exists) {
      tx.delete(pRef);
    }
    return resultPostId;
  });

  // Post-commit notifications: bookmark watchers + @mentions (Q7).
  if (!editPostId && threadForNotify) {
    const link = `/Forum/${forum}/thread/${threadId}/last`;
    const title = (threadForNotify.title as string) ?? "the thread";
    const watchers = ((threadForNotify.watcherUids as string[]) ?? []).filter((w) => w !== uid);
    await notifyUsers(watchers, {
      type: "bookmark_post",
      text: `${member.username} posted in "${title}"`,
      link,
    });
    const mentioned = await mentionedUids(html, uid).catch(() => [] as string[]);
    await notifyUsers(
      mentioned.filter((m) => !watchers.includes(m)),
      { type: "mention", text: `${member.username} mentioned you in "${title}"`, link }
    );
  }

  return { postId };
});

export const publishForumThread = onCall(async (request) => {
  const uid = requireAuth(request);
  const forum = requireString(request.data?.forum, "forum", 60);
  const title = requireString(request.data?.title, "title", 200);
  const html = requireString(request.data?.html, "first post", 100_000);
  const member = await loadMember(uid);

  // Thread-creation permission matrix (mirrors src/Pages/forum/config.ts).
  if (!canCreateInForum(forum, member)) {
    throw new HttpsError("permission-denied", "You cannot create threads here.");
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

  // XP settings: site defaults from admin/xp_defaults; admins and directors
  // with the AdjustXP capability may override per thread (Q5). Awards cover
  // all four pokemon stats (experience/friendship/purification/shadow).
  const defaultsSnap = await db.doc("admin/xp_defaults").get();
  let xpConfig = normalizeXpConfig(defaultsSnap.data());
  const xpOverride = request.data?.xpConfig;
  if (xpOverride && (isAdmin(member) || hasCap(member, "AdjustXP"))) {
    xpConfig = normalizeXpConfig(xpOverride);
  }

  // Only staff (admins or hosting directors) create roleplays that can award XP
  // instantly; everyone else's threads always defer XP to the close review.
  const staffCreated =
    isAdmin(member) || hasCap(member, "HostMainForum") || hasCap(member, "HostEvents");
  const xpAward = staffCreated && request.data?.xpAward === "instant" ? "instant" : "onClose";

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
    // Admin-created threads apply XP immediately; non-admin threads accrue XP
    // into pendingXp for review + commit at close (see publishForumPost).
    createdByAdmin: isAdmin(member),
    // staffCreated + xpAward drive the instant-vs-on-close XP choice.
    staffCreated,
    xpAward,
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
    xpConfig,
  });
  batch.create(tRef.collection("posts").doc(), {
    ...authorFields(member),
    character: characters.map((c) => c.name).join(", "),
    characters,
    text: html,
    signature: request.data?.attachSignature !== false ? member.signature : "",
    timePosted: now,
    type: "user",
    blocks: {},
  });
  await batch.commit();

  return { threadId };
});

// ---------------------------------------------------------------------------
// Rewards (thread close) & direct grants
// ---------------------------------------------------------------------------

interface RewardEntry {
  items?: Array<{ itemId: string; name: string; filePath: string; qty: number }>;
  currencies?: Partial<Record<CurrencyKey, number>>;
  /** New Pokemon to grant to the recipient (optionally shiny). */
  pokemon?: Array<{ slug: string; name?: string; shiny?: boolean }>;
  /** Reviewed per-pokemon XP to commit to the recipient's owned pokemon. */
  pokemonXp?: Record<
    string,
    { experience?: number; friendship?: number; purification?: number; shadow?: number }
  >;
}

/**
 * Applies a saved reward session (built on the thread-close rewards page) to
 * every participant in one batch: items increment into bags, currencies are
 * parsed-from-string, added, and re-stringified. GiveItems capability
 * required; the session is marked finalized so it can't be applied twice.
 */
export const finalizeThreadRewards = onCall(async (request) => {
  const uid = requireAuth(request);
  const sessionId = requireString(request.data?.sessionId, "session", 200);
  const member = await loadMember(uid);
  if (!hasCap(member, "GiveItems") && !hasCap(member, "ReviewRewards")) {
    throw new HttpsError("permission-denied", "You cannot award rewards.");
  }

  const sessionRef = db.doc(`rewardSessions/${sessionId}`);
  const recipients: string[] = [];

  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) throw new HttpsError("not-found", "Reward session not found.");
    const session = sessionSnap.data()!;
    if (session.finalized) {
      throw new HttpsError("failed-precondition", "These rewards were already sent.");
    }
    const rewards = (session.rewards as Record<string, RewardEntry>) ?? {};
    const entries = Object.entries(rewards).slice(0, 100);

    // Reads first: currency docs for everyone getting currency.
    const currencyReads = await Promise.all(
      entries.map(async ([targetUid, entry]) => {
        const hasCurrency = Object.values(entry.currencies ?? {}).some((v) => (v ?? 0) > 0);
        if (!hasCurrency) return null;
        const ref = db.doc(`users/${targetUid}/bag/currency`);
        return { targetUid, ref, snap: await tx.get(ref) };
      })
    );

    const rewardNow = new Date();
    entries.forEach(([targetUid, entry]) => {
      let received = false;
      // Granted Pokemon (optionally shiny), one owned-pokemon doc each.
      (entry.pokemon ?? []).forEach((p) => {
        if (!p?.slug || !catalogBySlug.get(p.slug)) return;
        tx.set(
          db.doc(`users/${targetUid}/bag/owned_pokemons`),
          { [randomUUID()]: buildOwnedPokemon(p.slug, rewardNow, { shiny: !!p.shiny }) },
          { merge: true }
        );
        received = true;
      });
      (entry.items ?? []).forEach((item) => {
        if (!item.itemId || !(item.qty > 0)) return;
        tx.set(
          db.doc(`users/${targetUid}/bag/items`),
          {
            [item.itemId]: {
              name: item.name,
              filePath: item.filePath,
              category: (item as any).category ?? "other-item",
              quantity: FieldValue.increment(Math.trunc(item.qty)),
            },
          },
          { merge: true }
        );
        received = true;
      });
      const read = currencyReads.find((r) => r?.targetUid === targetUid);
      if (read) {
        const current = read.snap.data() ?? {};
        const update: Record<string, string> = {};
        CURRENCY_KEYS.forEach((key) => {
          const amount = Math.trunc(entry.currencies?.[key] ?? 0);
          if (amount > 0) {
            update[key] = addCurrencyString(current[key], amount);
            received = true;
          }
        });
        if (Object.keys(update).length) tx.set(read.ref, update, { merge: true });
      }
      // Reviewed team XP: commit the (possibly edited) per-pokemon stats.
      if (entry.pokemonXp) {
        const pokeUpdate: Record<string, Record<string, ReturnType<typeof FieldValue.increment>>> = {};
        Object.entries(entry.pokemonXp).forEach(([pokeId, xp]) => {
          const stats: Record<string, ReturnType<typeof FieldValue.increment>> = {};
          (["experience", "friendship", "purification", "shadow"] as const).forEach((k) => {
            const amount = Math.trunc((xp as any)?.[k] ?? 0);
            if (amount > 0) stats[k] = FieldValue.increment(amount);
          });
          if (Object.keys(stats).length) pokeUpdate[pokeId] = stats;
        });
        if (Object.keys(pokeUpdate).length) {
          tx.set(db.doc(`users/${targetUid}/bag/owned_pokemons`), pokeUpdate, { merge: true });
          received = true;
        }
      }
      if (received) recipients.push(targetUid);
    });

    tx.update(sessionRef, { finalized: true, finalizedBy: member.username, finalizedAt: new Date() });
  });

  await db.collection("auditLogs").add({
    action: "rewards.finalize",
    actorUid: uid,
    actorName: member.username,
    targetPath: `rewardSessions/${sessionId}`,
    details: { recipients: recipients.length },
    createdAt: new Date(),
  });
  await notifyUsers(recipients, {
    type: "rewards",
    text: "You received rewards from a closed thread!",
    link: "/Dashboard",
  });

  return { ok: true, recipients: recipients.length };
});

/** Direct currency grant (Q1): Admin / GiveItems directors add money to users. */
export const grantCurrency = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!hasCap(member, "GiveItems")) {
    throw new HttpsError("permission-denied", "You cannot grant currency.");
  }
  const currency = request.data?.currency as CurrencyKey;
  if (!CURRENCY_KEYS.includes(currency)) {
    throw new HttpsError("invalid-argument", "Unknown currency.");
  }
  const amount = Math.trunc(Number(request.data?.amount));
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    throw new HttpsError("invalid-argument", "Invalid amount.");
  }
  const userIds = (Array.isArray(request.data?.userIds) ? request.data.userIds : [])
    .slice(0, 100)
    .map((u: unknown) => String(u));
  if (!userIds.length) throw new HttpsError("invalid-argument", "Pick at least one user.");

  await db.runTransaction(async (tx) => {
    const refs = userIds.map((targetUid: string) => db.doc(`users/${targetUid}/bag/currency`));
    const snaps = await Promise.all(refs.map((ref: DocumentReference) => tx.get(ref)));
    snaps.forEach((snap: DocumentSnapshot, i: number) => {
      tx.set(
        refs[i],
        { [currency]: addCurrencyString(snap.data()?.[currency], amount) },
        { merge: true }
      );
    });
  });

  await db.collection("auditLogs").add({
    action: "currency.grant",
    actorUid: uid,
    actorName: member.username,
    details: { currency, amount, userIds },
    createdAt: new Date(),
  });
  await notifyUsers(userIds, {
    type: "currency",
    text: `You received ${amount} ${currency === "pokecoin" ? "Poke Coins" : currency === "gengarcoin" ? "Gengar Coins" : "Snag Emblems"}!`,
    link: "/Dashboard",
  });

  return { ok: true };
});

/** Grant a Pokemon (optionally shiny) to users. Admins / GiveItems directors. */
export const grantPokemon = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!hasCap(member, "GiveItems")) {
    throw new HttpsError("permission-denied", "You cannot grant Pokemon.");
  }
  const slug = requireString(request.data?.slug, "pokemon", 100);
  if (!catalogBySlug.get(slug)) throw new HttpsError("invalid-argument", "Unknown pokemon.");
  const shiny = request.data?.shiny === true;
  const userIds = (Array.isArray(request.data?.userIds) ? request.data.userIds : [])
    .slice(0, 100)
    .map((u: unknown) => String(u));
  if (!userIds.length) throw new HttpsError("invalid-argument", "Pick at least one user.");

  const now = new Date();
  const batch = db.batch();
  userIds.forEach((targetUid: string) => {
    batch.set(
      db.doc(`users/${targetUid}/bag/owned_pokemons`),
      { [randomUUID()]: buildOwnedPokemon(slug, now, { shiny }) },
      { merge: true }
    );
  });
  await batch.commit();

  const name = catalogBySlug.get(slug)?.name ?? slug;
  await db.collection("auditLogs").add({
    action: "pokemon.grant",
    actorUid: uid,
    actorName: member.username,
    details: { slug, name, shiny, userIds },
    createdAt: now,
  });
  await notifyUsers(userIds, {
    type: "pokemon",
    text: `You received a ${shiny ? "shiny " : ""}${name}!`,
    link: "/Dashboard/Pokemon",
  });

  return { ok: true };
});

// ---------------------------------------------------------------------------
// New member approvals (NewUsers -> users)
// ---------------------------------------------------------------------------

const APPROVABLE_ROLES = ["New", "Verified", "Master", "Director"];

/** Approve a NewUsers applicant: create their users doc and clear the queue. */
export const approveNewUser = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isAdmin(member)) throw new HttpsError("permission-denied", "Admins only.");
  const targetUid = requireString(request.data?.uid, "uid", 200);
  const rawRole = String(request.data?.role ?? "New");
  const role = APPROVABLE_ROLES.includes(rawRole) ? rawRole : "New";

  const newRef = db.doc(`NewUsers/${targetUid}`);
  const userRef = db.doc(`users/${targetUid}`);
  const [newSnap, userSnap] = await Promise.all([newRef.get(), userRef.get()]);
  if (!newSnap.exists) throw new HttpsError("not-found", "That applicant no longer exists.");
  const data = newSnap.data()!;

  // Create the promoted user doc (skip if one already exists to avoid clobber).
  if (!userSnap.exists) {
    await userRef.set({
      username: data.username ?? "",
      email: data.email ?? "",
      permissions: role,
      capabilities: [],
      badges: Array.isArray(data.badges) ? data.badges : [],
      isGaia: data.isGaia ?? "No",
      ...(data.discordUID ? { discordUID: data.discordUID } : {}),
      ...(data.avatar ? { avatar: data.avatar } : {}),
      joinedAt:
        data.joinedAt ?? { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    });
  } else {
    await userRef.set({ permissions: role }, { merge: true });
  }
  await newRef.delete();

  await db.collection("auditLogs").add({
    action: "user.approve",
    actorUid: uid,
    actorName: member.username,
    details: { username: data.username, role, targetUid },
    createdAt: new Date(),
  });
  await notifyUsers([targetUid], {
    type: "approval",
    text: "Your membership was approved. Welcome to Snagem Guild!",
    link: "/Dashboard",
  });

  return { ok: true };
});

/** Reject / remove a NewUsers applicant from the queue. */
export const rejectNewUser = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isAdmin(member)) throw new HttpsError("permission-denied", "Admins only.");
  const targetUid = requireString(request.data?.uid, "uid", 200);
  const note = String(request.data?.note ?? "").slice(0, 1000);

  const newRef = db.doc(`NewUsers/${targetUid}`);
  const snap = await newRef.get();
  if (!snap.exists) return { ok: true };
  await newRef.delete();

  await db.collection("auditLogs").add({
    action: "user.reject",
    actorUid: uid,
    actorName: member.username,
    details: { username: snap.data()?.username, note, targetUid },
    createdAt: new Date(),
  });

  return { ok: true };
});

// ---------------------------------------------------------------------------
// Discord: account linking (OAuth) + channel webhook notifications
// ---------------------------------------------------------------------------

async function discordConfig(): Promise<{ clientSecret: string; webhookUrl: string }> {
  const data = (await db.doc("adminSecrets/discord").get()).data() ?? {};
  return {
    clientSecret: String(data.clientSecret ?? ""),
    webhookUrl: String(data.webhookUrl ?? ""),
  };
}

/**
 * Complete the Discord OAuth code flow: exchange the code for the member's
 * Discord identity and store it on their user doc. The client id is public
 * (passed in), the client secret stays server-side in adminSecrets/discord.
 */
export const linkDiscord = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const code = requireString(request.data?.code, "code", 512);
  const redirectUri = requireString(request.data?.redirectUri, "redirectUri", 512);
  const clientId = requireString(request.data?.clientId, "clientId", 64);
  const { clientSecret } = await discordConfig();
  if (!clientSecret) {
    throw new HttpsError("failed-precondition", "Discord is not configured yet.");
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) throw new HttpsError("invalid-argument", "Discord authorization failed.");
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new HttpsError("invalid-argument", "Discord did not return a token.");

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!meRes.ok) throw new HttpsError("internal", "Could not read your Discord profile.");
  const me = (await meRes.json()) as { id?: string; username?: string; global_name?: string };
  if (!me.id) throw new HttpsError("internal", "Discord profile had no id.");

  const discordUsername = me.global_name || me.username || "";
  await db.doc(`users/${uid}`).set(
    { discordUID: me.id, discordUsername },
    { merge: true }
  );
  return { discordUID: me.id, discordUsername };
});

/** Remove a member's linked Discord account. */
export const unlinkDiscord = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  await db.doc(`users/${uid}`).set(
    { discordUID: FieldValue.delete(), discordUsername: FieldValue.delete() },
    { merge: true }
  );
  return { ok: true };
});

/** Announce new roleplays to a Discord channel via the configured webhook. */
export const onThreadCreatedDiscord = onDocumentCreated(
  "forum/{forum}/threads/{threadId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.private) return;
    const { webhookUrl } = await discordConfig();
    if (!webhookUrl) return;
    const { forum, threadId } = event.params;
    const forumName = String(forum).replace(/-/g, " ");
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**New roleplay:** ${data.title ?? "Untitled"} in ${forumName} by ${data.createdBy ?? "a member"}\nhttps://snagemguild.com/Forum/${forum}/thread/${threadId}`,
      }),
    }).catch(() => undefined);
  }
);

// ---------------------------------------------------------------------------
// Mystery boxes
// ---------------------------------------------------------------------------

/**
 * Opens one mystery box: validates ownership against the admin-configured
 * pool (admin/mystery_boxes), decrements the box, picks a weighted-random
 * reward server-side and grants it. Returns the reward for the reveal UI.
 */
export const openMysteryBox = onCall(async (request) => {
  const uid = requireAuth(request);
  const boxItemId = requireString(request.data?.itemId, "box", 100);
  const member = await loadMember(uid);

  const configSnap = await db.doc("admin/mystery_boxes").get();
  const config = (configSnap.data() ?? {})[boxItemId] as
    | {
        name: string;
        pool: Array<{
          kind: "item" | "currency";
          refId: string;
          name: string;
          filePath?: string;
          qty: number;
          weight: number;
        }>;
      }
    | undefined;
  if (!config?.pool?.length) {
    throw new HttpsError("failed-precondition", "This box cannot be opened yet.");
  }

  const bagRef = db.doc(`users/${uid}/bag/items`);
  const currencyRef = db.doc(`users/${uid}/bag/currency`);

  const reward = await db.runTransaction(async (tx) => {
    const [bagSnap, currencySnap] = await Promise.all([tx.get(bagRef), tx.get(currencyRef)]);
    const owned = (bagSnap.data() ?? {})[boxItemId];
    if (!owned || (owned.quantity ?? 0) < 1) {
      throw new HttpsError("failed-precondition", "You do not have this box.");
    }

    const pool = config.pool.filter((entry) => entry.weight > 0 && entry.qty > 0);
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = randomInt(Math.max(1, Math.floor(totalWeight)));
    let picked = pool[0];
    for (const entry of pool) {
      if (roll < entry.weight) {
        picked = entry;
        break;
      }
      roll -= entry.weight;
    }

    tx.set(bagRef, { [boxItemId]: { quantity: FieldValue.increment(-1) } }, { merge: true });
    if (picked.kind === "currency") {
      const key = picked.refId as CurrencyKey;
      if (!CURRENCY_KEYS.includes(key)) throw new HttpsError("internal", "Bad box config.");
      tx.set(
        currencyRef,
        { [key]: addCurrencyString(currencySnap.data()?.[key], picked.qty) },
        { merge: true }
      );
    } else {
      tx.set(
        bagRef,
        {
          [picked.refId]: {
            name: picked.name,
            filePath: picked.filePath ?? "",
            category: (picked as any).category ?? "other-item",
            quantity: FieldValue.increment(Math.trunc(picked.qty)),
          },
        },
        { merge: true }
      );
    }
    return picked;
  });

  return { reward: { kind: reward.kind, name: reward.name, qty: reward.qty, filePath: reward.filePath ?? "" } };
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const MAX_ENABLED_BADGES = 5;

/**
 * Remove a badge from every member who owns it. Runs with the Admin SDK so a
 * ManageBadges director (who cannot write another member's user doc from the
 * client) still gets a full cleanup: the badge is dropped from each owner's
 * bag AND from the enabled-display list on their user doc. Called when a badge
 * is deleted with "also remove from users".
 */
export const removeBadgeFromUsers = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!hasCap(member, "ManageBadges")) {
    throw new HttpsError("permission-denied", "You cannot manage badges.");
  }
  const badgeId = requireString(request.data?.badgeId, "badge", 128);

  const usersSnap = await db.collection("users").get();
  let removed = 0;
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };

  for (const userDoc of usersSnap.docs) {
    const bagRef = db.doc(`users/${userDoc.id}/bag/badges`);
    const bagSnap = await bagRef.get();
    const bag = (bagSnap.data() as Record<string, [string, string, boolean]>) ?? {};
    const tuple = bag[badgeId];
    if (!tuple) continue;

    batch.update(bagRef, { [badgeId]: FieldValue.delete() });
    // Keep the denormalized display list in sync (remove by label).
    batch.set(userDoc.ref, { badges: FieldValue.arrayRemove(tuple[0]) }, { merge: true });
    removed += 1;
    ops += 2;
    if (ops >= 400) await flush();
  }
  await flush();

  await db.collection("auditLogs").add({
    action: "badge.removeFromAll",
    actorUid: uid,
    actorName: member.username,
    details: { badgeId, removed },
    createdAt: new Date(),
  });

  return { ok: true, removed };
});

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
// Returning-member data imports (Gaia onboarding)
// ---------------------------------------------------------------------------

interface ImportPokemonInput {
  species: string;
  slug: string;
  pokedex: string;
  gender: string;
  shiny: boolean;
  experience: number;
  friendship: number;
  shadow: number;
  purification: number;
}
interface ImportEntriesInput {
  currency: { pokecoin?: number; gengarcoin?: number; snagemblem?: number };
  items: Array<{ refId: string; name: string; filePath?: string; category?: string; qty: number }>;
  pokemon: ImportPokemonInput[];
}

const clampInt = (v: unknown, min: number, max: number) => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

function generationFor(pokedex: string): string {
  const idx = Number(pokedex) || 0;
  const gi = GEN_CAPS.findIndex((cap) => idx <= cap);
  return `Generation ${GEN_NAMES[gi === -1 ? GEN_NAMES.length - 1 : gi]}`;
}

/**
 * Approve a returning member's import and apply it to their bag. Reviewer
 * (Admin / ApproveImports) passes the final entries (they may have edited
 * them). Currency and items are incremented; each Pokemon is added as a new
 * owned entry carrying its imported stats. The request is marked granted and
 * its working entries cleared so the member can start another batch.
 */
export const approveImport = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!hasCap(member, "ApproveImports")) {
    throw new HttpsError("permission-denied", "You cannot approve imports.");
  }
  const targetUid = requireString(request.data?.uid, "member", 128);
  const entries = request.data?.entries as ImportEntriesInput | undefined;
  if (!entries) throw new HttpsError("invalid-argument", "No entries to approve.");

  const items = (Array.isArray(entries.items) ? entries.items : []).slice(0, 500);
  const pokemon = (Array.isArray(entries.pokemon) ? entries.pokemon : []).slice(0, 500);
  const currency = entries.currency ?? {};
  const now = new Date();

  const importDocRef = db.doc(`importRequests/${targetUid}`);
  const currencyRef = db.doc(`users/${targetUid}/bag/currency`);
  const itemsRef = db.doc(`users/${targetUid}/bag/items`);
  const ownedRef = db.doc(`users/${targetUid}/bag/owned_pokemons`);

  await db.runTransaction(async (tx) => {
    const currencySnap = await tx.get(currencyRef);
    const prev = currencySnap.data() ?? {};

    // Currency
    const currencyUpdate: Record<string, string> = {};
    CURRENCY_KEYS.forEach((key) => {
      const amount = clampInt((currency as Record<string, unknown>)[key], 0, 100_000_000);
      if (amount > 0) currencyUpdate[key] = addCurrencyString(prev[key], amount);
    });
    if (Object.keys(currencyUpdate).length) tx.set(currencyRef, currencyUpdate, { merge: true });

    // Items
    const itemsUpdate: Record<string, unknown> = {};
    items.forEach((it) => {
      if (!it?.refId) return;
      itemsUpdate[it.refId] = {
        name: String(it.name ?? it.refId).slice(0, 120),
        filePath: String(it.filePath ?? ""),
        category: String(it.category ?? "other-item"),
        quantity: FieldValue.increment(clampInt(it.qty, 1, 100_000)),
      };
    });
    if (Object.keys(itemsUpdate).length) tx.set(itemsRef, itemsUpdate, { merge: true });

    // Pokemon (one owned entry each)
    const pokeUpdate: Record<string, unknown> = {};
    pokemon.forEach((p) => {
      if (!p?.slug && !p?.species) return;
      pokeUpdate[randomUUID()] = {
        date_caught: { nt: now.getTime(), seconds: Math.floor(now.getTime() / 1000) },
        gender: p.gender === "F" ? "F" : "M",
        generation: generationFor(p.pokedex),
        image_slug: String(p.slug ?? ""),
        name: String(p.species ?? "").slice(0, 60),
        pokedex: String(p.pokedex ?? ""),
        regiondex: "",
        species: String(p.species ?? "").slice(0, 60),
        type1: "Unknown",
        shiny: !!p.shiny,
        experience: clampInt(p.experience, 0, 100_000_000),
        friendship: clampInt(p.friendship, 0, 255),
        shadow: clampInt(p.shadow, 0, 100_000_000),
        purification: clampInt(p.purification, 0, 100_000_000),
        importedAt: { nt: now.getTime(), seconds: Math.floor(now.getTime() / 1000) },
      };
    });
    if (Object.keys(pokeUpdate).length) tx.set(ownedRef, pokeUpdate, { merge: true });

    // Mark granted; clear the working entries; append to history.
    tx.set(
      importDocRef,
      {
        status: "granted",
        currency: { pokecoin: 0, gengarcoin: 0, snagemblem: 0 },
        items: [],
        pokemon: [],
        reviewedAt: now.getTime(),
        reviewedByName: member.username,
        reviewerNote: "",
        history: FieldValue.arrayUnion({
          grantedAt: now.getTime(),
          byName: member.username,
          entries: { currency, items, pokemon },
        }),
      },
      { merge: true }
    );
  });

  await db.collection("auditLogs").add({
    action: "import.approve",
    actorUid: uid,
    actorName: member.username,
    details: { targetUid, items: items.length, pokemon: pokemon.length },
    createdAt: now,
  });
  await notifyUsers([targetUid], {
    type: "import",
    text: "Your import was approved and added to your account!",
    link: "/Onboarding",
  });

  return { ok: true };
});

/** Send an import back to the member with a note. */
export const rejectImport = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!hasCap(member, "ApproveImports")) {
    throw new HttpsError("permission-denied", "You cannot review imports.");
  }
  const targetUid = requireString(request.data?.uid, "member", 128);
  const note = String(request.data?.note ?? "").slice(0, 1000);
  const now = new Date();

  await db.doc(`importRequests/${targetUid}`).set(
    {
      status: "rejected",
      reviewerNote: note,
      reviewedAt: now.getTime(),
      reviewedByName: member.username,
    },
    { merge: true }
  );
  await notifyUsers([targetUid], {
    type: "import",
    text: "Your import needs a change before it can be approved. See the note in onboarding.",
    link: "/Onboarding",
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

  // Posts needed to defeat the boss, by its battle stage (client-derived from
  // the public dex; the count itself comes from admin/battle_config).
  const rawStage = String(request.data?.stage ?? "stage2");
  const bossStage = ["stage1", "stage2", "stage3", "legendary"].includes(rawStage)
    ? rawStage
    : "stage2";
  const DEFAULT_BOSS_COSTS: Record<string, number> = {
    stage1: 5,
    stage2: 10,
    stage3: 15,
    legendary: 20,
  };
  let bossRequiredPosts = DEFAULT_BOSS_COSTS[bossStage];
  if (action === "start") {
    const cfg = (await db.doc("admin/battle_config").get()).data();
    const configured = Number(cfg?.boss?.[bossStage]);
    if (Number.isFinite(configured) && configured > 0) {
      bossRequiredPosts = Math.min(200, configured);
    }
  }

  let participantsToNotify: string[] = [];
  let bossName = "";
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
        stage: bossStage,
        requiredPosts: bossRequiredPosts,
        attackPosts: 0,
      };
      bossName = info.name;
      participantsToNotify = Object.keys(thread.participants ?? {}).filter((p) => p !== uid);
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

  if (participantsToNotify.length) {
    await notifyUsers(participantsToNotify, {
      type: "boss_battle",
      text: `A boss battle against ${bossName} has started!`,
      link: `/Forum/${forum}/thread/${threadId}/last`,
    });
  }

  return { ok: true };
});

// ---------------------------------------------------------------------------
// Firestore triggers: staff pings + member permission notifications
// ---------------------------------------------------------------------------

/** Admins plus every member holding any of the given capabilities. */
async function staffUidsWithCaps(caps: string[]): Promise<string[]> {
  const uids = new Set<string>();
  const admins = await db.collection("users").where("permissions", "==", "Admin").get();
  admins.forEach((d) => uids.add(d.id));
  for (const cap of caps) {
    const snap = await db.collection("users").where("capabilities", "array-contains", cap).get();
    snap.forEach((d) => uids.add(d.id));
  }
  return [...uids];
}

/**
 * Tell a member when their role or capabilities change. Fires on any user-doc
 * update, so it also catches changes made straight from the Firestore console.
 */
export const onMemberUpdated = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data?.before.data() ?? {};
  const after = event.data?.after.data() ?? {};
  const beforeCaps: string[] = before.capabilities ?? [];
  const afterCaps: string[] = after.capabilities ?? [];
  const added = afterCaps.filter((c: string) => !beforeCaps.includes(c));
  const roleChanged = before.permissions !== after.permissions && !!after.permissions;
  if (!added.length && !roleChanged) return;

  const parts: string[] = [];
  if (roleChanged) parts.push(`your role is now ${after.permissions}`);
  if (added.length) parts.push(`new access: ${added.join(", ")}`);
  await notifyUsers([event.params.uid], {
    type: "permission",
    text: `Your account permissions were updated (${parts.join("; ")}).`,
    link: "/Dashboard",
  });
});

/** Ping the ApproveImports group when a member submits an import for review. */
export const onImportSubmitted = onDocumentWritten("importRequests/{uid}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after || after.status !== "pending" || before?.status === "pending") return;
  const staff = await staffUidsWithCaps(["ApproveImports"]);
  await notifyUsers(staff, {
    type: "approval",
    text: "A returning member submitted an import for review.",
    link: "/Dashboard/Admin-Access/Imports",
  });
});

/**
 * One-off admin maintenance: normalize legacy forum threads so the post/roll
 * flow (which expects `closed`, `restricted`, `allowedPosters`, `title`,
 * `createdBy` and, for the host menu, `hostUid`) works on old data. Backfills
 * `hostUid` from the creator's username. Only when `deleteBroken` is passed
 * does it remove threads that have neither a title nor a creator (unusable
 * shells). Everything else is a non-destructive merge. Admin only.
 */
export const repairLegacyThreads = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isAdmin(member)) throw new HttpsError("permission-denied", "Admins only.");
  const deleteBroken = request.data?.deleteBroken === true;

  // username -> uid, so legacy threads (no hostUid) can be linked to a creator.
  const usersSnap = await db.collection("users").get();
  const uidByUsername = new Map<string, string>();
  usersSnap.forEach((d) => {
    const uname = d.data().username;
    if (typeof uname === "string" && uname) uidByUsername.set(uname, d.id);
  });

  let scanned = 0;
  let normalized = 0;
  let deleted = 0;
  const forumRefs = await db.collection("forum").listDocuments();
  for (const forumRef of forumRefs) {
    const threadsSnap = await forumRef.collection("threads").get();
    for (const threadDoc of threadsSnap.docs) {
      scanned++;
      const data = threadDoc.data();
      const isBroken = !data.title && !data.createdBy;
      if (isBroken && deleteBroken) {
        await threadDoc.ref.delete();
        deleted++;
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (typeof data.closed !== "boolean") patch.closed = !!data.closed;
      if (typeof data.restricted !== "boolean") patch.restricted = !!data.restricted;
      if (!Array.isArray(data.allowedPosters)) patch.allowedPosters = [];
      if (typeof data.title !== "string") patch.title = String(data.title ?? "Untitled thread");
      if (typeof data.createdBy !== "string") patch.createdBy = String(data.createdBy ?? "");
      if (!data.hostUid && typeof data.createdBy === "string") {
        const resolved = uidByUsername.get(data.createdBy);
        if (resolved) patch.hostUid = resolved;
      }
      if (Object.keys(patch).length) {
        await threadDoc.ref.set(patch, { merge: true });
        normalized++;
      }
    }
  }
  return { scanned, normalized, deleted };
});

/**
 * One-off admin maintenance: migrate the legacy `users/{uid}.myBookmarks`
 * array (strings shaped `where[<path>]name[<title>]`) into the current
 * `users/{uid}/bookmarks/{forum}` threadId-keyed map so old bookmarks show up
 * again. Non-destructive (merge writes, legacy field left intact). Pass
 * `dryRun: true` (default) to only count/sample without writing. Admin only.
 */
export const migrateLegacyBookmarks = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isAdmin(member)) throw new HttpsError("permission-denied", "Admins only.");
  const dryRun = request.data?.dryRun !== false; // default to preview

  const KNOWN_FORUMS = [
    "Main-Forum",
    "Side-Roleplay",
    "Master-Mission",
    "Quests",
    "Events",
    "Private",
    "The-Colosseum",
  ];

  let usersWithLegacy = 0;
  let migrated = 0;
  let skipped = 0;
  const samples: string[] = [];

  const usersSnap = await db.collection("users").get();
  for (const userDoc of usersSnap.docs) {
    const legacy = userDoc.data().myBookmarks;
    if (!Array.isArray(legacy) || !legacy.length) continue;
    usersWithLegacy++;
    const discordUID = userDoc.data().discordUID ?? "";
    const byForum: Record<string, Record<string, unknown>> = {};

    for (const raw of legacy) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      if (samples.length < 12) samples.push(raw);
      const where = raw.match(/where\[(.*?)\]/)?.[1] ?? "";
      const name = raw.match(/name\[(.*?)\]/)?.[1] ?? "";
      const parts = where.split("/").filter(Boolean);
      const forum = parts.find((p) => KNOWN_FORUMS.includes(p));
      const afterThread = parts[parts.indexOf("thread") + 1];
      const threadId =
        (parts.indexOf("thread") >= 0 ? afterThread : undefined) ||
        [...parts].reverse().find((p) => /^\d+$/.test(p)) ||
        "";
      if (!forum || !threadId) {
        skipped++;
        continue;
      }
      byForum[forum] = byForum[forum] ?? {};
      byForum[forum][threadId] = {
        title: name || "Bookmarked thread",
        color: "#762B77",
        date: { nt: 0, seconds: 0 }, // legacy bookmarks have no stored date
        send2discord: discordUID,
        threadID: threadId,
        threadLocation: forum,
      };
    }

    for (const [forum, entries] of Object.entries(byForum)) {
      const count = Object.keys(entries).length;
      if (!count) continue;
      if (!dryRun) {
        await db.doc(`users/${userDoc.id}/bookmarks/${forum}`).set(entries, { merge: true });
      }
      migrated += count;
    }
  }

  return { usersWithLegacy, migrated, skipped, dryRun, samples };
});

/** Ping the reward-review group when a thread is closed (rewards may be due). */
export const onThreadClosed = onDocumentUpdated(
  "forum/{forum}/threads/{threadId}",
  async (event) => {
    const before = event.data?.before.data() ?? {};
    const after = event.data?.after.data() ?? {};
    if (before.closed || !after.closed) return; // only the false -> true edge
    const staff = await staffUidsWithCaps(["GiveItems", "ReviewRewards"]);
    const { forum, threadId } = event.params;
    await notifyUsers(staff, {
      type: "approval",
      text: `A thread closed and may need reward review: ${after.title ?? threadId}`,
      link: `/Forum/${forum}/thread/${threadId}/rewards`,
    });
  }
);

// ===========================================================================
// Snag Mall, Missions, and Research economy callables
// All spend/write actions are server-side; the client never mutates currency
// or inventory directly. See docs/SHOP_DATA.md, MISSIONS_DATA.md, RESEARCH_DATA.md.
// ===========================================================================

const isGrader = (m: Member) => isAdmin(m) || m.capabilities.includes("ReviewRewards");

function requireInt(value: unknown, field: string, min: number, max: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HttpsError("invalid-argument", `Invalid ${field}.`);
  }
  return n;
}

interface ShopItem {
  itemId: string;
  price: number;
  name?: string;
  filePath?: string;
  category?: string;
  stock?: number;
}

/** Add a purchased/crafted item into a bag/items doc (within a transaction). */
function bagIncrement(
  tx: FirebaseFirestore.Transaction,
  bagRef: FirebaseFirestore.DocumentReference,
  itemId: string,
  meta: { name?: string; filePath?: string; category?: string },
  qty: number
) {
  tx.set(
    bagRef,
    {
      [itemId]: {
        name: meta.name ?? itemId,
        filePath: meta.filePath ?? "",
        category: meta.category ?? "other-item",
        quantity: FieldValue.increment(qty),
      },
    },
    { merge: true }
  );
}

// --- Snag Mall: buy an item -------------------------------------------------
export const buyShopItem = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const shopId = requireString(request.data?.shopId, "shop", 80);
  const itemId = requireString(request.data?.itemId, "item", 80);
  const qty = requireInt(request.data?.qty ?? 1, "qty", 1, 99);

  const shopSnap = await db.doc(`shops/${shopId}`).get();
  const shop = shopSnap.data();
  if (!shop) throw new HttpsError("not-found", "Shop not found.");
  const currency = shop.currency as CurrencyKey;
  if (!CURRENCY_KEYS.includes(currency)) throw new HttpsError("internal", "Bad shop currency.");

  const pools: ShopItem[] = [];
  (shop.sections ?? []).forEach((s: { items?: ShopItem[] }) =>
    (s.items ?? []).forEach((it) => pools.push(it))
  );
  (shop.rare_section?.pool ?? []).forEach((it: ShopItem) => pools.push(it));
  const item = pools.find((it) => it.itemId === itemId);
  if (!item) throw new HttpsError("not-found", "That item is not sold here.");
  const cost = Math.max(0, Math.trunc(item.price)) * qty;

  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const bagRef = db.doc(`users/${uid}/bag/items`);
  await db.runTransaction(async (tx) => {
    const curSnap = await tx.get(currencyRef);
    const have = parseInt(String(curSnap.data()?.[currency] ?? "0"), 10) || 0;
    if (have < cost) throw new HttpsError("failed-precondition", "You do not have enough currency.");
    tx.set(currencyRef, { [currency]: String(have - cost) }, { merge: true });
    bagIncrement(tx, bagRef, itemId, item, qty);
  });

  return { ok: true, spent: cost, currency };
});

// --- Snag Mall: Trash Shack recycling --------------------------------------
// Item categories the Trash Shack will not buy back at all.
const RECYCLE_EXCLUDED_CATEGORIES = new Set(["medicine"]);
// Consumables recycle for half a unit each (keep in sync with the Mall UI copy).
const RECYCLE_HALF_CATEGORIES = new Set([
  "berry",
  "battle-item",
  "flute",
  "mulch",
  "incense",
  "exp-candy",
  "av-candy",
  "poke-candy",
  "curry-ingredient",
  "mint",
  "petal",
  "roto",
]);
// Payout units for one item of a category: 0 = not recyclable, 0.5 = consumable.
function recycleUnits(category: string | undefined): number {
  const c = category ?? "other-item";
  if (RECYCLE_EXCLUDED_CATEGORIES.has(c)) return 0;
  return RECYCLE_HALF_CATEGORIES.has(c) ? 0.5 : 1;
}

export const recycleItems = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const itemIds: string[] = (Array.isArray(request.data?.itemIds) ? request.data.itemIds : [])
    .slice(0, 200)
    .map((x: unknown) => String(x));
  if (!itemIds.length) throw new HttpsError("invalid-argument", "Select at least one item.");

  const bagRef = db.doc(`users/${uid}/bag/items`);
  const currencyRef = db.doc(`users/${uid}/bag/currency`);

  const result = await db.runTransaction(async (tx) => {
    const [bagSnap, curSnap] = await Promise.all([tx.get(bagRef), tx.get(currencyRef)]);
    const bag = (bagSnap.data() ?? {}) as Record<
      string,
      { quantity?: number; category?: string }
    >;

    // Tally how many of each id are being recycled (capped by what is owned).
    const counts = new Map<string, number>();
    itemIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));

    let removed = 0; // real items consumed
    let units = 0; // payout units (consumables count as half)
    let excluded = 0; // items the shack refuses (e.g. medicine)
    counts.forEach((want, id) => {
      const entry = bag[id];
      const take = Math.min(want, entry?.quantity ?? 0);
      if (take <= 0) return;
      const per = recycleUnits(entry?.category);
      if (per === 0) {
        excluded += take; // do not consume or pay for excluded items
        return;
      }
      tx.set(bagRef, { [id]: { quantity: FieldValue.increment(-take) } }, { merge: true });
      removed += take;
      units += take * per;
    });

    if (removed === 0) {
      throw new HttpsError(
        "failed-precondition",
        excluded > 0 ? "Those items cannot be recycled here." : "You do not own those items."
      );
    }

    // Bulk-tier payout: floor(units * 1.2) keeps the 1->1, 5->6, 10->12 table
    // for ordinary items; consumables contribute half a unit each.
    const payout = Math.floor(units * 1.2);
    tx.set(currencyRef, { pokecoin: addCurrencyString(curSnap.data()?.pokecoin, payout) }, { merge: true });
    return { payout, removed, excluded };
  });

  return { ok: true, coins: result.payout, recycled: result.removed, excluded: result.excluded };
});

// --- Snag Mall: K&L Nature Tours (RNG roll) --------------------------------
interface LootEntry { min: number; max: number; itemId: string; name?: string; filePath?: string; category?: string }
export const rollTour = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const area = requireString(request.data?.area, "area", 40);

  const cfgSnap = await db.doc("admin/kl_loot_tables").get();
  const table = (cfgSnap.data() ?? {})[area] as LootEntry[] | undefined;
  if (!table?.length) throw new HttpsError("failed-precondition", "That tour is not available.");

  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const bagRef = db.doc(`users/${uid}/bag/items`);
  const stateRef = db.doc(`users/${uid}/bag/tour_state`);
  const COST = 2;

  const result = await db.runTransaction(async (tx) => {
    const [curSnap, stateSnap] = await Promise.all([tx.get(currencyRef), tx.get(stateRef)]);
    const rolls = Number(stateSnap.data()?.rolls ?? 0);
    const free = (rolls + 1) % 4 === 0; // every 4th roll is free
    const have = parseInt(String(curSnap.data()?.pokecoin ?? "0"), 10) || 0;
    if (!free && have < COST) throw new HttpsError("failed-precondition", "You need 2 Snag Coins to roll.");
    if (!free) tx.set(currencyRef, { pokecoin: String(have - COST) }, { merge: true });

    const roll = randomInt(1, 121); // 1..120
    const entry = table.find((e) => roll >= e.min && roll <= e.max) ?? table[table.length - 1];
    bagIncrement(tx, bagRef, entry.itemId, entry, 1);

    const bonus = roll === 7; // lucky 7 also grants a Rare Candy
    if (bonus) bagIncrement(tx, bagRef, "rare-candy", { name: "Rare Candy", category: "valuable" }, 1);

    tx.set(stateRef, { rolls: FieldValue.increment(1) }, { merge: true });
    return { item: { name: entry.name ?? entry.itemId, filePath: entry.filePath ?? "" }, bonusRareCandy: bonus, free };
  });

  return { ok: true, ...result };
});

// --- Snag Mall: Ambrosial Alchemy crafting ---------------------------------
export const craftItem = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const recipeId = requireString(request.data?.recipeId, "recipe", 80);
  const batch = requireInt(request.data?.batch ?? 1, "batch", 1, 20);

  const recipeSnap = await db.doc(`recipes/${recipeId}`).get();
  const recipe = recipeSnap.data();
  if (!recipe) throw new HttpsError("not-found", "Recipe not found.");
  if (batch > (recipe.max_batch ?? 1)) throw new HttpsError("invalid-argument", "Batch too large.");

  const ingredients: Array<{ itemId: string; qty: number }> = recipe.ingredients ?? [];
  const cost = recipe.cost ?? {};
  const rate = Math.min(100, Math.max(0, Number(recipe.success_rate ?? 100)));

  const bagRef = db.doc(`users/${uid}/bag/items`);
  const currencyRef = db.doc(`users/${uid}/bag/currency`);

  const outcome = await db.runTransaction(async (tx) => {
    const [bagSnap, curSnap] = await Promise.all([tx.get(bagRef), tx.get(currencyRef)]);
    const bag = (bagSnap.data() ?? {}) as Record<string, { quantity?: number }>;
    const cur = curSnap.data() ?? {};

    for (const ing of ingredients) {
      if ((bag[ing.itemId]?.quantity ?? 0) < ing.qty * batch) {
        throw new HttpsError("failed-precondition", "You are missing ingredients.");
      }
    }
    for (const key of CURRENCY_KEYS) {
      const need = Number((cost as Record<string, number>)[key] ?? 0) * batch;
      if (need > 0 && (parseInt(String(cur[key] ?? "0"), 10) || 0) < need) {
        throw new HttpsError("failed-precondition", "You cannot afford the crafting cost.");
      }
    }

    // Consume ingredients + currency up front (spent on failure too).
    ingredients.forEach((ing) =>
      tx.set(bagRef, { [ing.itemId]: { quantity: FieldValue.increment(-ing.qty * batch) } }, { merge: true })
    );
    CURRENCY_KEYS.forEach((key) => {
      const spend = Number((cost as Record<string, number>)[key] ?? 0) * batch;
      if (spend > 0) tx.set(currencyRef, { [key]: addCurrencyString(cur[key], -spend) }, { merge: true });
    });

    let successes = 0;
    for (let i = 0; i < batch; i++) if (randomInt(1, 101) <= rate) successes++;
    const failures = batch - successes;

    if (successes > 0) {
      bagIncrement(
        tx,
        bagRef,
        recipe.output_item_id,
        { name: recipe.output_name, filePath: recipe.output_filePath, category: recipe.output_category },
        successes * (recipe.output_qty ?? 1)
      );
    }
    if (failures > 0) {
      bagIncrement(tx, bagRef, "mystery-pebble", { name: "Mystery Pebble", category: "valuable" }, failures);
    }
    return { successes, failures };
  });

  return { ok: true, ...outcome };
});

// --- Research: Fossil Revitalization ---------------------------------------
export const reviveFossil = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const fossilItemId = requireString(request.data?.fossilItemId, "fossil", 80);

  const cfgSnap = await db.doc("admin/research_config").get();
  const cfg = cfgSnap.data() ?? {};
  const slug = (cfg.fossilMap ?? {})[fossilItemId] as string | undefined;
  if (!slug || !catalogBySlug.get(slug)) throw new HttpsError("failed-precondition", "That is not a revivable fossil.");
  const fossilCost = Math.max(0, Math.trunc(Number(cfg.fossilCost ?? 5)));

  const bagRef = db.doc(`users/${uid}/bag/items`);
  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const pokeRef = db.doc(`users/${uid}/bag/owned_pokemons`);
  const now = new Date();

  await db.runTransaction(async (tx) => {
    const [bagSnap, curSnap] = await Promise.all([tx.get(bagRef), tx.get(currencyRef)]);
    const bag = (bagSnap.data() ?? {}) as Record<string, { quantity?: number }>;
    if ((bag[fossilItemId]?.quantity ?? 0) < 1) throw new HttpsError("failed-precondition", "You do not have that fossil.");
    const have = parseInt(String(curSnap.data()?.pokecoin ?? "0"), 10) || 0;
    if (have < fossilCost) throw new HttpsError("failed-precondition", "Not enough Snag Coins.");

    tx.set(bagRef, { [fossilItemId]: { quantity: FieldValue.increment(-1) } }, { merge: true });
    tx.set(currencyRef, { pokecoin: String(have - fossilCost) }, { merge: true });
    tx.set(pokeRef, { [randomUUID()]: buildOwnedPokemon(slug, now, {}) }, { merge: true });
  });

  const name = catalogBySlug.get(slug)?.name ?? slug;
  return { ok: true, pokemon: { name, slug } };
});

// --- Missions: submit for grading ------------------------------------------
export const submitMission = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  const missionId = requireString(request.data?.missionId, "mission", 80);
  const threadLink = requireString(request.data?.threadLink, "threadLink", 500);

  const ref = await db.collection("missionSubmissions").add({
    missionId,
    submitterUid: uid,
    submitterName: member.username,
    threadLink,
    status: "pending",
    submittedAt: new Date(),
  });
  const staff = await staffUidsWithCaps(["ReviewRewards", "GiveItems"]);
  await notifyUsers(staff, { type: "approval", text: `${member.username} submitted a mission for grading.`, link: "/Dashboard/Admin-Access" });
  return { ok: true, id: ref.id };
});

// --- Missions: grade (grader-gated) ----------------------------------------
export const gradeMission = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isGrader(member)) throw new HttpsError("permission-denied", "You cannot grade missions.");
  const submissionId = requireString(request.data?.submissionId, "submission", 80);
  const approve = request.data?.approve === true;
  const awards = (request.data?.awards ?? {}) as { coins?: number; emblemPiece?: boolean; note?: string };

  const subRef = db.doc(`missionSubmissions/${submissionId}`);
  const subSnap = await subRef.get();
  const sub = subSnap.data();
  if (!sub) throw new HttpsError("not-found", "Submission not found.");
  if (sub.status !== "pending") throw new HttpsError("failed-precondition", "Already graded.");

  if (!approve) {
    await subRef.set({ status: "rejected", gradedBy: member.username, gradedAt: new Date() }, { merge: true });
    return { ok: true };
  }

  const targetUid = String(sub.submitterUid);
  const coins = Math.max(0, Math.trunc(Number(awards.coins ?? 0)));
  const currencyRef = db.doc(`users/${targetUid}/bag/currency`);
  await db.runTransaction(async (tx) => {
    const curSnap = await tx.get(currencyRef);
    const cur = curSnap.data() ?? {};
    const update: Record<string, string> = {};
    if (coins > 0) update.pokecoin = addCurrencyString(cur.pokecoin, coins);
    if (awards.emblemPiece) {
      const pieces = (parseInt(String(cur.snagEmblemPieces ?? "0"), 10) || 0) + 1;
      update.snagEmblemPieces = String(pieces);
      if (pieces % 3 === 0) update.snagemblem = addCurrencyString(cur.snagemblem, 1);
    }
    if (Object.keys(update).length) tx.set(currencyRef, update, { merge: true });
    tx.set(subRef, { status: "graded", gradedBy: member.username, gradedAt: new Date(), awarded: { coins, emblemPiece: !!awards.emblemPiece } }, { merge: true });
  });
  await notifyUsers([targetUid], { type: "reward", text: `Your mission was graded: +${coins} Snag Coins${awards.emblemPiece ? " and a Snag Emblem Piece" : ""}.`, link: "/Dashboard" });
  return { ok: true };
});

// --- Research: Master Mission request + grant ------------------------------
export const requestMasterMission = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  const characterId = requireString(request.data?.characterId, "character", 80);
  const type = requireString(request.data?.type, "type", 40);
  const number = requireInt(request.data?.number ?? 1, "number", 1, 10);

  const ref = await db.collection("masterMissionRequests").add({
    uid,
    username: member.username,
    characterId,
    type,
    number,
    status: "requested",
    createdAt: new Date(),
  });
  const staff = await staffUidsWithCaps(["ReviewRewards"]);
  await notifyUsers(staff, { type: "approval", text: `${member.username} requested a ${type} Master Mission.`, link: "/Dashboard/Admin-Access" });
  return { ok: true, id: ref.id };
});

export const grantMasterMission = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isGrader(member)) throw new HttpsError("permission-denied", "You cannot grant missions.");
  const requestId = requireString(request.data?.requestId, "request", 80);
  const ability = requireString(request.data?.ability, "ability", 120);

  const reqRef = db.doc(`masterMissionRequests/${requestId}`);
  const reqSnap = await reqRef.get();
  const req = reqSnap.data();
  if (!req) throw new HttpsError("not-found", "Request not found.");
  if (req.status === "complete") throw new HttpsError("failed-precondition", "Already granted.");

  const researchRef = db.doc(`users/${req.uid}/bag/research`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(researchRef);
    const data = (snap.data() ?? {}) as Record<string, { types?: Array<{ type: string; missionsCompleted: number; abilities: string[] }> }>;
    const entry = data[req.characterId] ?? { types: [] };
    const types = entry.types ?? [];
    let t = types.find((x) => x.type === req.type);
    if (!t) { t = { type: req.type, missionsCompleted: 0, abilities: [] }; types.push(t); }
    t.missionsCompleted = Math.min(10, (t.missionsCompleted ?? 0) + 1);
    t.abilities = [...(t.abilities ?? []), ability];
    tx.set(researchRef, { [req.characterId]: { ...entry, characterId: req.characterId, types } }, { merge: true });
    tx.set(reqRef, { status: "complete", grantedBy: member.username, grantedAt: new Date(), ability }, { merge: true });
  });
  await notifyUsers([String(req.uid)], { type: "reward", text: `Master Mission complete: learned ${ability}.`, link: "/Research" });
  return { ok: true };
});

// --- Snag Mall: E.V.O. move/ability studio ---------------------------------
export const evoService = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const action = requireString(request.data?.action, "action", 40);
  const characterId = requireString(request.data?.characterId, "character", 80);

  const PRICES: Record<string, { currency: CurrencyKey; amount: number }> = {
    unlock_restraints: { currency: "snagemblem", amount: 1 },
    unlock_potential: { currency: "snagemblem", amount: 2 },
    new_adaptations: { currency: "pokecoin", amount: 25 },
  };
  const price = PRICES[action];
  if (!price) throw new HttpsError("invalid-argument", "Unknown service.");

  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const evoRef = db.doc(`users/${uid}/bag/evo`);
  await db.runTransaction(async (tx) => {
    const curSnap = await tx.get(currencyRef);
    const have = parseInt(String(curSnap.data()?.[price.currency] ?? "0"), 10) || 0;
    if (have < price.amount) throw new HttpsError("failed-precondition", "You cannot afford that service.");
    tx.set(currencyRef, { [price.currency]: String(have - price.amount) }, { merge: true });
    const field = action === "unlock_restraints" ? "slots" : action === "unlock_potential" ? "moves" : "adaptations";
    tx.set(evoRef, { [characterId]: { [field]: FieldValue.increment(1) } }, { merge: true });
  });
  return { ok: true };
});

// ===========================================================================
// Colosseum and Challenges
// ===========================================================================

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

// --- Colosseum: Super Training Room log ------------------------------------
export const logTrainingPost = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const pokemonId = requireString(request.data?.pokemonId, "pokemon", 80);
  const partner = request.data?.partner === true;

  const sessRef = db.doc(`users/${uid}/bag/training_session`);
  const pokeRef = db.doc(`users/${uid}/bag/owned_pokemons`);
  const now = new Date();
  const today = dayStr(now);

  const result = await db.runTransaction(async (tx) => {
    const [sessSnap, pokeSnap] = await Promise.all([tx.get(sessRef), tx.get(pokeRef)]);
    const poke = (pokeSnap.data() ?? {}) as Record<string, { shadow?: number }>;
    if (!poke[pokemonId]) throw new HttpsError("failed-precondition", "You do not own that Pokemon.");

    const raw = (sessSnap.data() ?? {}) as {
      date?: string; postsLogged?: number; evoPts?: number; happinessPts?: number;
      partner?: boolean; startedAt?: FirebaseFirestore.Timestamp;
    };
    const fresh = raw.date !== today;
    const partnerMode = fresh ? partner : !!raw.partner;
    const windowMs = (partnerMode ? 4 : 2) * 60 * 60 * 1000;

    if (!fresh && raw.startedAt) {
      if (now.getTime() - raw.startedAt.toMillis() > windowMs) {
        throw new HttpsError("failed-precondition", "Your training window for today has closed.");
      }
    }

    const n = fresh ? 0 : raw.postsLogged ?? 0;
    const evoCap = partnerMode ? 10 : 5;
    const awardedEvo = n < evoCap ? 1.0 : 0.75;
    const awardedHappiness = n < 5 ? 0.2 : 0.1;

    // Shadow Pokemon earn Purification instead of Evolution (experience) points.
    const evoField = (poke[pokemonId]?.shadow ?? 0) > 0 ? "purification" : "experience";
    tx.set(
      pokeRef,
      { [pokemonId]: { [evoField]: FieldValue.increment(awardedEvo), friendship: FieldValue.increment(awardedHappiness) } },
      { merge: true }
    );

    const session = {
      date: today,
      partner: partnerMode,
      targetPokemonId: pokemonId,
      startedAt: fresh ? now : raw.startedAt ?? now,
      postsLogged: n + 1,
      evoPts: (fresh ? 0 : raw.evoPts ?? 0) + awardedEvo,
      happinessPts: (fresh ? 0 : raw.happinessPts ?? 0) + awardedHappiness,
    };
    tx.set(sessRef, session, { merge: false });
    return { awardedEvo, awardedHappiness, session };
  });

  return { ok: true, ...result };
});

export const resetTrainingSession = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  await db.doc(`users/${uid}/bag/training_session`).set(
    { date: "", postsLogged: 0, evoPts: 0, happinessPts: 0 },
    { merge: false }
  );
  return { ok: true };
});

// --- Trash Shack: convert a Pokemon's Evo Points into a Scent --------------
// Garbodor spends Evolution (experience) points off one owned Pokemon and
// hands back an aroma Scent. See docs/SHOP_DATA.md candy_to_scent.
const SCENTS = {
  joy: { cost: 4, itemId: "joy-scent", name: "Joy Scent" },
  excite: { cost: 6, itemId: "excite-scent", name: "Excite Scent" },
  vivid: { cost: 8, itemId: "vivid-scent", name: "Vivid Scent" },
} as const;
type ScentKey = keyof typeof SCENTS;

export const convertCandyToScent = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  const pokemonId = requireString(request.data?.pokemonId, "pokemon", 80);
  const scentKey = String(request.data?.scent ?? "") as ScentKey;
  const scent = SCENTS[scentKey];
  if (!scent) throw new HttpsError("invalid-argument", "Pick a Joy, Excite or Vivid Scent.");
  const qty = requireInt(request.data?.qty ?? 1, "qty", 1, 20);
  const totalCost = scent.cost * qty;

  const pokeRef = db.doc(`users/${uid}/bag/owned_pokemons`);
  const bagRef = db.doc(`users/${uid}/bag/items`);

  const remaining = await db.runTransaction(async (tx) => {
    const pokeSnap = await tx.get(pokeRef);
    const poke = (pokeSnap.data() ?? {}) as Record<string, { experience?: number }>;
    const entry = poke[pokemonId];
    if (!entry) throw new HttpsError("failed-precondition", "You do not own that Pokemon.");
    const have = Number(entry.experience ?? 0);
    if (have < totalCost) {
      throw new HttpsError(
        "failed-precondition",
        `That Pokemon has ${have} Evo Points; ${qty} ${scent.name}${qty > 1 ? "s" : ""} cost ${totalCost}.`
      );
    }
    tx.set(pokeRef, { [pokemonId]: { experience: FieldValue.increment(-totalCost) } }, { merge: true });
    bagIncrement(tx, bagRef, scent.itemId, { name: scent.name, category: "other-item" }, qty);
    return have - totalCost;
  });

  await db.collection("auditLogs").add({
    action: "shop.candyToScent",
    actorUid: uid,
    actorName: member.username,
    targetPath: `users/${uid}/bag/owned_pokemons`,
    details: { pokemonId, scent: scentKey, qty, spentEvoPoints: totalCost },
    createdAt: new Date(),
  });

  return { ok: true, scent: scentKey, qty, spent: totalCost, remaining };
});

// --- Colosseum: adjust battle rankings (grader-gated) ----------------------
export const awardRankingPoints = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isGrader(member)) throw new HttpsError("permission-denied", "You cannot adjust rankings.");
  const targetUid = requireString(request.data?.uid, "uid", 80);
  const points = requireInt(request.data?.points ?? 0, "points", -1000, 1000);
  const targetSnap = await db.doc(`users/${targetUid}`).get();
  const username = (targetSnap.data()?.username as string) ?? targetUid;
  await db.doc(`battle_rankings/${targetUid}`).set(
    { username, points: FieldValue.increment(points) },
    { merge: true }
  );
  return { ok: true };
});

// --- Challenges: grant a cleared step (grader-gated) -----------------------
export const grantChallengeStep = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isGrader(member)) throw new HttpsError("permission-denied", "You cannot grant challenge steps.");
  const targetUid = requireString(request.data?.uid, "uid", 80);
  const kind = requireString(request.data?.kind, "kind", 20);
  const region = requireString(request.data?.regionOrIsland, "region", 40);
  const stepId = requireString(request.data?.stepId, "step", 60);
  const zCrystal = typeof request.data?.zCrystal === "string" ? request.data.zCrystal : undefined;

  const update: Record<string, unknown> = {};
  if (kind === "badge") update.badges = { [region]: FieldValue.arrayUnion(stepId) };
  else if (kind === "eliteFour") update.eliteFour = { [region]: true };
  else if (kind === "champion") update.champion = { [region]: true };
  else if (kind === "trial") update.trialsCompleted = FieldValue.arrayUnion(stepId);
  else if (kind === "grandTrial") update.grandTrials = FieldValue.arrayUnion(stepId);
  else throw new HttpsError("invalid-argument", "Unknown challenge kind.");
  if (zCrystal) update.zCrystals = FieldValue.arrayUnion(zCrystal);

  await db.doc(`users/${targetUid}/bag/challenges`).set(update, { merge: true });
  await notifyUsers([targetUid], { type: "reward", text: "You cleared a challenge stage!", link: "/Challenges" });
  return { ok: true };
});

// ===========================================================================
// Casino (Darts' Ghastly Gambling). Gengar Tokens (gengarcoin) bought from
// Snag Coins (pokecoin). ALL randomness is server-side. See docs/CASINO_DATA.md.
// ===========================================================================

// --- Buy/sell Gengar Tokens -------------------------------------------------
export const exchangeTokens = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const direction = requireString(request.data?.direction, "direction", 8);
  const amount = requireInt(request.data?.amount ?? 0, "amount", 1, 100000);

  const cfgSnap = await db.doc("admin/casino_config").get();
  const rate = Math.max(1, Math.trunc(Number(cfgSnap.data()?.exchangeRate ?? 2))); // Snag Coins per token

  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const totals = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(currencyRef)).data() ?? {};
    let poke = parseInt(String(cur.pokecoin ?? "0"), 10) || 0;
    let geng = parseInt(String(cur.gengarcoin ?? "0"), 10) || 0;
    if (direction === "buy") {
      const cost = amount * rate;
      if (poke < cost) throw new HttpsError("failed-precondition", "Not enough Snag Coins.");
      poke -= cost;
      geng += amount;
    } else if (direction === "sell") {
      // House keeps the spread: tokens cash out at 1 Snag Coin each.
      if (geng < amount) throw new HttpsError("failed-precondition", "Not enough Gengar Tokens.");
      geng -= amount;
      poke += amount;
    } else {
      throw new HttpsError("invalid-argument", "Bad direction.");
    }
    tx.set(currencyRef, { pokecoin: String(poke), gengarcoin: String(geng) }, { merge: true });
    return { pokecoin: poke, gengarcoin: geng };
  });
  return { ok: true, ...totals };
});

// --- Instant games (Hex Roulette, Dream Dice, Payback Pyramid) --------------
export const playCasinoGame = onCall(async (request) => {
  const uid = requireAuth(request);
  await loadMember(uid);
  const game = requireString(request.data?.game, "game", 20);
  const bet = requireInt(request.data?.bet ?? 1, "bet", 1, 5);
  const pick = request.data?.pick;

  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const result = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(currencyRef)).data() ?? {};
    let geng = parseInt(String(cur.gengarcoin ?? "0"), 10) || 0;
    if (geng < bet) throw new HttpsError("failed-precondition", "Not enough Gengar Tokens.");
    geng -= bet; // stake taken up front

    let win = false;
    let roll: number | number[] = 0;
    let payout = 0;

    if (game === "hexRoulette") {
      const n = requireInt(pick, "pick", 1, 36);
      roll = randomInt(1, 37);
      if (roll === n) { win = true; payout = Math.round(bet * 5.5); }
    } else if (game === "dreamDice") {
      const total = requireInt(pick, "pick", 2, 12);
      const d1 = randomInt(1, 7);
      const d2 = randomInt(1, 7);
      roll = [d1, d2];
      if (d1 + d2 === total) { win = true; payout = bet * (d1 === d2 ? 3 : 2); }
    } else if (game === "paybackPyramid") {
      if (pick !== "even" && pick !== "odd") throw new HttpsError("invalid-argument", "Pick even or odd.");
      roll = randomInt(1, 5); // d4
      const isEven = roll % 2 === 0;
      if ((pick === "even") === isEven) { win = true; payout = bet * 2; }
    } else {
      throw new HttpsError("invalid-argument", "Unknown game.");
    }

    geng += payout; // stake already deducted; add winnings
    tx.set(currencyRef, { gengarcoin: String(geng) }, { merge: true });
    return { win, roll, payout, gengarcoin: geng };
  });
  return { ok: true, ...result };
});

// --- Shadow Lotto: buy a ticket --------------------------------------------
export const buyLottoTicket = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  const number = requireInt(request.data?.number ?? 0, "number", 1, 50);

  const currencyRef = db.doc(`users/${uid}/bag/currency`);
  const lottoRef = db.doc("casino/lotto");
  const myRef = db.doc(`users/${uid}/bag/casino`);

  const out = await db.runTransaction(async (tx) => {
    const [curSnap, lottoSnap] = await Promise.all([tx.get(currencyRef), tx.get(lottoRef)]);
    const geng = parseInt(String(curSnap.data()?.gengarcoin ?? "0"), 10) || 0;
    if (geng < 1) throw new HttpsError("failed-precondition", "A ticket costs 1 Gengar Token.");
    const lotto = lottoSnap.data() ?? {};
    const weekId = String(lotto.weekId ?? "current");

    tx.set(currencyRef, { gengarcoin: String(geng - 1) }, { merge: true });
    tx.set(lottoRef, {
      jackpot: FieldValue.increment(1),
      ticketCount: FieldValue.increment(1),
      weekId,
      tickets: FieldValue.arrayUnion({ uid, name: member.username, number, weekId }),
    }, { merge: true });
    tx.set(myRef, { lottoNumber: number, lottoWeekId: weekId }, { merge: true });
    return { number, jackpot: (Number(lotto.jackpot ?? 100)) + 1 };
  });
  return { ok: true, ...out };
});

// --- Shadow Lotto: draw (grader/admin) -------------------------------------
export const drawLotto = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = await loadMember(uid);
  if (!isGrader(member)) throw new HttpsError("permission-denied", "You cannot draw the lotto.");

  const lottoRef = db.doc("casino/lotto");
  const lottoSnap = await lottoRef.get();
  const lotto = lottoSnap.data() ?? {};
  const drawn = randomInt(1, 51); // 1..50
  const jackpot = Math.max(0, Math.trunc(Number(lotto.jackpot ?? 100)));
  const tickets = (Array.isArray(lotto.tickets) ? lotto.tickets : []) as Array<{ uid: string; number: number }>;
  const winners = [...new Set(tickets.filter((t) => t.number === drawn).map((t) => t.uid))];

  // Split the jackpot evenly among winners. Any floor remainder is handed out
  // one coin at a time to the earliest winners so the whole pot is always paid.
  const share = winners.length ? Math.floor(jackpot / winners.length) : 0;
  const remainder = winners.length ? jackpot - share * winners.length : 0;
  const payoutFor = (index: number) => share + (index < remainder ? 1 : 0);

  const batch = db.batch();
  for (let i = 0; i < winners.length; i++) {
    const cRef = db.doc(`users/${winners[i]}/bag/currency`);
    const cur = (await cRef.get()).data() ?? {};
    batch.set(cRef, { gengarcoin: addCurrencyString(cur.gengarcoin, payoutFor(i)) }, { merge: true });
  }
  // Reset the pot to the base for the next week.
  const nextWeek = String(Date.now());
  batch.set(lottoRef, { drawNumber: drawn, jackpot: 100, ticketCount: 0, weekId: nextWeek, tickets: [] }, { merge: true });
  await batch.commit();

  // Notify winners of their actual share (top winners get one extra coin from the remainder).
  const topWinners = winners.slice(0, remainder);
  const baseWinners = winners.slice(remainder);
  if (topWinners.length) {
    await notifyUsers(topWinners, { type: "reward", text: `You won the Shadow Lotto! +${share + 1} Gengar Tokens.`, link: "/Casino" });
  }
  if (baseWinners.length) {
    await notifyUsers(baseWinners, { type: "reward", text: `You won the Shadow Lotto! +${share} Gengar Tokens.`, link: "/Casino" });
  }
  return { ok: true, drawn, winners: winners.length, jackpot, share };
});
