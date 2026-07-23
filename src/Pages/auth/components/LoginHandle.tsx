import { sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { User } from "../../../components/types/typesUsed";
import { getInfo } from "../../../context/AuthContext";
import { auth, getDb } from "../../../context/firebase";

export type SignInResult = "success" | "pending" | "unlinked" | string;

// Firebase's default browserLocalPersistence is shared across tabs and survives
// restarts; per-tab session persistence made every new tab look logged out.
export const handleSignIn = async (
  email2: string,
  password: string,
  setUser: (arg0: User) => void
): Promise<SignInResult> => {
  let result;
  try {
    result = await signInWithEmailAndPassword(auth, email2, password);
  } catch (error: any) {
    return error?.code || "error";
  }

  const { uid, email, displayName } = result.user;

  // Hard gate: unverified email, no dashboard. Google sign-in sets emailVerified
  // itself, so this only stops password accounts that never opened their link.
  // Sign back out so no session persists; the login page offers a resend path.
  if (!result.user.emailVerified) {
    await signOut(auth);
    return "unverified";
  }

  // Approval gate: only accounts promoted to the "users" collection may sign in.
  // Everyone else is still in the NewUsers queue awaiting admin approval.
  let otherinfo;
  try {
    otherinfo = await getInfo(uid);
  } catch {
    // Auth succeeded but the profile read failed (offline/rules). Don't report a
    // false failure; sign in with minimal data and let AuthContext retry.
    setUser({ uid, email, displayName, username: displayName ?? "" });
    return "success";
  }

  // Gate on the existence of the users doc, NOT on the username field. Approved and
  // legacy/Gaia-imported members have a users doc (some imported ones lack a username);
  // they must be let in. Only accounts with NO users doc are still applicants/orphans.
  if (!otherinfo.exists) {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getDb();
    const pending = await getDoc(doc(db, "NewUsers", uid)).catch(() => null);
    await signOut(auth);
    // "pending": application still in the approval queue.
    // "unlinked": authenticated but no member profile (e.g. an imported account whose
    // users doc lives elsewhere / was never consolidated). Do not loop silently.
    return pending?.exists() ? "pending" : "unlinked";
  }

  setUser({
    uid,
    email,
    displayName,
    otherinfo,
    username: otherinfo.username || displayName || "",
    avatar: otherinfo.avatar,
  });
  return "success";
};

// Resend needs a signed-in user, but the gate above signs unverified users out.
// So this re-authenticates with the credentials still on the login form, sends
// the link, and signs straight back out; the caller keeps the "verify your
// email" screen up so the transient session never reaches the dashboard.
export const resendVerificationEmail = async (
  email: string,
  password: string
): Promise<"sent" | string> => {
  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    return error?.code || "error";
  }
  try {
    if (!cred.user.emailVerified) await sendEmailVerification(cred.user);
    return "sent";
  } catch (error: any) {
    return error?.code || "error";
  } finally {
    await signOut(auth).catch(() => undefined);
  }
};
