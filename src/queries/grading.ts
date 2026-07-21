import { db } from "../context/firebase";

export interface PendingSubmission {
  id: string;
  missionId?: string;
  submitterUid?: string;
  submitterName?: string;
  threadLink?: string;
  submittedAt?: { seconds: number };
}

export interface PendingMMRequest {
  id: string;
  uid?: string;
  username?: string;
  characterId?: string;
  type?: string;
  number?: number;
  createdAt?: { seconds: number };
}

/** All mission submissions awaiting a grader, oldest first. */
export const getPendingMissionSubmissions = async (): Promise<PendingSubmission[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "missionSubmissions"), where("status", "==", "pending"))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<PendingSubmission, "id">) }))
    .sort((a, b) => (a.submittedAt?.seconds ?? 0) - (b.submittedAt?.seconds ?? 0));
};

/**
 * How many times this member already had this mission graded (approved).
 * Shown on the grading card so "once per member" reward notes are judgeable.
 */
export const getGradedCount = async (missionId: string, submitterUid: string): Promise<number> => {
  const { collection, getCountFromServer, query, where } = await import("firebase/firestore");
  const snap = await getCountFromServer(
    query(
      collection(db, "missionSubmissions"),
      where("missionId", "==", missionId),
      where("submitterUid", "==", submitterUid),
      where("status", "==", "graded")
    )
  );
  return snap.data().count;
};

/** All master mission requests awaiting a grant. */
export const getPendingMasterMissionRequests = async (): Promise<PendingMMRequest[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "masterMissionRequests"), where("status", "==", "requested"))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<PendingMMRequest, "id">) }))
    .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
};
