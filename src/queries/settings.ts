import { Settings } from "../components/types/typesUsed";
import { db } from "../context/firebase";

export const getSettings = async (uid: string) => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { settings } = (await getDoc(doc(db, "users", uid))).data() as {
    settings: Settings | null;
  };

  if (!settings) {
    return {};
  }

  return settings as Settings;
};
