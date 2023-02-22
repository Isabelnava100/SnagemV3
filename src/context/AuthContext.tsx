import {  createContext,  ReactNode,  useContext,  useEffect,  useState,} from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { LoadingOverlay } from "@mantine/core";
import { User, SpecificUser, AuthContextType } from "../components/types/typesUsed";

const getInfo = async (uid: string): Promise<SpecificUser> => {
  const user = await getDoc(doc(db, "users", uid));
  const userData = user.data();
  return {
    permissions: userData ? userData.permissions : "",
    badges: userData ? userData.badges : [],
  };
};

const AuthContext = createContext({} as AuthContextType);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>();
  const [pending, setPending] = useState<boolean>(true);

  useEffect(() => {
    const authConst = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const { uid, email, displayName } = user;
        const otherinfo = await getInfo(uid);
        setUser(prevState=>({
		  ...prevState,
          uid,
          email,
          displayName,
          otherinfo,
        }));
        setPending(false);
      } else {
          setPending(false);
      }
    });
    return () => authConst();
  }, [setUser,user]);


  if (pending) {
    return (
		<LoadingOverlay
        visible={pending}
        loader={
            <img
              src="https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy-compress.gif?alt=media&token=95a14be6-6495-43fd-a72a-a120f55e0bf8"
              alt="mew loading"
            />
        }
      />
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>		
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContextProvider };

export const UserAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};
