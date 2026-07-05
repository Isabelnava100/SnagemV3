/**
 * Pokemon leveling model. A pokemon's level is derived from its total earned
 * `experience` (see OwnedPokemon.experience), so level is never stored: it
 * always reflects current XP.
 *
 * The default curve is tuned for an average of 4 qualifying posts per week at
 * roughly 10 XP per post (the reference the numbers were balanced against; the
 * actual XP per post is set per thread). Against that pace:
 *   - Level 16  (a first evolution) ~1 month
 *   - Level 32  (a final evolution) ~5 months
 *   - Level 40  ~9 months
 *   - Past level 40 the cost grows EXPONENTIALLY, so pushing to level 100 is a
 *     multi-year grind (the top levels each cost well over a hundred posts).
 *
 * Admins can override the whole table (stored at admin/leveling); DEFAULT_XP_CURVE
 * is only the fallback.
 */

export const MAX_LEVEL = 100;

/** Reference XP granted per qualifying post the defaults were balanced around. */
export const REFERENCE_XP_PER_POST = 10;

/**
 * Posts needed to climb from level L-1 to L under the default pace: gentle to
 * the first evolution, a steeper ramp to level 40, then exponential growth so
 * every level past 40 costs meaningfully more than the last.
 */
function defaultPostsForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 16) return 0.5 + ((level - 2) / 14) * 1.0; // 0.5 -> 1.5 posts
  if (level <= 40) return 2 + ((level - 17) / 23) * 8; // 2 -> 10 posts
  return 10 * Math.pow(1.05, level - 40); // exponential after level 40
}

/**
 * Cumulative XP required to REACH each level, indexed by level (1..100).
 * curve[1] === 0 (everyone starts at level 1); curve[100] is the cap total.
 * Index 0 is unused so the array reads by level directly.
 */
export const DEFAULT_XP_CURVE: number[] = (() => {
  const curve = [0, 0]; // index 0 unused, level 1 = 0 XP
  let cumulativePosts = 0;
  for (let level = 2; level <= MAX_LEVEL; level++) {
    cumulativePosts += defaultPostsForLevel(level);
    curve[level] = Math.round(cumulativePosts * REFERENCE_XP_PER_POST);
  }
  return curve;
})();

/**
 * The curve the app currently uses. Defaults to DEFAULT_XP_CURVE and is replaced
 * at startup with the admin-configured table (admin/leveling) if one exists, so
 * every level display and evolution gate reflects the admin's settings.
 */
let ACTIVE_CURVE: number[] = DEFAULT_XP_CURVE;

/** Install the admin-configured curve (call once on load). */
export function setActiveCurve(curve: number[] | null | undefined): void {
  ACTIVE_CURVE = curve && curve.length > 1 ? curve : DEFAULT_XP_CURVE;
}

/** Total XP needed to reach a given level under the active (or given) curve. */
export function xpForLevel(level: number, curve: number[] = ACTIVE_CURVE): number {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return curve[clamped] ?? 0;
}

/** The level a pokemon has reached for a given total XP (clamped 1..100). */
export function levelForXp(xp: number, curve: number[] = ACTIVE_CURVE): number {
  const total = Math.max(0, xp || 0);
  let level = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) {
    if (total >= (curve[l] ?? Infinity)) level = l;
    else break;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned into the current level (0 at a fresh level up). */
  xpIntoLevel: number;
  /** XP span of the current level (0 at max level). */
  xpForThisLevel: number;
  /** 0..1 progress toward the next level (1 at max level). */
  ratio: number;
  isMax: boolean;
}

/** Level plus progress toward the next level, for XP bars and labels. */
export function levelProgress(xp: number, curve: number[] = ACTIVE_CURVE): LevelProgress {
  const total = Math.max(0, xp || 0);
  const level = levelForXp(total, curve);
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, xpIntoLevel: 0, xpForThisLevel: 0, ratio: 1, isMax: true };
  }
  const start = curve[level] ?? 0;
  const next = curve[level + 1] ?? start;
  const span = Math.max(1, next - start);
  const into = Math.max(0, total - start);
  return {
    level,
    xpIntoLevel: into,
    xpForThisLevel: next - start,
    ratio: Math.max(0, Math.min(1, into / span)),
    isMax: false,
  };
}
