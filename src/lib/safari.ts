/**
 * Safari Contest: shared model + catch math (client side).
 *
 * A Safari Contest is a forum Event where players hunt star-tiered wild Pokemon.
 * Each turn (post) a player can FIGHT the wild Pokemon (wear its health down,
 * like a boss battle), FEED it a berry/food item (nudge the catch rate up), or
 * THROW A BALL (a percentage capture roll). Every fight/feed turn also carries a
 * small chance the Pokemon runs off, ending that encounter.
 *
 * The rates, pools and scaling below are the launch defaults, editable per
 * contest in Admin -> Manage -> Safari Contest. The server mirrors this math in
 * functions/src/index.ts (functions cannot import from src); keep them in sync.
 */

export type SafariStar = 1 | 2 | 3 | 4 | 5;
export const SAFARI_STARS: SafariStar[] = [1, 2, 3, 4, 5];

export interface SafariTier {
  star: SafariStar;
  /** Relative encounter weight. Higher rate = shows up more often. */
  rate: number;
  /** Fight posts needed to knock this star out (odd, floor of 3, catch before it faints). */
  postsToDefeat: number;
  /** Pokemon slugs that can appear at this star. */
  pokemons: string[];
}

export interface SafariConfig {
  /** Contest/zone name shown to players (the opening post + banner title). */
  name: string;
  /** Short flavor blurb for the opening post. */
  blurb: string;
  tiers: SafariTier[];
  /** Chance (percent) the Pokemon runs off on a fight or feed turn. */
  runAwayChance: number;
  /** Catch-rate bump (percent) each time a berry/food item is fed. */
  berryBonus: number;
  /** Cap on the total berry bonus (percent). */
  berryBonusCap: number;
  /** Encounters each player may roll across the whole contest thread. */
  encountersPerPlayer: number;
  /** Snag Coin prizes for ranks 1, 2, 3. */
  prizeCoins: [number, number, number];
  /** Snag Coins every other participant receives. */
  consolationCoins: number;
}

export const DEFAULT_SAFARI_RATES: Record<SafariStar, number> = { 1: 40, 2: 25, 3: 20, 4: 10, 5: 5 };
/** Odd, floored at 3 so there is always a window to catch before a knockout. */
export const DEFAULT_POSTS_TO_DEFEAT: Record<SafariStar, number> = { 1: 3, 2: 5, 3: 7, 4: 9, 5: 11 };

/**
 * The classic Johto Safari Zone "Meadow Zone" pools, bucketed by star from the
 * original contest list. Baked in as the launch default so a fresh install has
 * a ready contest to test. (The old flat 0-star Mankey sits in 1 star; the
 * 6-star Shiny Pikachu sits in 5 star as Pikachu; shininess still rolls at
 * catch time.)
 */
export const JOHTO_MEADOW_POOLS: Record<SafariStar, string[]> = {
  1: ["azurill", "oddish", "sunkern", "seedot", "hoppip", "mankey"],
  2: ["buneary", "cleffa", "taillow", "smoochum", "igglybuff", "surskit", "wooper", "shroomish"],
  3: ["skiploom", "vulpix", "marill", "gloom", "minccino", "sunflora", "nuzleaf"],
  4: ["clefairy", "jigglypuff", "masquerain", "breloom", "azumarill", "jynx", "cinccino"],
  5: ["zorua", "feebas", "chansey", "pikachu"],
};

export function defaultSafariConfig(): SafariConfig {
  return {
    name: "Johto Safari Contest: Meadow Zone",
    blurb:
      "Welcome to the Safari Zone Meadow, a beautiful meadow of flowers, clean ponds and the greenest grass. Hunt the grass for the best Pokemon you can find, then fight, feed or throw a ball to bring it home. The rarest catch, roleplayed the best, wins.",
    tiers: SAFARI_STARS.map((star) => ({
      star,
      rate: DEFAULT_SAFARI_RATES[star],
      postsToDefeat: DEFAULT_POSTS_TO_DEFEAT[star],
      pokemons: [...JOHTO_MEADOW_POOLS[star]],
    })),
    runAwayChance: 5,
    berryBonus: 5,
    berryBonusCap: 25,
    encountersPerPlayer: 20,
    prizeCoins: [10, 10, 7],
    consolationCoins: 3,
  };
}

// --- Catch math ------------------------------------------------------------

/** Base capture rate (percent) by ball type, matching the old contest table. */
export const BALL_BASE_RATE: Record<string, number> = {
  poke: 50,
  safari: 50,
  premier: 50,
  luxury: 50,
  net: 50,
  dusk: 50,
  nest: 50,
  dive: 50,
  timer: 50,
  repeat: 50,
  fast: 50,
  heavy: 50,
  love: 50,
  friend: 50,
  moon: 50,
  lure: 50,
  sport: 50,
  park: 50,
  dream: 50,
  beast: 50,
  heal: 50,
  quick: 50,
  level: 50,
  great: 60,
  ultra: 70,
  cherish: 90,
  master: 100,
};
export const DEFAULT_BALL_RATE = 50;
/** Most a fully weakened (near-KO) Pokemon adds to the catch chance. */
export const MAX_FIGHT_BONUS = 40;
/** Nothing but a Master Ball is ever a sure thing. */
export const CATCH_CAP = 95;

/** Derive a ball's key ("poke", "great", ...) from its sprite path or name. */
export function safariBallKey(input: { filePath?: string; name?: string }): string {
  const match = (input.filePath ?? "").match(/ball\/([a-z0-9-]+)/i);
  if (match && match[1] !== undefined) return match[1].toLowerCase();
  return (input.name ?? "").toLowerCase().replace(/\s*ball$/, "").trim();
}

/** Is this bag item a berry or a food item that can be fed for a catch bump? */
export function isSafariFood(category: string | undefined): boolean {
  const c = String(category ?? "").toLowerCase();
  return c.includes("berry") || c === "curry-ingredient";
}

export interface BallContext {
  firstStage?: boolean;
  failCount?: number;
  firstEncounter?: boolean;
}

/** Base ball rate, applying the Gaia conditions we can evaluate from our data. */
export function safariBallBaseRate(ballKey: string, ctx: BallContext = {}): number {
  let rate = BALL_BASE_RATE[ballKey] ?? DEFAULT_BALL_RATE;
  if (ballKey === "level" && ctx.firstStage) rate = 70;
  if (ballKey === "quick" && ctx.firstEncounter) rate = 80;
  if (ballKey === "heal" && (ctx.failCount ?? 0) > 0) rate = 80;
  return rate;
}

/** Extra catch chance from how weakened the Pokemon is (0 at full health). */
export function safariFightBonus(fightPosts: number, postsToDefeat: number): number {
  const span = Math.max(1, postsToDefeat - 1);
  return Math.round((Math.min(fightPosts, span) / span) * MAX_FIGHT_BONUS);
}

export interface CatchChanceParams extends BallContext {
  ballKey: string;
  fightPosts: number;
  postsToDefeat: number;
  /** Accumulated berry bonus (percent). */
  berryBonus: number;
}

/** Total catch chance (percent) for a ball throw right now. */
export function safariCatchChance(params: CatchChanceParams): number {
  const base = safariBallBaseRate(params.ballKey, params);
  if (base >= 100) return 100;
  const total =
    base + safariFightBonus(params.fightPosts, params.postsToDefeat) + (params.berryBonus || 0);
  return Math.max(0, Math.min(CATCH_CAP, total));
}
