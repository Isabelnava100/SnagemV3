import { EVOLUTIONS } from "../data/pokemon/evolutions";

/**
 * "Battle stage" of a species, used to size boss-defeat and encounter-capture
 * post counts. Derived from the baked evolution chains plus a legendary list:
 *   - stage1: a base form that can still evolve (Bulbasaur)
 *   - stage2: a form that has evolved once, or a species with no evolution line
 *     at all ("stage 2 or has no evolution" share the same cost)
 *   - stage3: a form that has evolved twice (Venusaur)
 *   - legendary: on the legendary / mythical / Ultra Beast / Paradox list
 */
export type BattleStage = "stage1" | "stage2" | "stage3" | "legendary";

/** National Dex numbers treated as legendary-tier for battle costs. */
export const LEGENDARY_DEX = new Set<number>([
  // Gen 1
  144, 145, 146, 150, 151,
  // Gen 2
  243, 244, 245, 249, 250, 251,
  // Gen 3
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  // Gen 4
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
  // Gen 5
  494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
  // Gen 6
  716, 717, 718, 719, 720, 721,
  // Gen 7 (legendaries, mythicals, Ultra Beasts)
  772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796,
  797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809,
  // Gen 8 (+ Enamorus 905)
  888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 905,
  // Gen 9 Paradox (Scarlet/Violet + DLC)
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995,
  1005, 1006, 1009, 1010, 1020, 1021, 1022, 1023,
  // Gen 9 Treasures of Ruin, box legends, Loyal Three, Ogerpon, Terapagos, Pecharunt
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024, 1025,
]);

/** Reverse index: evolved-form dex number -> its pre-evolution dex number. */
const PRE_EVO: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  for (const [fromIdx, options] of Object.entries(EVOLUTIONS)) {
    for (const opt of options) {
      // First pre-evo wins; branches (Eevee) still resolve to a single depth.
      if (map[opt.toIdx] === undefined) map[opt.toIdx] = Number(fromIdx);
    }
  }
  return map;
})();

export function isLegendaryDex(idx: number): boolean {
  return LEGENDARY_DEX.has(idx);
}

/** Whether this species can still evolve into something. */
export function hasForwardEvolution(idx: number): boolean {
  return (EVOLUTIONS[idx]?.length ?? 0) > 0;
}

/** How many pre-evolutions this species has (0 = base form). Capped for safety. */
export function preEvolutionDepth(idx: number): number {
  let depth = 0;
  let current = idx;
  while (PRE_EVO[current] !== undefined && depth < 5) {
    current = PRE_EVO[current];
    depth++;
  }
  return depth;
}

export function battleStage(idx: number): BattleStage {
  if (isLegendaryDex(idx)) return "legendary";
  const depth = preEvolutionDepth(idx);
  if (depth >= 2) return "stage3";
  if (depth === 1) return "stage2";
  // Base form: it is stage1 only if it can still evolve, otherwise stage2.
  return hasForwardEvolution(idx) ? "stage1" : "stage2";
}

export const BATTLE_STAGE_LABEL: Record<BattleStage, string> = {
  stage1: "Stage 1",
  stage2: "Stage 2 / no evolution",
  stage3: "Stage 3",
  legendary: "Legendary",
};
