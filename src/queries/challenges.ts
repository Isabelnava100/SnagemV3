import { db } from "../context/firebase";

/** A gym in a region gauntlet (see docs/CHALLENGES_DATA.md). */
export interface Gym {
  order: number;
  leaderName: string;
  type?: string;
  fieldDescription?: string;
  challengerPokemonLimit?: number;
  battleFormat?: string;
}

export interface GymRegion {
  id: string;
  name: string;
  gyms?: Gym[];
  eliteFour?: { members?: { name: string; type?: string }[]; champion?: { name: string } };
  championPrize?: string;
  order?: number;
}

export interface IslandTrial {
  id: string;
  island: string;
  name: string;
  captain?: string;
  type?: string;
  totemPokemon?: string;
  snagCoins?: number | string;
  zCrystalReward?: string;
  grand?: boolean;
  kahuna?: string;
  order?: number;
}

/** Per-member challenge progress, stored at users/{uid}/bag/challenges. */
export interface ChallengeProgress {
  badges?: Record<string, string[]>; // region -> earned leader names/badge ids
  eliteFour?: Record<string, boolean>;
  champion?: Record<string, boolean>;
  trialsCompleted?: string[]; // island trial ids
  zCrystals?: string[];
  grandTrials?: string[];
}

export const getGymRegions = async (): Promise<GymRegion[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "gymRegions"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<GymRegion, "id">) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const getIslandTrials = async (): Promise<IslandTrial[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "islandTrials"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<IslandTrial, "id">) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const getChallengeProgress = async (uid: string): Promise<ChallengeProgress> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "bag", "challenges"));
  return (snap.data() as ChallengeProgress) || {};
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

/** Grader action: mark a badge/trial/elite/champion step cleared for a member. */
export const grantChallengeStep = (
  uid: string,
  kind: "badge" | "trial" | "grandTrial" | "eliteFour" | "champion",
  regionOrIsland: string,
  stepId: string,
  zCrystal?: string
) => call<{ ok: boolean }>("grantChallengeStep", { uid, kind, regionOrIsland, stepId, zCrystal });

/**
 * A member's ask to start a gym run or island trial. Admins/directors host
 * these threads, so the request waits in the staff inbox until someone
 * accepts it and creates the thread.
 */
export interface ChallengeRequest {
  id: string;
  uid: string;
  username?: string;
  kind: "gym" | "trial";
  regionOrIsland: string;
  stageId: string;
  stageTitle?: string;
  status: "requested" | "accepted" | "declined";
  threadLink?: string;
  handledBy?: string;
  createdAt?: { seconds: number };
}

/** The signed-in member's own challenge requests (drives the page's buttons). */
export const getMyChallengeRequests = async (uid: string): Promise<ChallengeRequest[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "challengeRequests"), where("uid", "==", uid))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChallengeRequest, "id">) }));
};

/** Staff view: every request still waiting for someone to accept it. */
export const getPendingChallengeRequests = async (): Promise<ChallengeRequest[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "challengeRequests"), where("status", "==", "requested"))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ChallengeRequest, "id">) }))
    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
};

/** Files a challenge request and notifies hosting staff. */
export const requestChallenge = (args: {
  kind: "gym" | "trial";
  regionOrIsland: string;
  stageId: string;
  stageTitle?: string;
}) => call<{ ok: boolean; id: string; duplicate?: boolean }>("requestChallenge", args);

/** Staff action: accept (optionally with the created thread's link) or decline. */
export const resolveChallengeRequest = (args: {
  requestId: string;
  accept: boolean;
  threadLink?: string;
}) => call<{ ok: boolean }>("resolveChallengeRequest", args);
