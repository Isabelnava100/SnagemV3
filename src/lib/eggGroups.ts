import eggGroupsByDex from "../data/pokemon/eggGroupsByDex.json";

/**
 * Egg groups per species (scripts/gen-egggroups.mjs; mirror of the functions
 * copy). "Undiscovered" species cannot breed at all, covering legendaries,
 * mythicals and most babies.
 */
export function eggGroupsForDex(idx: number | string): string[] {
  const g = (eggGroupsByDex as Record<string, string[]>)[String(Number(idx))];
  return g && g.length ? g : ["Undiscovered"];
}

export const canBreed = (idx: number | string): boolean =>
  !eggGroupsForDex(idx).includes("Undiscovered");
