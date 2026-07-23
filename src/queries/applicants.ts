import { getDb } from "../context/firebase";
import { call } from "./_callable";

export interface NewUserApplicant {
  id: string;
  username?: string;
  email?: string;
  application?: string;
  gaiaName?: string;
  isGaia?: string;
  permissions?: string;
  joinedAt?: { seconds: number; nanoseconds: number };
}

/** All pending applicants in the NewUsers queue (admin-readable). */
export const getNewUsers = async (): Promise<NewUserApplicant[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(collection(db, "NewUsers"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<NewUserApplicant, "id">) }))
    .sort((a, b) => (b.joinedAt?.seconds ?? 0) - (a.joinedAt?.seconds ?? 0));
};

async function callFn<T>(name: string, data: unknown): Promise<T> {
  return call<T>(name, data);
}

/** Approve an applicant into the users collection with a starting role. */
export const approveNewUser = (uid: string, role: string) =>
  callFn<{ ok: boolean }>("approveNewUser", { uid, role });

/** Remove an applicant from the queue. */
export const rejectNewUser = (uid: string, note: string) =>
  callFn<{ ok: boolean }>("rejectNewUser", { uid, note });
