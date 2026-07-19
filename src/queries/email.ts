import { db } from "../context/firebase";

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
  const data = (await getDoc(doc(db, "adminSecrets", "email"))).data() ?? {};
  return {
    sendgridApiKey: String(data.sendgridApiKey ?? ""),
    fromEmail: String(data.fromEmail ?? ""),
    fromName: String(data.fromName ?? ""),
  };
};

export const saveEmailConfig = async (config: EmailConfig): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "adminSecrets", "email"), config, { merge: true });
};
