/**
 * Shadow / progression stat helpers. Friendship, shadow and purification run on
 * a 0..100 scale (mirrors the server in functions/src/index.ts). A pokemon is
 * "Shadow'ed" once its shadow reaches the cap.
 */
export const STAT_MAX = 100;

export function isShadowed(pokemon: { shadow?: number } | null | undefined): boolean {
  return (pokemon?.shadow ?? 0) >= STAT_MAX;
}

/** Where the Shadow'ed badge links: the Library growth/shadow guide. */
export const SHADOW_GUIDE_LINK = "/Library?tab=shadow";
