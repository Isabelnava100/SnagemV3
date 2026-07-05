import { db } from "../context/firebase";

/**
 * Admin-managed dashboard announcement banner. Stored at admin/announcements
 * (readable by all signed-in users, writable by Admin/ManageLists per rules).
 * Each save regenerates `id`, so "Mark as Read" resets when content changes.
 */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  active: boolean;
}

export const getAnnouncement = async (): Promise<Announcement | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "admin", "announcements"));
  const data = snap.data() as Announcement | undefined;
  return data?.id ? data : null;
};

export const saveAnnouncement = async (announcement: Announcement): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "admin", "announcements"), announcement);
};

/** Announcement ids this user dismissed (field on their own user doc). */
export const getReadAnnouncements = async (uid: string): Promise<string[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "users", uid))).data();
  return (data?.readAnnouncements as string[]) ?? [];
};

export const markAnnouncementRead = async (uid: string, announcementId: string): Promise<void> => {
  const { arrayUnion, doc, updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "users", uid), { readAnnouncements: arrayUnion(announcementId) });
};
