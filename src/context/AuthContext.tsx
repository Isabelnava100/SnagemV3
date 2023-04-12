import { LoadingOverlay } from "@mantine/core";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import LoadingSpinner from "../components/navigation/loading";
import { AuthContextType, SpecificUser, User } from "../components/types/typesUsed";
import { auth, db } from "./firebase";

const getInfo = async (uid: string): Promise<SpecificUser> => {
  const { doc, getDoc } = await import("firebase/firestore");

  const user = await getDoc(doc(db, "users", uid));
  const userData = user.data();
  return {
    permissions: userData ? userData.permissions : "",
    badges: userData ? userData.badges : [],
    discordUID: userData ? userData.discordUID : "",
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
        setUser((prevState) => ({
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
  }, [setUser, user]);

  if (pending) {
    return <LoadingOverlay visible={pending} loader={<LoadingSpinner />} />;
  }

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export { AuthContextProvider };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};
