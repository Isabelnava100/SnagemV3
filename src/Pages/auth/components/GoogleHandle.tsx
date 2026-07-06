import { GoogleAuthProvider, deleteUser, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Dispatch, SetStateAction } from "react";
import { User } from "../../../components/types/typesUsed";
import { getInfo } from "../../../context/AuthContext";
import { auth, db } from "../../../context/firebase";

export type GoogleSignInResult = "success" | "pending" | "no-account" | string;

// Google sign-in is only allowed for existing members: the account must already
// be approved (doc in "users"). Firebase links the Google credential to the
// existing email/password account when the emails match, so the uid is stable.
export const handleGoogleSignIn = async (
  setUser: Dispatch<SetStateAction<User | undefined>>
): Promise<GoogleSignInResult> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const { uid, email, displayName } = result.user;

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
  } catch (error: any) {
    return error?.code || "error";
  }
};
