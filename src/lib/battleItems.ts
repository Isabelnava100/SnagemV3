import { PokeType, typesForDex } from "./typeChart";

/**
 * Z-Crystals, X battle items and Gems, keyed by stable catalog item id. Mirror
 * of the server maps in functions/src/index.ts (Z_CRYSTAL_ID, XITEM_FX,
 * GEM_TYPE, ZTYPE_CRYSTAL, ZSPECIES_CRYSTAL); keep the two in sync.
 *
 * A Z-Move is a per-post activation like Mega: the crystal must be owned but is
 * never consumed. X items and Gems are consumed on the post they are used.
 */

/** Z-Crystal item id -> catalog key ("firium-z"). */
export const Z_CRYSTAL_ID: Record<string, string> = {
  item_0776: "normalium-z", item_0777: "firium-z", item_0800: "waterium-z",
  item_0779: "electrium-z", item_0798: "grassium-z", item_0781: "icium-z",
  item_0782: "fightinium-z", item_0783: "poisonium-z", item_0784: "groundium-z",
  item_0785: "flyinium-z", item_0786: "psychium-z", item_0787: "buginium-z",
  item_0788: "rockium-z", item_0789: "ghostium-z", item_0790: "dragonium-z",
  item_0791: "darkinium-z", item_0792: "steelium-z", item_0793: "fairium-z",
  item_0780: "decidium-z", item_0799: "incinium-z", item_0778: "primarium-z",
  item_0803: "aloraichium-z", item_0804: "snorlium-z", item_0805: "eevium-z",
  item_0806: "mewnium-z", item_0794: "pikanium-z", item_0835: "pikashunium-z",
  item_0801: "tapunium-z", item_0802: "marshadium-z", item_0926: "kommonium-z",
  item_0925: "lycanium-z", item_0924: "mimikium-z", item_0921: "solganium-z",
  item_0922: "lunalium-z", item_0923: "ultranecrozium-z",
};

/** Type Z-Crystals: the fighter must share the crystal's type to use it. */
export const ZTYPE_CRYSTAL: Record<string, PokeType> = {
  "normalium-z": "Normal", "firium-z": "Fire", "waterium-z": "Water",
  "electrium-z": "Electric", "grassium-z": "Grass", "icium-z": "Ice",
  "fightinium-z": "Fighting", "poisonium-z": "Poison", "groundium-z": "Ground",
  "flyinium-z": "Flying", "psychium-z": "Psychic", "buginium-z": "Bug",
  "rockium-z": "Rock", "ghostium-z": "Ghost", "dragonium-z": "Dragon",
  "darkinium-z": "Dark", "steelium-z": "Steel", "fairium-z": "Fairy",
};

/** Species Z-Crystals: the fighter must be one of the listed species slugs. */
export const ZSPECIES_CRYSTAL: Record<string, string[]> = {
  "decidium-z": ["decidueye"], "incinium-z": ["incineroar"], "primarium-z": ["primarina"],
  "aloraichium-z": ["raichu-alola", "raichu"], "snorlium-z": ["snorlax"],
  "eevium-z": ["eevee"], "mewnium-z": ["mew"], "pikanium-z": ["pikachu"],
  "pikashunium-z": ["pikachu"],
  "tapunium-z": ["tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini"],
  "marshadium-z": ["marshadow"], "kommonium-z": ["kommo-o"],
  "lycanium-z": ["lycanroc", "lycanroc-midday", "lycanroc-midnight", "lycanroc-dusk"],
  "mimikium-z": ["mimikyu"], "solganium-z": ["solgaleo"], "lunalium-z": ["lunala"],
  "ultranecrozium-z": ["necrozma", "necrozma-dusk-mane", "necrozma-dawn-wings"],
};

/** Consumable X battle item id -> the effect it grants for the post. */
export const XITEM_FX: Record<string, "xAttack" | "direHit" | "xDefense" | "xSpeed" | "noop"> = {
  item_0057: "xAttack", item_0061: "xAttack", item_0056: "direHit",
  item_0058: "xDefense", item_0062: "xDefense", item_0059: "xSpeed",
  item_0060: "noop", item_0055: "noop",
};

/** Gem item id -> the type it boosts ("*" = elemental gem, matches any type). */
export const GEM_TYPE: Record<string, string> = {
  item_0548: "Fire", item_0549: "Water", item_0550: "Electric", item_0551: "Grass",
  item_0552: "Ice", item_0553: "Fighting", item_0554: "Poison", item_0555: "Ground",
  item_0556: "Flying", item_0557: "Psychic", item_0558: "Bug", item_0559: "Rock",
  item_0560: "Ghost", item_0561: "Dragon", item_0562: "Dark", item_0563: "Steel",
  item_0564: "Normal", item_0715: "Fairy", item_15862: "*",
};

/** Can a pokemon (by dex + species slug) use this Z-Crystal item? */
export function canUseZCrystal(itemId: string, dex: number | string, slug: string): boolean {
  const key = Z_CRYSTAL_ID[itemId];
  if (!key) return false;
  const type = ZTYPE_CRYSTAL[key];
  if (type) return typesForDex(dex).includes(type);
  const species = ZSPECIES_CRYSTAL[key];
  return species ? species.includes(slug) : false;
}

/** Short label for a Z-Crystal item ("Fire Z-Move"). */
export function zCrystalLabel(itemId: string): string {
  const key = Z_CRYSTAL_ID[itemId] ?? "";
  const type = ZTYPE_CRYSTAL[key];
  return type ? `${type} Z-Move` : "Z-Move";
}

export function isZCrystal(itemId: string): boolean {
  return !!Z_CRYSTAL_ID[itemId];
}

export function isBattleItem(itemId: string): boolean {
  return !!GEM_TYPE[itemId] || !!XITEM_FX[itemId];
}

const XITEM_LABEL: Record<string, string> = {
  xAttack: "X Attack (stronger attack)",
  direHit: "Dire Hit (higher crit)",
  xDefense: "X Defense (cut enemy damage)",
  xSpeed: "X Speed (better flee)",
  noop: "Battle item",
};

/** Short label for a consumable battle item (X item or Gem). */
export function battleItemLabel(itemId: string): string | undefined {
  const gem = GEM_TYPE[itemId];
  if (gem) return gem === "*" ? "Elemental Gem (any type)" : `${gem} Gem (type-matched)`;
  const x = XITEM_FX[itemId];
  return x ? XITEM_LABEL[x] : undefined;
}
