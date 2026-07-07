import { db } from "../context/firebase";

/** Today's Super Training Room session (see docs/COLOSSEUM_DATA.md). */
export interface TrainingSession {
  date?: string;
  postsLogged?: number;
  evoPts?: number;
  happinessPts?: number;
  startedAt?: { seconds: number };
  targetPokemonId?: string;
  partner?: boolean;
}

export interface RankingRow {
  id: string;
  username?: string;
  points?: number;
  wins?: number;
  losses?: number;
  /** Current run, e.g. "W6" or "L1". First char W/L drives the badge color. */
  streak?: string;
  /** Rank change since last update: positive up, negative down, 0/undefined even. */
  movement?: number;
}

export interface HallOfFameEntry {
  id: string;
  tournament_name: string;
  year?: number;
  winner?: string;
  team?: string[];
  order?: number;
}

export interface Tournament {
  id: string;
  name: string;
  game_generation?: string;
  format?: string;
  rules?: string;
  start_date?: { seconds: number };
  status?: "upcoming" | "open_signup" | "running" | "complete";
  prizes?: Record<string, string[]>;
  /** Max entrants; the featured card shows registered / capacity. */
  capacity?: number;
  order?: number;
}

/** One member's sign-up under tournaments/{id}/signups/{uid}. */
export interface TournamentSignup {
  id: string;
  username?: string;
  friendCode?: string;
  teamId?: string;
  teamName?: string;
  createdAt?: { seconds: number };
}

export const getTrainingSession = async (uid: string): Promise<TrainingSession> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid, "bag", "training_session"));
  return (snap.data() as TrainingSession) || {};
};

export const getRankings = async (): Promise<RankingRow[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "battle_rankings"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<RankingRow, "id">) }))
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
};

export const getHallOfFame = async (): Promise<HallOfFameEntry[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "hall_of_fame"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<HallOfFameEntry, "id">) }))
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.order ?? 0) - (b.order ?? 0));
};

export const getTournaments = async (): Promise<Tournament[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "tournaments"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Tournament, "id">) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

/** All sign-ups for a tournament (used for the registered count + own entry). */
export const getTournamentSignups = async (tournamentId: string): Promise<TournamentSignup[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "tournaments", tournamentId, "signups"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TournamentSignup, "id">) }));
};

/** Register the signed-in member for a tournament (writes their own signup doc). */
export const registerForTournament = async (args: {
  tournamentId: string;
  uid: string;
  username?: string;
  friendCode: string;
  teamId: string;
  teamName?: string;
}): Promise<void> => {
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  await setDoc(doc(db, "tournaments", args.tournamentId, "signups", args.uid), {
    username: args.username ?? "",
    friendCode: args.friendCode,
    teamId: args.teamId,
    teamName: args.teamName ?? "",
    createdAt: serverTimestamp(),
  });
};

/** Withdraw the signed-in member's sign-up. */
export const withdrawFromTournament = async (tournamentId: string, uid: string): Promise<void> => {
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "tournaments", tournamentId, "signups", uid));
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

/** Log one training post; awards evolution + happiness points to the pokemon. */
export const logTrainingPost = (pokemonId: string, partner: boolean) =>
  call<{ ok: boolean; awardedEvo: number; awardedHappiness: number; session: TrainingSession }>(
    "logTrainingPost",
    { pokemonId, partner }
  );

/** Clear today's training session. */
export const resetTrainingSession = () => call<{ ok: boolean }>("resetTrainingSession", {});
