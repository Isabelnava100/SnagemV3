import { db } from "../context/firebase";

/**
 * Returning-member data import (Gaia onboarding). A member builds a draft of
 * the currency, items and Pokemon they had elsewhere (manually and/or from an
 * uploaded spreadsheet), submits it for review, and an Admin or ApproveImports
 * director approves it. Approval applies the grant to their bag through the
 * approveImport Cloud Function; nothing lands in a bag from the client.
 *
 * Stored at importRequests/{uid} (one per member). Status flow:
 *   draft     -> member is building it (editable)
 *   pending   -> submitted, awaiting review (locked, preview only)
 *   granted   -> a batch was approved and applied; member may add more
 *   rejected  -> sent back with a note (editable again)
 *   completed -> member finished onboarding; the flow no longer shows
 */
export type ImportStatus = "draft" | "pending" | "granted" | "rejected" | "completed";

export interface ImportCurrency {
  pokecoin: number;
  gengarcoin: number;
  snagemblem: number;
}

export interface ImportItem {
  /** Catalog item id (matched from the item name). */
  refId: string;
  name: string;
  filePath?: string;
  category?: string;
  qty: number;
}

export interface ImportPokemon {
  species: string;
  slug: string;
  pokedex: string;
  gender: "M" | "F";
  shiny: boolean;
  level: number;
  friendship: number;
  shadow: number;
  purification: number;
}

export interface ImportEntries {
  currency: ImportCurrency;
  items: ImportItem[];
  pokemon: ImportPokemon[];
}

export interface ImportRequest extends ImportEntries {
  status: ImportStatus;
  /** Note from the member to the reviewer. */
  note?: string;
  /** Reviewer's note back to the member (on reject). */
  reviewerNote?: string;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedByName?: string;
  /** Everything approved so far, for the member's records. */
  history?: Array<{ grantedAt: number; byName: string; entries: ImportEntries }>;
}

export const emptyEntries = (): ImportEntries => ({
  currency: { pokecoin: 0, gengarcoin: 0, snagemblem: 0 },
  items: [],
  pokemon: [],
});

const importRef = (uid: string) => {
  return import("firebase/firestore").then(({ doc }) => doc(db, "importRequests", uid));
};

export const getImportRequest = async (uid: string): Promise<ImportRequest | null> => {
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(await importRef(uid));
  return snap.exists() ? (snap.data() as ImportRequest) : null;
};

/** Save the member's editable draft (status stays draft). Owner-write per rules. */
export const saveImportDraft = async (uid: string, entries: ImportEntries): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(await importRef(uid), { ...entries, status: "draft" }, { merge: true });
};

/** Submit the current entries for review. */
export const submitImportRequest = async (
  uid: string,
  entries: ImportEntries,
  note: string
): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(
    await importRef(uid),
    { ...entries, note, status: "pending", submittedAt: Date.now(), reviewerNote: "" },
    { merge: true }
  );
};

/** Finish onboarding without importing more ("My import is complete"). */
export const completeOnboarding = async (uid: string): Promise<void> => {
  const { setDoc } = await import("firebase/firestore");
  await setDoc(await importRef(uid), { status: "completed" }, { merge: true });
};

/** Reviewer queue: every import awaiting approval. */
export const getPendingImports = async (): Promise<Array<ImportRequest & { uid: string }>> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "importRequests"), where("status", "==", "pending"))
  );
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as ImportRequest) }));
};

/** What the approveImport Cloud Function receives (Pokemon carry experience). */
export interface ApproveEntries {
  currency: ImportCurrency;
  items: ImportItem[];
  pokemon: Array<Omit<ImportPokemon, "level"> & { level: number; experience: number }>;
}

async function callFn<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const result = await httpsCallable(getFunctions(), name)(data);
  return result.data as T;
}

/** Reviewer approves and applies an import (server-side grant). */
export const approveImport = (uid: string, entries: ApproveEntries) =>
  callFn<{ ok: boolean }>("approveImport", { uid, entries });

/** Reviewer sends an import back with a note. */
export const rejectImport = (uid: string, note: string) =>
  callFn<{ ok: boolean }>("rejectImport", { uid, note });
