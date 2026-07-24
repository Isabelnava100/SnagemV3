import { getDb } from "../context/firebase";
import { DEFAULT_XP_CURVE, MAX_LEVEL, setActiveCurve } from "../lib/leveling";

/**
 * Admin-editable XP-per-level table. Stored at admin/leveling as
 * { curve: number[] } where index L is the cumulative XP needed to REACH level
 * L (curve[1] === 0). Falls back to DEFAULT_XP_CURVE when unset.
 */

export const getLevelingCurve = async (): Promise<number[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDoc(doc(db, "admin", "leveling"));
  const stored = snap.data()?.curve as number[] | undefined;
  return stored && stored.length > 1 ? stored : DEFAULT_XP_CURVE;
};

export const saveLevelingCurve = async (curve: number[]): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  const db = await getDb();
  // Normalize: level 1 is always 0, values are non-decreasing integers.
  const clean = [0, 0];
  for (let l = 2; l <= MAX_LEVEL; l++) {
    const v = Math.max(clean[l - 1] ?? 0, Math.round(Number(curve[l]) || 0));
    clean[l] = v;
  }
  await setDoc(doc(db, "admin", "leveling"), { curve: clean }, { merge: true });
};

/** Load the admin curve and install it as the app's active curve. */
export const loadActiveCurve = async (): Promise<void> => {
  try {
    setActiveCurve(await getLevelingCurve());
  } catch {
    /* keep the default curve on any read failure */
  }
};
