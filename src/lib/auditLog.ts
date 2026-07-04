import { User } from "../components/types/typesUsed";

// Actions worth an audit trail. Extend as features land (post editing, role
// changes, event hosting, etc.).
export type AuditAction =
  | "post.edit"
  | "post.delete"
  | "items.grant"
  | "user.role_change"
  | "user.capability_change"
  | "event.host";

export type AuditEntry = {
  action: AuditAction;
  actorUid: string;
  actorName: string;
  targetPath?: string; // firestore path or id the action touched
  details?: Record<string, unknown>;
};

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
