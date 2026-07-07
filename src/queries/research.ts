import { db } from "../context/firebase";

/** Static research config (fossil map, unlock rules). See docs/RESEARCH_DATA.md. */
export interface ResearchConfig {
  fossilCost?: number;
  fossilMap?: Record<string, string>; // fossil itemId -> pokemon slug
  channelerTypes?: string[];
  masterMissionsPerType?: number; // 10
}

/** Per-character Hybrid/Channeler progression (stored on bag/profile or a doc). */
export interface ResearchProgress {
  characterId: string;
  kind?: "Hybrid" | "Channeler" | "None";
  types?: Array<{ type: string; missionsCompleted: number; abilities: string[] }>;
  grandMasterComplete?: boolean;
  megaUnlocked?: boolean;
  zmoveUnlocked?: boolean;
}

export const getResearchConfig = async (): Promise<ResearchConfig> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "admin", "research_config"));
  return (snap.data() as ResearchConfig) || {};
};

/** A member's per-character research progress, keyed by characterId. */
export const getResearchProgress = async (uid: string): Promise<Record<string, ResearchProgress>> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "bag", "research"));
  return (snap.data() as Record<string, ResearchProgress>) || {};
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

export const reviveFossil = (fossilItemId: string) =>
  call<{ ok: boolean; pokemon: { name: string; slug: string } }>("reviveFossil", { fossilItemId });

export const requestMasterMission = (characterId: string, type: string, number: number) =>
  call<{ ok: boolean; id: string }>("requestMasterMission", { characterId, type, number });

/** Grader action: grant a completed master mission (bumps progress, grants ability). */
export const grantMasterMission = (requestId: string, ability: string) =>
  call<{ ok: boolean }>("grantMasterMission", { requestId, ability });
