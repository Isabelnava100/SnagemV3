import {
  GoogleAuthProvider,
  deleteUser,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { Dispatch, SetStateAction } from "react";
import { User } from "../../../components/types/typesUsed";
import { getInfo } from "../../../context/AuthContext";
import { auth, getDb } from "../../../context/firebase";

export type GoogleSignInResult = "success" | "pending" | "no-account" | "redirect" | string;

/**
 * The signed-in address, kept alongside the result so the caller can name it on
 * the access gate. The Google session is signed back out for a pending
 * applicant, so the email is not readable from auth afterwards.
 */
export let lastGoogleEmail = "";

// Google sign-in is only allowed for existing members: the account must already
// be approved (doc in "users"). Firebase links the Google credential to the
// existing email/password account when the emails match, so the uid is stable.
// Shared by the popup and redirect paths.
const processGoogleUser = async (
  result: UserCredential,
  setUser: Dispatch<SetStateAction<User | undefined>>
): Promise<GoogleSignInResult> => {
  const { uid, email, displayName } = result.user;
  lastGoogleEmail = email ?? "";

  const otherinfo = await getInfo(uid);
  // Gate on the users doc existing, not on username (imported members may lack it).
  if (otherinfo.exists) {
    setUser({
      uid,
      email,
      displayName,
      otherinfo,
      username: otherinfo.username || displayName || "",
      avatar: otherinfo.avatar,
    });
    return "success";
  }

  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const pendingDoc = await getDoc(doc(db, "NewUsers", uid));
  if (pendingDoc.exists()) {
    await signOut(auth);
    setUser(undefined);
    return "pending";
  }

  // No application on file. If the popup just created this auth account,
  // delete it so the email isn't blocked for a future registration.
  const { creationTime, lastSignInTime } = result.user.metadata;
  if (creationTime && creationTime === lastSignInTime) {
    await deleteUser(result.user);
  } else {
    await signOut(auth);
  }
  setUser(undefined);
  return "no-account";
};

// Popup failures that mean the popup handshake itself cannot complete in this
// browser (third-party storage blocked, popup killed by an extension). Chrome's
// third-party cookie blocking surfaces as auth/internal-error; the fix is a
// full-page redirect, which never touches cross-site storage.
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/internal-error",
  "auth/web-storage-unsupported",
  "auth/popup-blocked",
]);

export const handleGoogleSignIn = async (
  setUser: Dispatch<SetStateAction<User | undefined>>
): Promise<GoogleSignInResult> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return await processGoogleUser(result, setUser);
  } catch (error: any) {
    // Logged as well as returned: the popup failures (blocked popup, bad
    // domain, one-account-per-email) are otherwise invisible from a screenshot.
    console.error("Google sign-in failed", error?.code, error);
    const code: string = error?.code || "error";
    if (REDIRECT_FALLBACK_CODES.has(code)) {
      // Navigates away; resolveGoogleRedirect picks the result up on return.
      await signInWithRedirect(auth, new GoogleAuthProvider());
      return "redirect";
    }
    return code;
  }
};

// Completes a redirect sign-in after Google sends the browser back. Returns
// null when the page load is not a redirect return.
export const resolveGoogleRedirect = async (
  setUser: Dispatch<SetStateAction<User | undefined>>
): Promise<GoogleSignInResult | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return await processGoogleUser(result, setUser);
  } catch (error: any) {
    console.error("Google redirect sign-in failed", error?.code, error);
    return error?.code || "error";
  }
};
