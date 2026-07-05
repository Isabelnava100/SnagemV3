import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, firebase } from "../../../context/firebase";
import { generatePassword } from "./Components";

export const registerUser = async (
  email: string,
  pwCheck: string,
  application: string,
  gaiaName: string,
  username: string
) => {
  const pwClean = application ? generatePassword() : "";
  const password = pwCheck || pwClean;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
      // Every signup lands in the NewUsers approval queue; an admin promotes the
      // doc to the "users" collection after review. Nothing writes to "users"
      // from the client, so permissions can't be self-assigned at registration.
      const whereRef = doc(db, "NewUsers", user.uid);
      await setDoc(whereRef, {
        application,
        email: user.email,
        gaiaName,
        username,
        permissions: "New",
        badges: [],
        // Join date, carried onto the user doc when an admin promotes them.
        joinedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      });
      
      await updateProfile(user, {
        displayName: username,
      });
    }
    
    return "success";
  } catch (error: any) {
    return error.code || "error";
  }
};
