import { GEM_TYPE, XITEM_FX, Z_CRYSTAL_ID } from "./battleItems";
import { EXP_CANDY_XP, RARE_CANDY_ID, SELL_VALUES, VITAMIN_IDS } from "./itemUses";

/**
 * One-line "what this item does / how to use it" for the bag info card and the
 * GRAY agent. Kept in sync with the mechanics in functions/src/index.ts
 * (battle-post effects) and the bag callables (sellItem / useItemOnPokemon).
 */
export function usageForItem(itemId: string, category: string): string | undefined {
  if (Z_CRYSTAL_ID[itemId]) {
    return "Z-Crystal: tick the Z-Move panel in a battle post for one big attack this post. Never used up. Needs a Master-cleared character, and the pokemon must match the crystal's type or species.";
  }
  if (GEM_TYPE[itemId]) {
    return "Gem: use in a battle post for a one-post attack boost when the Gem's type matches your pokemon's own type. Used up.";
  }
  const x = XITEM_FX[itemId];
  if (x) {
    const byFx: Record<string, string> = {
      xAttack: "X Attack: a stronger attack for one battle post. Used up.",
      direHit: "Dire Hit: a higher critical-hit chance for one battle post. Used up.",
      xDefense: "X Defense: cuts the enemy's damage for one battle post. Used up.",
      xSpeed: "X Speed: a better flee chance for one battle post. Used up.",
      noop: "Battle item: spent in a battle post.",
    };
    return byFx[x];
  }
  if (SELL_VALUES[itemId] !== undefined) {
    return `Valuable: sell it from your bag for ${SELL_VALUES[itemId]} Snag Coins each. Click it in Items to sell.`;
  }
  if (itemId === RARE_CANDY_ID) {
    return "Rare Candy: use it on a pokemon (click it in Items) to grant one level's worth of XP. Used up.";
  }
  if (EXP_CANDY_XP[itemId] !== undefined) {
    return `Exp Candy: use it on a pokemon (click it in Items) to grant ${EXP_CANDY_XP[itemId]} XP. Used up.`;
  }
  if (VITAMIN_IDS.has(itemId)) {
    return "Vitamin: use it on a pokemon (click it in Items) to raise its friendship. Used up.";
  }
  if (category === "plate" || category === "memory") {
    return "Use it on a pokemon for a small XP boost (type-form effects are not in the game yet). Used up.";
  }
  const byCategory: Record<string, string> = {
    ball: "Poke Ball: throw it at a beaten wild encounter in a battle post to catch it.",
    medicine: "Medicine: heals your pokemon during a battle post (auto-targeted).",
    berry: "Berry: feed it to a wild encounter to raise catch odds, or plant it at the Berry Farm.",
    "hold-item": "Held item: equip it on a boxed pokemon for a passive battle effect.",
    "evo-item": "Evolution item: use it from your bag to evolve the pokemon it belongs to.",
    "mega-stone": "Mega Stone: tick the Mega panel in a battle post to Mega Evolve for one post. Never used up. Needs a Master-cleared character.",
    mint: "Mint: use it on a boxed pokemon to change its nature. Used up.",
    "z-crystals": "Z-Crystal: tick the Z-Move panel in a battle post. Never used up. Needs a Master-cleared character.",
    "battle-item": "Battle item: tick the Battle Items panel in a battle post. Used up.",
    gem: "Gem: use in a battle post for a type-matched attack boost. Used up.",
    "exp-candy": "Exp Candy: use it on a pokemon to grant XP. Used up.",
    "valuable-item": "Valuable: sell it from your bag for Snag Coins.",
  };
  return byCategory[category];
}
