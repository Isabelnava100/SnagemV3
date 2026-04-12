import { FirebaseError } from "@firebase/util";
import { browserLocalPersistence, browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
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
      await setPersistence(auth, browserLocalPersistence);
    } else {
      await setPersistence(auth, browserSessionPersistence);
    }
    
    const result = await signInWithEmailAndPassword(auth, email2, password);
    const { uid, email, displayName } = result.user;
    const otherinfo = await getInfo(uid);
    
    setUser({
      uid,
      email,
      displayName,
      otherinfo,
      username: otherinfo.username,
      avatar: otherinfo.avatar,
    });
    
    return "success";
  } catch (error: any) {
    if (error?.code) {
      return error.code;
    }
    return "error";
  }
};
