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
  /** Epoch ms the announcement was last sent (for the history log). */
  savedAt?: number;
}

/**
 * The admin/announcements doc: the live announcement fields (what the
 * dashboard banner reads) plus a `history` log of everything ever sent so
 * admins can review and delete/cancel past announcements.
 */
interface AnnouncementDoc extends Announcement {
  history?: Announcement[];
}

/** Cap the stored history so the single doc can't grow unbounded. */
const HISTORY_LIMIT = 50;

/** Strip the internal history field before handing back the live banner. */
const stripHistory = (data: AnnouncementDoc): Announcement => {
  const { history: _history, ...announcement } = data;
  return announcement;
};

export const getAnnouncement = async (): Promise<Announcement | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "admin", "announcements"));
  const data = snap.data() as AnnouncementDoc | undefined;
  return data?.id ? stripHistory(data) : null;
};

/** All previously sent announcements, newest first. */
export const getAnnouncementHistory = async (): Promise<Announcement[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "admin", "announcements"));
  const data = snap.data() as AnnouncementDoc | undefined;
  return data?.history ?? [];
};

export const saveAnnouncement = async (announcement: Announcement): Promise<void> => {
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(db, "admin", "announcements");
  const existing = (await getDoc(ref)).data() as AnnouncementDoc | undefined;
  const stamped: Announcement = { ...announcement, savedAt: announcement.savedAt ?? Date.now() };
  // Prepend the new send; drop any prior entry with the same id (re-saves).
  const history = [stamped, ...(existing?.history ?? []).filter((h) => h.id !== stamped.id)].slice(
    0,
    HISTORY_LIMIT
  );
  await setDoc(ref, { ...stamped, history });
};

/**
 * Remove an announcement from the history log. If it's the one currently live
 * on dashboards, the banner is cleared too (delete doubles as "cancel").
 */
export const deleteAnnouncement = async (id: string): Promise<void> => {
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(db, "admin", "announcements");
  const existing = (await getDoc(ref)).data() as AnnouncementDoc | undefined;
  if (!existing) return;
  const history = (existing.history ?? []).filter((h) => h.id !== id);
  const isLive = existing.id === id;
  const base: Announcement = isLive
    ? { id: "", title: "", body: "", ctaLabel: "", ctaUrl: "", active: false }
    : stripHistory(existing);
  await setDoc(ref, { ...base, history });
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

/**
 * The active announcement's id when this member has not read it yet, else
 * null. Feeds the nav Alerts red dot.
 */
export const getUnseenAnnouncement = async (uid: string): Promise<string | null> => {
  const announcement = await getAnnouncement();
  if (!announcement?.active || !announcement.id) return null;
  const read = await getReadAnnouncements(uid);
  return read.includes(announcement.id) ? null : announcement.id;
};
