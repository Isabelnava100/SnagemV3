import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { User } from "../../../components/types/typesUsed";
import { getInfo } from "../../../context/AuthContext";
import { auth, db } from "../../../context/firebase";

export type SignInResult = "success" | "pending" | string;

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

  if (!otherinfo.username) {
    const pending = await getDoc(doc(db, "NewUsers", uid)).catch(() => null);
    await signOut(auth);
    return pending?.exists() ? "pending" : "error";
  }

  setUser({
    uid,
    email,
    displayName,
    otherinfo,
    username: otherinfo.username,
    avatar: otherinfo.avatar,
  });
  return "success";
};
