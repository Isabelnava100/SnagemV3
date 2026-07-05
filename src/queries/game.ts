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

export interface BattleConfig {
  boss: StageCosts;
  encounter: StageCosts;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  boss: { stage1: 5, stage2: 10, stage3: 15, legendary: 20 },
  encounter: { stage1: 4, stage2: 7, stage3: 10, legendary: 13 },
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
  return {
    boss: readStageCosts(data?.boss, DEFAULT_BATTLE_CONFIG.boss),
    encounter: readStageCosts(data?.encounter, DEFAULT_BATTLE_CONFIG.encounter),
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
