import { db } from "../context/firebase";

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
  difficulty?: string;
  image?: string;
  active?: boolean;
  times_taken?: number;
  order?: number;
}

export const getMissions = async (): Promise<Mission[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "missions"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Mission, "id">) }))
    .filter((m) => m.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

/** Submit a completed mission for grading (creates a pending submission). */
export const submitMission = (missionId: string, threadLink: string) =>
  call<{ ok: boolean; id: string }>("submitMission", { missionId, threadLink });

/** Grader action: approve/reject a submission and grant its rewards. */
export const gradeMission = (
  submissionId: string,
  approve: boolean,
  awards?: { coins?: number; emblemPiece?: boolean; note?: string }
) => call<{ ok: boolean }>("gradeMission", { submissionId, approve, awards });
