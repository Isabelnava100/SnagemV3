/**
 * Pokedex generation ranges. Mirrors GEN_CAPS / GEN_NAMES in
 * functions/src/index.ts. Generation is derived from the national dex number.
 */
const GEN_CAPS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
export const GEN_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

/** Roman-numeral generation for a dex number ("" if out of range / unknown). */
export function generationOf(idx: number | string): string {
  const n = Number(idx) || 0;
  if (n < 1) return "";
  const gi = GEN_CAPS.findIndex((cap) => n <= cap);
  return GEN_NAMES[gi === -1 ? GEN_NAMES.length - 1 : gi] ?? "";
}
