import { User } from "../components/types/typesUsed";

// Actions worth an audit trail. Extend as features land.
export type AuditAction =
  | "post.edit"
  | "post.delete"
  | "items.grant"
  | "currency.grant"
  | "rewards.finalize"
  | "import.approve"
  | "badge.removeFromAll"
  | "user.role_change"
  | "user.capability_change"
  | "lists.edit"
  | "announcement.edit"
  | "mysterybox.edit"
  | "badge.edit"
  | "badge.delete"
  | "seo.edit"
  | "thread.close"
  | "event.host";

export type AuditEntry = {
  action: AuditAction | string;
  actorUid: string;
  actorName: string;
  targetPath?: string; // firestore path or id the action touched
  details?: Record<string, unknown>;
};

// Human-readable summary title per action, shown as the log row heading.
const ACTION_TITLES: Record<string, string> = {
  "post.edit": "Edited a post",
  "post.delete": "Deleted a post",
  "items.grant": "Granted items",
  "currency.grant": "Granted currency",
  "rewards.finalize": "Finalized thread rewards",
  "import.approve": "Approved a member import",
  "badge.removeFromAll": "Removed a badge from all members",
  "user.role_change": "Changed a member's role",
  "user.capability_change": "Changed a member's permissions",
  "lists.edit": "Edited an encounter list",
  "announcement.edit": "Updated the announcement",
  "mysterybox.edit": "Saved a mystery box",
  "badge.edit": "Saved a badge",
  "badge.delete": "Deleted a badge",
  "seo.edit": "Updated SEO settings",
  "thread.close": "Closed a thread",
  "event.host": "Hosted an event",
};

export const auditTitle = (action: string): string => ACTION_TITLES[action] ?? action;

export interface AuditRow extends AuditEntry {
  id: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

/** Most recent audit rows, newest first. Readable by any staff member. */
export async function getAuditLogs(max = 60): Promise<AuditRow[]> {
  const { collection, getDocs, query, orderBy, limit } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  const snap = await getDocs(
    query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as AuditEntry & { createdAt?: { seconds: number; nanoseconds: number } }),
  }));
}

// Append an audit record to the `auditLogs` collection.
//
// SECURITY: this is a client-side write, so it is only trustworthy to the extent
// Firestore rules make `auditLogs` append-only (create allowed, update/delete
// denied, actorUid pinned to request.auth.uid). For a tamper-proof trail, move
// sensitive writes behind a Cloud Function that logs server-side. See
// docs/PERMISSIONS.md. Never let a logging failure block the user's action.
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("../context/firebase");
    await addDoc(collection(db, "auditLogs"), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}

export function actorFrom(user: User | undefined): { actorUid: string; actorName: string } {
  return {
    actorUid: user?.uid ?? "unknown",
    actorName: user?.username || user?.displayName || "unknown",
  };
}
