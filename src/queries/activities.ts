import { db } from "../context/firebase";

/**
 * The Snag List: weekly activities checklist. State lives at
 * users/{uid}/bag/snaglist and is written ONLY by the Cloud Functions (the
 * gameplay callables mark tasks; claimSnagBox opens the weekly box), so
 * progress and the streak are tamper-proof.
 */

export type SnagTask = "battle" | "casino" | "post" | "catch" | "activity" | "mall";
export const SNAG_TASKS: SnagTask[] = ["battle", "casino", "post", "catch", "activity", "mall"];

export interface SnagList {
  weekId?: string;
  tasks?: Partial<Record<SnagTask, boolean>>;
  /** Consecutive fully-completed weeks (stamped when the sixth task lands). */
  streak?: number;
  completedWeekId?: string;
  boxClaimed?: boolean;
  boxChoice?: "random" | "currency" | "egg" | null;
}

/** Monday-anchored UTC week id, mirrors the Cloud Function. */
export const currentWeekId = (): string => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return d.toISOString().slice(0, 10);
};

/** Time left until the next Monday 00:00 UTC reset, as "Xd Yh" / "Yh Zm". */
export const resetCountdown = (): string => {
  const now = new Date();
  const monday = new Date(`${currentWeekId()}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + 7);
  const mins = Math.max(0, Math.floor((monday.getTime() - now.getTime()) / 60_000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins % 60}m`;
};

export const getSnagList = async (uid: string): Promise<SnagList> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "bag", "snaglist"));
  return (snap.data() as SnagList) || {};
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

/** Open the weekly Mystery Box (all six tasks required, once per week). */
export const claimSnagBox = (choice: "random" | "currency" | "egg") =>
  call<{ ok: boolean; reward: string }>("claimSnagBox", { choice });
