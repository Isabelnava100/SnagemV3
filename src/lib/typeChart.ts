import typesByDex from "../data/pokemon/typesByDex.json";

/**
 * Type effectiveness for the forum battle system, by POKEMON TYPE (not moves;
 * the site does not manage movesets). The standard main-series chart drives
 * the multiplier of an attack: a Fire pokemon attacking a Water pokemon works
 * at 0.5x, Water attacking Fire at 2x, and so on. Dual types multiply, and
 * the final multiplier is clamped to 0.5x..2x so no battle is ever a
 * zero-progress soft-lock (immunities count as 0.5x here).
 *
 * Applied in BOTH directions by the server (functions/src/index.ts mirror):
 *   - Your battle posts: capture/beat progress per post is scaled by your
 *     fighter's type vs the enemy's type.
 *   - The enemy's counter-attack: its damage is scaled by its type vs your
 *     fighter's type.
 */

export type PokeType =
  | "Normal" | "Fire" | "Water" | "Electric" | "Grass" | "Ice"
  | "Fighting" | "Poison" | "Ground" | "Flying" | "Psychic" | "Bug"
  | "Rock" | "Ghost" | "Dragon" | "Dark" | "Steel" | "Fairy";

export const ALL_TYPES: PokeType[] = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison",
  "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark",
  "Steel", "Fairy",
];

/** attacker -> { defender: multiplier } for non-1x matchups (gen 6+ chart). */
const CHART: Record<PokeType, Partial<Record<PokeType, number>>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
};

/** Types of a species by national dex number (["Normal"] for unknown). */
export function typesForDex(idx: number | string): PokeType[] {
  const t = (typesByDex as Record<string, string[]>)[String(Number(idx))];
  return (t && t.length ? t : ["Normal"]) as PokeType[];
}

/**
 * Effectiveness multiplier of an attacker's type(s) against a defender's
 * type(s), clamped to 0.5..2 (immunities and 4x/0.25x are flattened so every
 * battle stays winnable and every foe stays dangerous).
 */
export function typeEffectiveness(attacker: string[], defender: string[]): number {
  // Best of the attacker's own types (they lead with their strongest STAB).
  let best = 0;
  for (const atk of attacker.length ? attacker : ["Normal"]) {
    let mult = 1;
    for (const def of defender.length ? defender : ["Normal"]) {
      const m = CHART[atk as PokeType]?.[def as PokeType];
      mult *= m === undefined ? 1 : m;
    }
    best = Math.max(best, mult);
  }
  return Math.max(0.5, Math.min(2, best));
}

/** Human label for a multiplier ("super effective (x2)" etc.). */
export function effectivenessLabel(mult: number): string {
  if (mult >= 2) return "super effective (x2)";
  if (mult <= 0.5) return "not very effective (x0.5)";
  if (mult > 1) return `effective (x${mult})`;
  if (mult < 1) return `weak (x${mult})`;
  return "normal (x1)";
}
