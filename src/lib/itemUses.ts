/**
 * Bag item uses that resolve to a server callable: selling valuables for Snag
 * Coins, and using an item on a pokemon (Exp Candy / Rare Candy -> XP, Vitamins
 * -> friendship, Plates + Memories -> flat XP). Mirror of SELL_VALUES /
 * EXP_CANDY_XP / VITAMIN_IDS / RARE_CANDY_ID in functions/src/index.ts; keep the
 * two in sync. Keyed by stable item id so it never depends on a display name.
 */

/** Valuables (+ bottle caps) sell for a flat Snag Coin price each. */
export const SELL_VALUES: Record<string, number> = {
  item_0086: 200, // tiny-mushroom
  item_0087: 1000, // big-mushroom
  item_0580: 3000, // balm-mushroom
  item_0092: 500, // nugget
  item_0581: 2000, // big-nugget
  item_0088: 200, // pearl
  item_0089: 800, // big-pearl
  item_0582: 1500, // pearl-string
  item_0090: 200, // stardust
  item_0091: 1000, // star-piece
  item_0583: 1500, // comet-shard
  item_0106: 1000, // rare-bone
  item_0571: 100, // pretty-wing
  item_0070: 100, // shoal-salt
  item_0071: 100, // shoal-shell
  item_0473: 1500, // slowpoke-tail
  item_0584: 300, // relic-copper
  item_0585: 800, // relic-silver
  item_0586: 2000, // relic-gold
  item_0588: 500, // relic-band
  item_0587: 1000, // relic-vase
  item_0589: 2500, // relic-statue
  item_0590: 5000, // relic-crown
  item_0795: 1000, // bottle-cap
  item_0796: 3000, // gold-bottle-cap
};

export const EXP_CANDY_XP: Record<string, number> = {
  item_1124: 100, item_1125: 800, item_1126: 3000, item_1127: 10000, item_1128: 30000,
};
export const RARE_CANDY_ID = "item_0050";
export const VITAMIN_IDS = new Set([
  "item_0045", "item_0046", "item_0047", "item_0049",
  "item_0052", "item_0048", "item_0051", "item_0053",
]);

export function sellPriceFor(itemId: string): number | undefined {
  return SELL_VALUES[itemId];
}

/** What using this item on a pokemon does, or null if it can't be used that way. */
export function itemPokemonUse(itemId: string, category: string): "xp" | "friendship" | null {
  if (itemId === RARE_CANDY_ID || EXP_CANDY_XP[itemId] !== undefined) return "xp";
  if (VITAMIN_IDS.has(itemId)) return "friendship";
  if (category === "plate" || category === "memory") return "xp";
  return null;
}
