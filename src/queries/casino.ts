import { db } from "../context/firebase";

/** Casino config (exchange rate + game table). See docs/CASINO_DATA.md. */
export interface CasinoConfig {
  exchangeRate?: number; // Snag Coins per 1 Gengar Token (buy)
}

export interface LottoState {
  jackpot?: number;
  drawNumber?: number | null;
  weekId?: string;
  ticketCount?: number;
}

/** A member's casino state (current lotto ticket), at users/{uid}/bag/casino. */
export interface MyCasino {
  lottoNumber?: number;
  lottoWeekId?: string;
}

export const getCasinoConfig = async (): Promise<CasinoConfig> => {
  const { doc, getDoc } = await import("firebase/firestore");
  return ((await getDoc(doc(db, "admin", "casino_config"))).data() as CasinoConfig) || {};
};

export const getLottoState = async (): Promise<LottoState> => {
  const { doc, getDoc } = await import("firebase/firestore");
  return ((await getDoc(doc(db, "casino", "lotto"))).data() as LottoState) || {};
};

export const getMyCasino = async (uid: string): Promise<MyCasino> => {
  const { doc, getDoc } = await import("firebase/firestore");
  return ((await getDoc(doc(db, "users", uid, "bag", "casino"))).data() as MyCasino) || {};
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

/** Exchange between Snag Coins and Gengar Tokens. */
export const exchangeTokens = (direction: "buy" | "sell", amount: number) =>
  call<{ ok: boolean; gengarcoin: number; pokecoin: number }>("exchangeTokens", { direction, amount });

export type CasinoGame = "hexRoulette" | "dreamDice" | "paybackPyramid";

/** Play an instant casino game. pick: number (roulette 1-36, dice total 2-12) or "even"/"odd" (pyramid). */
export const playGame = (game: CasinoGame, bet: number, pick: number | "even" | "odd") =>
  call<{ ok: boolean; win: boolean; roll: number | number[]; payout: number; gengarcoin: number }>(
    "playCasinoGame",
    { game, bet, pick }
  );

/** Buy a Shadow Lotto ticket (1 Gengar Token) for a number 1-50. */
export const buyLottoTicket = (number: number) =>
  call<{ ok: boolean; number: number; jackpot: number }>("buyLottoTicket", { number });
