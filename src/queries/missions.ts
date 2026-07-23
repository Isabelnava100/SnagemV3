import { getDb } from "../context/firebase";
import { call } from "./_callable";

/** A mission brief from the missions catalog (see docs/MISSIONS_DATA.md). */
export interface Mission {
  id: string;
  title: string;
  location?: string;
  story?: string;
  objective?: string | string[];
  opposition?: string | string[];
  pokemon_note?: string;
  pokemon_reward?: { kind: "snag" | "catch" | "recruit" | "egg" | "none"; count?: number; note?: string };
  coins?: number;
  special_item?: string;
  tier?: "Standard" | "Master" | "Exceptional" | "Story";
  emblem_eligible?: boolean;
  /** Grader tip shown in the brief's Bonus box; optional narrative hook. */
  bonus?: string;
  difficulty?: string;
  image?: string;
  active?: boolean;
  times_taken?: number;
  order?: number;
  /** Default encounter pool for this mission (pokemon slugs, seeded). */
  encounters?: string[];
  /** Set foes from the briefing; beating them is the minimum for the grade. */
  requiredEncounters?: string[];
  /** admin/pokemon_lists entry attached to auto-created threads. */
  encounterListId?: string;
  encounterMode?: "choose" | "roll";
  encounterLimit?: number;
}

export const getMissions = async (): Promise<Mission[]> => {
  const db = await getDb();
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "missions"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Mission, "id">) }))
    .filter((m) => m.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
};

export const getMission = async (id: string): Promise<Mission | null> => {
  const db = await getDb();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "missions", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Mission, "id">) }) : null;
};

/**
 * Picks up a mission: the server creates the Quests thread with the briefing
 * as its first post and the mission's encounter list attached, then returns
 * the new thread id.
 */
export const pickUpMission = (missionId: string) =>
  call<{ threadId: string }>("pickUpMission", { missionId });

/** Grader action: approve/reject a submission and grant its rewards. */
export const gradeMission = (
  submissionId: string,
  approve: boolean,
  awards?: { coins?: number; emblemPiece?: boolean; note?: string }
) => call<{ ok: boolean }>("gradeMission", { submissionId, approve, awards });
