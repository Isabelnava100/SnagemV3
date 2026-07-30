import { getDb } from "../context/firebase";

/**
 * Member messages sent through GRAY (suggestions, bug reports, questions),
 * stored in the tickets collection with status "new" until staff promote them
 * to the Dev Board or discard them. Shared by the Dev Board tool and the Admin
 * inbox's "help desk open" stat (same ["dev-incoming"] query key).
 */
export interface Incoming {
  id: string;
  type: string;
  text: string;
  actorName: string;
  createdAt?: { seconds?: number };
}

const INCOMING_TYPES = ["dev_suggestion", "dev_bug", "member_question"];

export const getIncomingTickets = async (): Promise<Incoming[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(
    query(collection(db, "tickets"), where("type", "in", INCOMING_TYPES), where("status", "==", "new"))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Incoming, "id">) }))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
};
