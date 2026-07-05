import { LoadingOverlay } from "@mantine/core";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
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
    capabilities: userData?.capabilities ?? [],
    badges: userData ? userData.badges : [],
    discordUID: userData ? userData.discordUID : "",
    isGaia: userData?.isGaia,
    avatar: userData?.avatar,
    username: userData?.username,
  };
};

const AuthContext = createContext({} as AuthContextType);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>();
  const [pending, setPending] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe exactly once: a [user] dependency here re-subscribes on every
    // setUser and loops onAuthStateChanged -> getInfo (a billed Firestore read) forever.
    const authConst = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const { uid, email, displayName } = firebaseUser;
          const { avatar, username, ...otherinfo } = await getInfo(uid);
          setUser({ uid, email, displayName, username, avatar, otherinfo });
          // Install the admin-configured XP curve for level displays.
          import("../queries/leveling").then((m) => m.loadActiveCurve());
        } else {
          setUser(undefined);
        }
      } catch (error) {
        // Profile read failed (offline/rules) but Firebase Auth IS signed in:
        // keep a minimal user so guards don't render a false logged-out state.
        if (firebaseUser) {
          const { uid, email, displayName } = firebaseUser;
          setUser((prev) => prev ?? { uid, email, displayName, username: displayName ?? "" });
        }
        console.error("Failed to load user profile", error);
      } finally {
        setPending(false);
      }
    });
    return () => authConst();
  }, []);

  const value = useMemo(() => ({ user, setUser }), [user]);

  if (pending) {
    return <LoadingOverlay visible={pending} loaderProps={{ children: <LoadingSpinner /> }} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContextProvider };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};
