import { pokemonData } from "../data/pokemon";
import starByDex from "../data/pokemon/starByDex.json";

/**
 * Classic starter lines' base forms (Bulbasaur through Sprigatito trios). New
 * members may pick one of these OR any 1-star species as their first pokemon.
 * Mirror of STARTER_DEX in functions/src/index.ts; keep in sync.
 */
export const STARTER_DEX = new Set<number>([
  1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725,
  728, 810, 813, 816, 906, 909, 912,
]);

export interface StarterOption {
  slug: string;
  name: string;
  idx: number;
  /** True for the classic Grass/Fire/Water starters, shown first in pickers. */
  isClassic: boolean;
}

/** Every species a brand-new member may claim via the chooseStarter callable. */
export function starterOptions(): StarterOption[] {
  return pokemonData
    .map((p) => ({ slug: p.slug, name: p.name, idx: parseInt(p.idx, 10) }))
    .filter(
      (p) =>
        STARTER_DEX.has(p.idx) || (starByDex as Record<string, number>)[String(p.idx)] === 1
    )
    .map((p) => ({ ...p, isClassic: STARTER_DEX.has(p.idx) }))
    .sort((a, b) => Number(b.isClassic) - Number(a.isClassic) || a.idx - b.idx);
}
