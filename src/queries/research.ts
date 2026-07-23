import { getDb } from "../context/firebase";
import { call } from "./_callable";

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
  const db = await getDb();
  const snap = await getDoc(doc(db, "admin", "research_config"));
  return (snap.data() as ResearchConfig) || {};
};

/** A member's per-character research progress, keyed by characterId. */
export const getResearchProgress = async (uid: string): Promise<Record<string, ResearchProgress>> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "users", uid, "bag", "research"));
  return (snap.data() as Record<string, ResearchProgress>) || {};
};

/**
 * A member's ask to clear a character into a master track. Approving flips the
 * character's type (the console clearance flag) to the chosen track.
 */
export interface MasterClearanceRequest {
  id: string;
  uid: string;
  username?: string;
  characterId: string;
  characterName?: string;
  track?: "Hybrid" | "Channeler";
  status: "requested" | "approved" | "declined";
  handledBy?: string;
  createdAt?: { seconds: number };
}

/** The signed-in member's own clearance requests (drives the guide button). */
export const getMyClearanceRequests = async (uid: string): Promise<MasterClearanceRequest[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(
    query(collection(db, "masterClearanceRequests"), where("uid", "==", uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MasterClearanceRequest, "id">) }));
};

/** Staff view: clearance requests still waiting for review. */
export const getPendingClearanceRequests = async (): Promise<MasterClearanceRequest[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(
    query(collection(db, "masterClearanceRequests"), where("status", "==", "requested"))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<MasterClearanceRequest, "id">) }))
    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
};

/** Files a clearance request for a character and notifies the graders. */
export const requestMasterClearance = (characterId: string, track: "Hybrid" | "Channeler") =>
  call<{ ok: boolean; id: string; duplicate?: boolean }>("requestMasterClearance", {
    characterId,
    track,
  });

/** Grader action: approve (sets the character's track) or decline a request. */
export const resolveMasterClearance = (args: {
  requestId: string;
  approve: boolean;
  track: "Hybrid" | "Channeler";
}) => call<{ ok: boolean }>("resolveMasterClearance", args);

export const reviveFossil = (fossilItemId: string) =>
  call<{ ok: boolean; pokemon: { name: string; slug: string } }>("reviveFossil", { fossilItemId });

export const requestMasterMission = (characterId: string, type: string, number: number) =>
  call<{ ok: boolean; id: string }>("requestMasterMission", { characterId, type, number });

/** Grader action: grant a completed master mission (bumps progress, grants ability). */
export const grantMasterMission = (requestId: string, ability: string) =>
  call<{ ok: boolean }>("grantMasterMission", { requestId, ability });
