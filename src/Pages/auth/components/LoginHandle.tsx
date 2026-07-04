import { signInWithEmailAndPassword } from "firebase/auth";
import { User } from "../../../components/types/typesUsed";
import { getInfo } from "../../../context/AuthContext";
import { auth } from "../../../context/firebase";

// Firebase's default browserLocalPersistence is shared across tabs and survives
// restarts — per-tab session persistence made every new tab look logged out.
export const handleSignIn = async (
  email2: string,
  password: string,
  setUser: (arg0: User) => void
) => {
  let result;
  try {
    result = await signInWithEmailAndPassword(auth, email2, password);
  } catch (error: any) {
    return error?.code || "error";
  }

  // Auth succeeded. A failed profile read must not report the login as failed —
  // fall back to minimal user data; AuthContext refreshes the profile on next load.
  const { uid, email, displayName } = result.user;
  try {
    const otherinfo = await getInfo(uid);
    setUser({
      uid,
      email,
      displayName,
      otherinfo,
      username: otherinfo.username,
      avatar: otherinfo.avatar,
    });
  } catch {
    setUser({ uid, email, displayName, username: displayName ?? "" });
  }

  return "success";
};
