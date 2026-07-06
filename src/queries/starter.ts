import { db } from "../context/firebase";

/**
 * New-member starter onboarding (non-Gaia applicants). A freshly approved
 * member creates their first character and picks a starter Pokemon, then
 * submits it for staff review. Approval (approveStarter Cloud Function) creates
 * the character and grants the starter assigned to it; nothing lands in a bag
 * from the client.
 *
 * The starter must be a "stage 1" species: a base form that can still evolve
 * and is not legendary. The client filters the picker to those; the Cloud
 * Function re-validates on approval.
 *
 * Stored at starterRequests/{uid} (one per member). Status flow:
 *   draft     -> member is filling it in (editable)
 *   pending   -> submitted, awaiting review (locked, preview only)
 *   rejected  -> sent back with a note (editable again)
 *   granted   -> approved and applied; the flow no longer shows
 */
export type StarterStatus = "draft" | "pending" | "rejected" | "granted";

export interface StarterCharacter {
  name: string;
  pronouns?: string;
  short_description?: string;
}

export interface StarterPick {
  slug: string;
  species: string;
  pokedex: string;
  gender: "M" | "F";
}

export interface StarterRequest {
  status: StarterStatus;
  character: StarterCharacter;
  starter: StarterPick | null;
  /** Note from the member to the reviewer. */
  note?: string;
  /** Reviewer's note back to the member (on reject). */
  reviewerNote?: string;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedByName?: string;
}

const starterRef = (uid: string) =>
  import("firebase/firestore").then(({ doc }) => doc(db, "starterRequests", uid));

export const getStarterRequest = async (uid: string): Promise<StarterRequest | null> => {
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(await starterRef(uid));
  return snap.exists() ? (snap.data() as StarterRequest) : null;
};

/** Save the member's editable draft (status stays draft). Owner-write per rules. */
export const saveStarterDraft = async (
  uid: string,
  character: StarterCharacter,
  starter: StarterPick | null
): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(await starterRef(uid), { character, starter, status: "draft" }, { merge: true });
};

/** Submit the current character + starter for review. */
export const submitStarterRequest = async (
  uid: string,
  character: StarterCharacter,
  starter: StarterPick,
  note: string
): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(
    await starterRef(uid),
    { character, starter, note, status: "pending", submittedAt: Date.now(), reviewerNote: "" },
    { merge: true }
  );
};

/** Reviewer queue: every starter request awaiting approval. */
export const getPendingStarters = async (): Promise<Array<StarterRequest & { uid: string }>> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "starterRequests"), where("status", "==", "pending"))
  );
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as StarterRequest) }));
};

async function callFn<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const result = await httpsCallable(getFunctions(), name)(data);
  return result.data as T;
}

/** Reviewer approves: creates the character and grants the starter (server-side). */
export const approveStarter = (uid: string) =>
  callFn<{ ok: boolean }>("approveStarter", { uid });

/** Reviewer sends the starter request back with a note. */
export const rejectStarter = (uid: string, note: string) =>
  callFn<{ ok: boolean }>("rejectStarter", { uid, note });
