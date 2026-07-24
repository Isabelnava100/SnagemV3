/**
 * The 25 natures, grouped by what they help in battle. Mirrors the server map
 * in functions/src/index.ts (NATURES + natureOf); keep the two in sync. A
 * pokemon without a stored nature derives one deterministically from its id,
 * the same way the server does, so both always agree.
 */

export type NatureGroup = "attack" | "defense" | "speed" | "neutral";

export const NATURE_GROUPS: Record<string, NatureGroup> = {
  Adamant: "attack", Brave: "attack", Naughty: "attack", Lonely: "attack",
  Modest: "attack", Mild: "attack", Quiet: "attack", Rash: "attack",
  Bold: "defense", Impish: "defense", Lax: "defense", Relaxed: "defense",
  Calm: "defense", Careful: "defense", Gentle: "defense", Sassy: "defense",
  Timid: "speed", Hasty: "speed", Jolly: "speed", Naive: "speed",
  Hardy: "neutral", Docile: "neutral", Serious: "neutral", Bashful: "neutral", Quirky: "neutral",
};

const NATURE_NAMES = Object.keys(NATURE_GROUPS);

export function natureOf(pokemon: { id: string; nature?: string }): string {
  const stored = pokemon.nature ?? "";
  if (NATURE_GROUPS[stored]) return stored;
  let h = 0;
  for (const ch of pokemon.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NATURE_NAMES[h % NATURE_NAMES.length] ?? "Hardy";
}

export const NATURE_GROUP_LABEL: Record<NatureGroup, string> = {
  attack: "hits harder",
  defense: "takes hits better",
  speed: "escapes easier",
  neutral: "perfectly balanced",
};
