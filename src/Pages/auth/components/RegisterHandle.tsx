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
  const where = application ? "NewUsers" : "users";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (user) {
      const whereRef = doc(db, where, user.uid);
      await setDoc(whereRef, {
        application,
        email: user.email,
        gaiaName,
        username,
        permissions: "New",
        badges: [],
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
