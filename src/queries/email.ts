import { getDb } from "../context/firebase";

// -- Admin email config (adminSecrets/email) ---------------------------------
// Powers approval/rejection emails from the approveNewUser/rejectNewUser
// callables (SendGrid). Silent no-op server-side until the key is saved.

export interface EmailConfig {
  sendgridApiKey: string;
  fromEmail: string;
  fromName: string;
}

export const getEmailConfig = async (): Promise<EmailConfig> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "adminSecrets", "email"))).data() ?? {};
  return {
    sendgridApiKey: String(data.sendgridApiKey ?? ""),
    fromEmail: String(data.fromEmail ?? ""),
    fromName: String(data.fromName ?? ""),
  };
};

export const saveEmailConfig = async (config: EmailConfig): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  const db = await getDb();
  await setDoc(doc(db, "adminSecrets", "email"), config, { merge: true });
};

// -- Outgoing notice log (mailOutbox) ----------------------------------------
// Every approval/rejection notice is recorded here by the server. When no
// provider is configured (or the key is dead) the notice is stored unsent, so
// staff can send it by hand instead of the applicant hearing nothing.

export interface MailOutboxItem {
  id: string;
  to: string;
  subject: string;
  html: string;
  status: "sent" | "queued" | "failed" | "handled";
  detail?: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

/**
 * The most recent notices, newest first. Filtering happens in memory: an
 * inequality on `status` plus an orderBy would need a composite index for a
 * list this small.
 */
export const getMailOutbox = async (max = 50): Promise<MailOutboxItem[]> => {
  const { collection, getDocs, limit, orderBy, query } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(
    query(collection(db, "mailOutbox"), orderBy("createdAt", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MailOutboxItem, "id">) }));
};

/** Mark an unsent notice as dealt with (staff sent it themselves). */
export const markMailHandled = async (id: string): Promise<void> => {
  const { doc, updateDoc } = await import("firebase/firestore");
  const db = await getDb();
  await updateDoc(doc(db, "mailOutbox", id), { status: "handled" });
};

/** Drop a notice from the log entirely. */
export const deleteMailItem = async (id: string): Promise<void> => {
  const { deleteDoc, doc } = await import("firebase/firestore");
  const db = await getDb();
  await deleteDoc(doc(db, "mailOutbox", id));
};
