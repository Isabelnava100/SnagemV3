import { db } from "../context/firebase";

/**
 * Game-layer data: thread-close reward sessions, in-app notifications,
 * XP defaults and mystery box configs. Writes that grant anything run
 * through Cloud Functions; these are the reads + low-stakes saves.
 */

// ---- Reward sessions (thread close) ---------------------------------------

export interface RewardPokemonXp {
  name?: string;
  slug?: string;
  experience: number;
  friendship: number;
  purification: number;
  shadow: number;
}
export interface RewardEntry {
  items: Array<{ itemId: string; name: string; filePath: string; category: string; qty: number }>;
  currencies: { pokecoin: number; gengarcoin: number; snagemblem: number };
  /** New Pokemon to grant this recipient (optionally shiny). */
  pokemon?: Array<{ slug: string; name: string; shiny?: boolean }>;
  /** Reviewed per-pokemon XP, seeded from the thread's pending ledger. */
  pokemonXp?: Record<string, RewardPokemonXp>;
}

export interface RewardSession {
  forum: string;
  threadId: string;
  threadTitle: string;
  participants: Record<string, { name: string; avatar?: string }>;
  rewards: Record<string, RewardEntry>;
  finalized?: boolean;
  updatedAt?: { seconds: number };
}

export const rewardSessionId = (forum: string, threadId: string) => `${forum}__${threadId}`;

export const getRewardSession = async (
  forum: string,
  threadId: string
): Promise<RewardSession | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "rewardSessions", rewardSessionId(forum, threadId)));
  return snap.exists() ? (snap.data() as RewardSession) : null;
};

/** Save-in-progress state so the closer can come back later (Q1). */
export const saveRewardSession = async (session: RewardSession): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "rewardSessions", rewardSessionId(session.forum, session.threadId)), {
    ...session,
    updatedAt: new Date(),
  });
};

// ---- Notifications ----------------------------------------------------------

export interface AppNotification {
  id: string;
  type: string;
  text: string;
  link: string;
  read: boolean;
  createdAt: { seconds: number; nanoseconds: number };
}

export const getNotifications = async (uid: string): Promise<AppNotification[]> => {
  const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"), limit(30))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
};

export const markNotificationsRead = async (uid: string, ids: string[]): Promise<void> => {
  const { doc, writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, "users", uid, "notifications", id), { read: true }));
  await batch.commit();
};

// ---- XP defaults (admin/xp_defaults) ---------------------------------------

export interface XPDefaults {
  experiencePerPost: number;
  friendshipPerPost: number;
  purificationPerPost: number;
  shadowPerPost: number;
  minPostLength: number;
  /** All fields are numeric, so it can pass as a plain number map to the callable. */
  [key: string]: number;
}

/** The four awardable stats + labels, shared by the admin + composer XP UIs. */
export const XP_STAT_FIELDS = [
  { key: "experiencePerPost", label: "Experience" },
  { key: "friendshipPerPost", label: "Friendship" },
  { key: "purificationPerPost", label: "Purification" },
  { key: "shadowPerPost", label: "Shadow" },
] as const;

export const getXPDefaults = async (): Promise<XPDefaults> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "admin", "xp_defaults"))).data();
  return {
    // Back-compat: an old `perPost` value maps to experience.
    experiencePerPost: Number(data?.experiencePerPost ?? data?.perPost) || 0,
    friendshipPerPost: Number(data?.friendshipPerPost) || 0,
    purificationPerPost: Number(data?.purificationPerPost) || 0,
    shadowPerPost: Number(data?.shadowPerPost) || 0,
    minPostLength: Number(data?.minPostLength) || 0,
  };
};

export const saveXPDefaults = async (defaults: XPDefaults): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "admin", "xp_defaults"), defaults);
};

// ---- Battle costs (admin/battle_config) ------------------------------------
// Posts needed to defeat a boss / capture an encounter, by the target's battle
// stage. Totalled across attackers for bosses; per capture-group for encounters.

export interface StageCosts {
  stage1: number;
  stage2: number;
  stage3: number;
  legendary: number;
}

/** Level-based max HP scaling: base at level 1, +low per level up to the
 * split, +high per level after it. */
export interface HpScaling {
  base: number;
  low: number;
  high: number;
  split: number;
}

/** Tunable battle mechanics (all admin-editable in Battle Costs). */
export interface BattleMechanics {
  /** Same-type attack bonus multiplier on every player attack. */
  stab: number;
  /** Critical hit chance (percent), both directions. */
  critChance: number;
  /** Damage/progress multiplier on a critical hit. */
  critMult: number;
  /** How much an attack/defense nature helps (percent). */
  natureEffect: number;
  /** Chance (percent) an enemy hit inflicts a status (by its type). */
  statusChance: number;
  /** Flat damage burn/poison deal to the fighter each battle post. */
  statusTick: number;
  /** Attack progress multiplier while paralyzed. */
  paralysisMult: number;
  /** Weather boost multiplier for favored types (weakened = 1/boost). */
  weatherBoost: number;
  /** Snag Coin cost of a mid-thread Pokemon Center heal. */
  centerCost: number;
  /** Extra catch percent for a fully beaten (worn down) encounter. */
  ballWornBonus: number;
  /** Qualifying posts for a bred egg to hatch. */
  hatchPosts: number;
  /** Days for a bred egg to hatch (whichever comes first with hatchPosts). */
  hatchDays: number;
}

export interface BattleConfig {
  boss: StageCosts;
  encounter: StageCosts;
  hp: HpScaling;
  /** Flat damage an enemy of each star (1..7) deals per battle post. */
  starDamage: Record<string, number>;
  mechanics: BattleMechanics;
}

export const DEFAULT_BATTLE_MECHANICS: BattleMechanics = {
  stab: 1.1,
  critChance: 3,
  critMult: 1.5,
  natureEffect: 5,
  statusChance: 10,
  statusTick: 10,
  paralysisMult: 0.5,
  weatherBoost: 1.2,
  centerCost: 10,
  ballWornBonus: 40,
  hatchPosts: 10,
  hatchDays: 15,
};

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  boss: { stage1: 5, stage2: 10, stage3: 15, legendary: 20 },
  encounter: { stage1: 4, stage2: 7, stage3: 10, legendary: 13 },
  hp: { base: 100, low: 2, high: 4, split: 50 },
  starDamage: { 1: 20, 2: 30, 3: 45, 4: 60, 5: 80, 6: 100, 7: 140 },
  mechanics: DEFAULT_BATTLE_MECHANICS,
};

const readStageCosts = (data: unknown, fallback: StageCosts): StageCosts => {
  const d = (data ?? {}) as Partial<StageCosts>;
  return {
    stage1: Number(d.stage1) || fallback.stage1,
    stage2: Number(d.stage2) || fallback.stage2,
    stage3: Number(d.stage3) || fallback.stage3,
    legendary: Number(d.legendary) || fallback.legendary,
  };
};

export const getBattleConfig = async (): Promise<BattleConfig> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "admin", "battle_config"))).data();
  const hpRaw = (data?.hp ?? {}) as Partial<HpScaling>;
  const dmgRaw = (data?.starDamage ?? {}) as Record<string, unknown>;
  const mechRaw = (data?.mechanics ?? {}) as Partial<Record<keyof BattleMechanics, unknown>>;
  const mech = Object.fromEntries(
    (Object.keys(DEFAULT_BATTLE_MECHANICS) as Array<keyof BattleMechanics>).map((k) => {
      const n = Number(mechRaw[k]);
      return [k, Number.isFinite(n) && n >= 0 ? n : DEFAULT_BATTLE_MECHANICS[k]];
    })
  ) as unknown as BattleMechanics;
  return {
    mechanics: mech,
    boss: readStageCosts(data?.boss, DEFAULT_BATTLE_CONFIG.boss),
    encounter: readStageCosts(data?.encounter, DEFAULT_BATTLE_CONFIG.encounter),
    hp: {
      base: Number(hpRaw.base) || DEFAULT_BATTLE_CONFIG.hp.base,
      low: Number.isFinite(Number(hpRaw.low)) ? Number(hpRaw.low) : DEFAULT_BATTLE_CONFIG.hp.low,
      high: Number.isFinite(Number(hpRaw.high)) ? Number(hpRaw.high) : DEFAULT_BATTLE_CONFIG.hp.high,
      split: Number(hpRaw.split) || DEFAULT_BATTLE_CONFIG.hp.split,
    },
    starDamage: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((s) => [
        String(s),
        Number(dmgRaw[String(s)]) > 0
          ? Number(dmgRaw[String(s)])
          : DEFAULT_BATTLE_CONFIG.starDamage[String(s)],
      ])
    ),
  };
};

export const saveBattleConfig = async (config: BattleConfig): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "admin", "battle_config"), config);
};

// ---- Mystery boxes (admin/mystery_boxes) ------------------------------------

export interface MysteryBoxPoolEntry {
  kind: "item" | "currency";
  refId: string;
  name: string;
  filePath?: string;
  category?: string;
  qty: number;
  weight: number;
}

export interface MysteryBoxConfig {
  name: string;
  pool: MysteryBoxPoolEntry[];
  /**
   * Archived boxes can no longer be given out, but the config stays so members
   * who already own a copy can still open it. Archived boxes are hidden from
   * the admin's active list; opening is unaffected.
   */
  archived?: boolean;
}

export const getMysteryBoxes = async (): Promise<Record<string, MysteryBoxConfig>> => {
  const { doc, getDoc } = await import("firebase/firestore");
  return ((await getDoc(doc(db, "admin", "mystery_boxes"))).data() ?? {}) as Record<
    string,
    MysteryBoxConfig
  >;
};

export const saveMysteryBox = async (
  boxItemId: string,
  config: MysteryBoxConfig | null
): Promise<void> => {
  const { deleteField, doc, setDoc } = await import("firebase/firestore");
  await setDoc(
    doc(db, "admin", "mystery_boxes"),
    { [boxItemId]: config ?? deleteField() },
    { merge: true }
  );
};

// ---- Daycare (breeding) + Poke Swap (trading) callables ---------------------
// Both live server-side (functions/src/index.ts); the client only reads state
// and invokes the callables.

async function callGame<TResult>(name: string, data: unknown): Promise<TResult> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase"); // ensure the app is initialized
  const result = await httpsCallable(getFunctions(), name)(data);
  return result.data as TResult;
}

/** The one Daycare pair per member (users/{uid}/bag/daycare, server-written). */
export interface DaycareState {
  active?: boolean;
  leftId?: string;
  rightId?: string;
  leftName?: string;
  rightName?: string;
  offspringIdx?: number;
  startedAt?: { seconds: number };
  startPostCount?: number;
  lastHatched?: string;
}

export const getDaycare = async (uid: string): Promise<DaycareState | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "bag", "daycare"));
  return snap.exists() ? (snap.data() as DaycareState) : null;
};

export const callBreedPokemon = (leftId: string, rightId: string) =>
  callGame<{ ok: boolean }>("breedPokemon", { leftId, rightId });

export const callHatchEgg = async (): Promise<string> => {
  const result = await callGame<{ ok: boolean; hatched: string }>("hatchEgg", {});
  return result.hatched;
};

/** A Poke Swap trade doc (trades collection; all writes go through callables). */
export interface Trade {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  offerId: string;
  offerName: string;
  offerSlug?: string;
  counterId?: string;
  counterName?: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt?: { seconds: number };
}

export const getMyTrades = async (uid: string): Promise<Trade[]> => {
  const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
  const base = collection(db, "trades");
  // Two simple where() reads (sent + received) merged client-side; ordering by
  // createdAt in the query would need a composite index for each direction.
  const [sent, received] = await Promise.all([
    getDocs(query(base, where("fromUid", "==", uid), limit(50))),
    getDocs(query(base, where("toUid", "==", uid), limit(50))),
  ]);
  const byId = new Map<string, Trade>();
  [...sent.docs, ...received.docs].forEach((d) =>
    byId.set(d.id, { id: d.id, ...d.data() } as Trade)
  );
  return [...byId.values()].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  );
};

export const callProposeTrade = (targetUsername: string, pokemonId: string) =>
  callGame<{ ok: boolean; tradeId: string }>("proposeTrade", { targetUsername, pokemonId });

export const callRespondTrade = (
  tradeId: string,
  action: "accept" | "decline" | "cancel",
  counterId?: string
) => callGame<{ ok: boolean }>("respondTrade", { tradeId, action, counterId: counterId ?? "" });
