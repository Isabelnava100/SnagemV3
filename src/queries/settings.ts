import { Badge, BadgeTypes } from "../Pages/User/Dashboard/Settings/Collections";
import { Settings } from "../components/types/typesUsed";

export const getSettings = async (uid: string) => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  // Default to {} so a missing user doc doesn't throw on destructure.
  const { settings } = ((await getDoc(doc(db, "users", uid))).data() ?? {}) as {
    settings?: Settings | null;
  };

  if (!settings) {
    return {};
  }

  return settings as Settings;
};

export const getBadges = async (uid: string) => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid, "bag", "badges"))).data() as Record<
    string,
    [BadgeTypes, string, boolean]
  >;
  if (!data) return { data: {}, formattedData: [] };
  const formattedData = Object.keys(data).map((key) => {
    const badge = data[key];
    return { label: badge[0], background: badge[1], enabled: badge[2] } satisfies Badge;
  });
  return { data, formattedData };
};

export const getEmojis = async (uid: string) => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid))).data();
  return (data ? data.emojis || [] : []) satisfies string[];
};

/**
 * Switch friend code, stored on the member's own users/{uid} doc (rules allow
 * self-edits outside the staff-only fields). Prefills the Colosseum tournament
 * register form and is editable from Dashboard -> Settings -> Notifications.
 */
export const getMyFriendCode = async (uid: string): Promise<string> => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  const snap = await getDoc(doc(db, "users", uid));
  return String(snap.data()?.friendCode ?? "");
};

export const saveFriendCode = async (uid: string, friendCode: string): Promise<void> => {
  const { doc, updateDoc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  await updateDoc(doc(db, "users", uid), { friendCode: friendCode.trim().slice(0, 40) });
};
