import { db } from "../context/firebase";

/**
 * Lore Library data access. Worldbuilding content (Gaia's read-only "Library"
 * subforum), distinct from the app's reference /Library data. Two collections:
 * loreBooks (shelves) and loreEntries (sections inside a book). Reads are open
 * to signed-in members; writes are gated by the ManageLore capability both here
 * (UI) and in the Firestore rules. See docs/LORE_DATA.md.
 */

export type LoreBookType =
  | "type_book"
  | "compendium"
  | "objects"
  | "history"
  | "short_stories"
  | "other";

export interface LoreBook {
  id: string;
  title: string;
  description?: string;
  type: LoreBookType;
  order: number;
  /** Display name of the author (e.g. the Gaia poster). */
  authorName?: string;
  /** App user uid when the author has an account; enables a profile link. */
  authorUid?: string;
}

export type LoreEntryStatus = "complete" | "stub";

export interface LoreEntry {
  id: string;
  bookId: string;
  /** Optional sub-grouping: "Minerals", "Kanto Natives", a story-arc name. */
  category?: string;
  title: string;
  /** Rich text HTML. Always DOMPurify.sanitize() before rendering. */
  body: string;
  images?: string[];
  /** Flexible structured fields (Species, Status, Alias, ...); empty for prose. */
  attributes?: Record<string, string>;
  order: number;
  status: LoreEntryStatus;
  /** Display name of the author (the Gaia poster of this section). */
  authorName?: string;
  /** App user uid when the author has an account; enables a profile link. */
  authorUid?: string;
}

const byOrder = <T extends { order?: number; title?: string }>(a: T, b: T) =>
  (a.order ?? 0) - (b.order ?? 0) || (a.title ?? "").localeCompare(b.title ?? "");

export const getLoreBooks = async (): Promise<LoreBook[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "loreBooks"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LoreBook, "id">) }))
    .sort(byOrder);
};

/**
 * Every entry in one read, used to hide empty books from readers on the shelf
 * (a book with no substantive entries stays visible only to editors).
 */
export const getAllLoreEntries = async (): Promise<LoreEntry[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "loreEntries"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LoreEntry, "id">) }));
};

/**
 * Entries for one book. Filtered server-side by bookId, then sorted by `order`
 * on the client so no composite index is required (entry counts stay small).
 */
export const getLoreEntries = async (bookId: string): Promise<LoreEntry[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "loreEntries"), where("bookId", "==", bookId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LoreEntry, "id">) }))
    .sort(byOrder);
};

/** Create (no id) or update (with id) a book. Returns the book id. */
export const upsertLoreBook = async (book: Omit<LoreBook, "id"> & { id?: string }) => {
  const { collection, doc, setDoc } = await import("firebase/firestore");
  const ref = book.id ? doc(db, "loreBooks", book.id) : doc(collection(db, "loreBooks"));
  const { id: _ignored, ...data } = book;
  await setDoc(ref, data, { merge: true });
  return ref.id;
};

/** Delete a book and every entry filed under it. */
export const deleteLoreBook = async (bookId: string) => {
  const { collection, deleteDoc, doc, getDocs, query, where } = await import(
    "firebase/firestore"
  );
  const entries = await getDocs(
    query(collection(db, "loreEntries"), where("bookId", "==", bookId))
  );
  await Promise.all(entries.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "loreBooks", bookId));
};

/** Create (no id) or update (with id) an entry. Returns the entry id. */
export const upsertLoreEntry = async (entry: Omit<LoreEntry, "id"> & { id?: string }) => {
  const { collection, doc, setDoc } = await import("firebase/firestore");
  const ref = entry.id ? doc(db, "loreEntries", entry.id) : doc(collection(db, "loreEntries"));
  const { id: _ignored, ...data } = entry;
  await setDoc(ref, data, { merge: true });
  return ref.id;
};

export const deleteLoreEntry = async (entryId: string) => {
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "loreEntries", entryId));
};
