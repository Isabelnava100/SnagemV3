import { FirebaseError } from "@firebase/util";
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { User } from "../../../components/types/typesUsed";
import { getInfo } from "../../../context/AuthContext";
import { auth } from "../../../context/firebase";

export const handleSignIn = async (
  email2: string,
  password: string,
  remember: boolean,
  setUser: (arg0: User) => void
) => {
  try {
    if (remember) {
      //localStorage.setItem('token', token);
      await setPersistence(auth, browserLocalPersistence).then(async () => {
        await signInWithEmailAndPassword(auth, email2, password).then(async (result) => {
          const { uid, email, displayName } = result.user;
          try {
            const otherinfo = await getInfo(uid);
            setUser({
              uid,
              email,
              displayName,
              otherinfo,
              username: otherinfo.username,
            }); //set user
          } finally {
            return true;
          }
        }); //sign in
      });
    } else {
      await signInWithEmailAndPassword(auth, email2, password).then(async (result) => {
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
        } finally {
          return true;
        }
      }); //sign in
    }
  } catch (error: unknown) {
    if (error instanceof FirebaseError) {
      return error.code;
    }
  }
}; //sign in form
