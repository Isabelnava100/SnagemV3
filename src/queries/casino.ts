import { getDb } from "../context/firebase";
import { call } from "./_callable";

/** Casino config (exchange rate + game table). See docs/CASINO_DATA.md. */
export interface CasinoConfig {
  exchangeRate?: number; // Snag Coins per 1 Gengar Token (buy)
  /** Entries needed before staff get pinged to run the draw (default 5). */
  lottoMinTickets?: number;
}

/** Mirrors the Cloud Function default when the config doc leaves it unset. */
export const DEFAULT_LOTTO_MIN_TICKETS = 5;

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
  const db = await getDb();
  return ((await getDoc(doc(db, "admin", "casino_config"))).data() as CasinoConfig) || {};
};

export const getLottoState = async (): Promise<LottoState> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  return ((await getDoc(doc(db, "casino", "lotto"))).data() as LottoState) || {};
};

export const getMyCasino = async (uid: string): Promise<MyCasino> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  return ((await getDoc(doc(db, "users", uid, "bag", "casino"))).data() as MyCasino) || {};
};


/** Exchange between Snag Coins and Gengar Tokens. */
export const exchangeTokens = (direction: "buy" | "sell", amount: number) =>
  call<{ ok: boolean; gengarcoin: number; pokecoin: number }>("exchangeTokens", { direction, amount });

export type CasinoGame =
  | "hexRoulette"
  | "dreamDice"
  | "paybackPyramid"
  | "spookySlots"
  | "ghostFlip";

/**
 * Play an instant casino game. pick: number (roulette 1-36, dice total 2-12,
 * ghostFlip card 0-2), "even"/"odd" (pyramid), or omitted (spookySlots).
 */
export const playGame = (
  game: CasinoGame,
  bet: number,
  pick?: number | "even" | "odd"
) =>
  call<{ ok: boolean; win: boolean; roll: number | number[]; payout: number; gengarcoin: number }>(
    "playCasinoGame",
    { game, bet, pick }
  );

/** Haunter's High-Low: server-authoritative ladder state. */
export interface HighLowResult {
  ok: boolean;
  card: number;
  pot: number;
  calls: number;
  active: boolean;
  correct?: boolean;
  cashedOut?: boolean;
  gengarcoin?: number;
}

/** Deal a fresh High-Low hand, staking `bet` Gengar Tokens (1-5). */
export const startHighLow = (bet: number) =>
  call<HighLowResult>("startHighLow", { bet });

/** Call the next card higher or lower. Correct doubles the pot; wrong loses it. */
export const guessHighLow = (direction: "higher" | "lower") =>
  call<HighLowResult>("guessHighLow", { direction });

/** Cash out the current High-Low pot and end the hand. */
export const cashoutHighLow = () =>
  call<{ ok: boolean; pot: number; active: boolean; gengarcoin: number }>("cashoutHighLow", {});

/** Buy a Shadow Lotto ticket (1 Gengar Token) for a number 1-50. */
export const buyLottoTicket = (number: number) =>
  call<{ ok: boolean; number: number; jackpot: number }>("buyLottoTicket", { number });

/** Draw the Shadow Lotto winner (graders/admins only). Splits the pot and resets it. */
export const drawLotto = () =>
  call<{ ok: boolean; drawn: number; winners: number; jackpot: number; share: number }>(
    "drawLotto",
    {}
  );
