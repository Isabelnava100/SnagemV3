import { LoadingOverlay } from "@mantine/core";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import LoadingSpinner from "../components/navigation/loading";
import { AuthContextType, SpecificUser, User } from "../components/types/typesUsed";
import { auth, db } from "./firebase";

// return the user avatar and username from here
export const getInfo = async (
  uid: string
): Promise<SpecificUser & { avatar?: string; username: string }> => {
  const { doc, getDoc } = await import("firebase/firestore");

  const user = await getDoc(doc(db, "users", uid));
  const userData = user.data();

  return {
    permissions: userData ? userData.permissions : "",
    badges: userData ? userData.badges : [],
    discordUID: userData ? userData.discordUID : "",
    avatar: userData?.avatar,
    username: userData?.username,
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
        const { avatar, username, ...otherinfo } = await getInfo(uid);
        setUser((prevState) => ({
          ...prevState,
          uid,
          email,
          displayName,
          username,
          // return the user avatar
          avatar,
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
