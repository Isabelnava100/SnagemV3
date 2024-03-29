import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, firebase } from "../../../context/firebase";
import { generatePassword } from "./Components";

export const registerUser = (
  email: string,
  pwCheck: string,
  application: string,
  gaiaName: string,
  username: string
) => {
  const pwClean = application && generatePassword();
  const password = pwCheck || pwClean;
  const where = application ? "NewUsers" : "users";
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const whereRef = doc(db, where, userCredential.user.uid);
      await setDoc(whereRef, {
        application,
        email: userCredential.user.email,
        gaiaName,
        username,
        permissions: "New",
        badges: [],
      });
      return userCredential.user;
    })
    .then(async (user) => {
      try {
        await updateProfile(user, {
          displayName: username,
        });
      } catch (err) {
        console.error(err);
      } finally {
        return Promise.resolve();
      }
    })
    .finally(() => {
      return "success";
    }) //sign in
    .catch((error: firebase.FirebaseError) => {
      return error.code;
    });
  return "success";
};

//https://docs.netlify.com/forms/setup/?_ga=2.101709441.1670044853.1675828635-1761029195.1675828635
