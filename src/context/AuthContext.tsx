import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthContextType, SpecificUser, User } from "../components/types/typesUsed";

// return the user avatar and username from here
export const getInfo = async (
  uid: string
): Promise<SpecificUser & { avatar?: string; username: string; exists: boolean }> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const { getDb } = await import("./firebase");
  const db = await getDb();

  const user = await getDoc(doc(db, "users", uid));
  const userData = user.data();

  return {
    // `exists` distinguishes "approved/imported member" (has a users doc, even if
    // the doc is missing a username) from "no profile at all". The login gate keys
    // on this, not on username, so legacy/Gaia-imported members whose docs predate
    // the username field are not force-signed-out. See docs/AUTH.md.
    exists: user.exists(),
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
    // The firebase app/auth chunk is deliberately NOT in the boot graph (it
    // would delay first paint on public pages): it dynamic-imports here after
    // mount, then the single auth subscription attaches. Do not add a [user]
    // dependency: that re-subscribes on every setUser and loops
    // onAuthStateChanged -> getInfo (a billed Firestore read) forever.
    let unsubscribe = () => undefined as void;
    let cancelled = false;
    import("./firebase").then(({ auth }) => {
      if (cancelled) return;
      unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const { uid, email, displayName, emailVerified } = firebaseUser;
          const { avatar, username, exists, ...otherinfo } = await getInfo(uid);
          // Fall back to the auth displayName so imported members with a doc but no
          // username field still render a name instead of a blank.
          // `profileExists` + `emailVerified` are what the access gate reads to
          // decide whether this account has cleared both approval steps.
          setUser({
            uid,
            email,
            displayName,
            username: username || displayName || "",
            avatar,
            otherinfo,
            profileExists: exists,
            emailVerified,
          });
          // Install the admin-configured XP curve for level displays.
          import("../queries/leveling").then((m) => m.loadActiveCurve());
        } else {
          setUser(undefined);
        }
      } catch (error) {
        // Profile read failed (offline/rules) but Firebase Auth IS signed in:
        // keep a minimal user so guards don't render a false logged-out state.
        if (firebaseUser) {
          const { uid, email, displayName, emailVerified } = firebaseUser;
          // profileExists stays undefined here on purpose: the read failed, so
          // the access gate must not treat that as "not approved".
          setUser((prev) => prev ?? { uid, email, displayName, username: displayName ?? "", emailVerified });
        }
        console.error("Failed to load user profile", error);
      } finally {
        setPending(false);
      }
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, setUser, pending }), [user, pending]);

  // Children render immediately, even while the first auth emission is still
  // pending: gating the whole tree on auth pushed the marketing homepage's
  // LCP past a second for no benefit (public pages render the same logged
  // out). Only Protect waits on `pending` now.
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
