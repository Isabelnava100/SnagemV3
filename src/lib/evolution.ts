import { itemData } from "../data/item";
import { EVOLUTIONS, EvolutionOption } from "../data/pokemon/evolutions";
import { Item, OwnedPokemon } from "../components/types/typesUsed";
import { levelForXp } from "./leveling";

/**
 * Evolution eligibility. Trainers evolve manually (they click Evolve), so this
 * only decides whether a given option is currently allowed and why not. Rules
 * per the agreed model:
 *   - level / special : the pokemon must have reached the required level
 *   - friendship      : friendship must be at or above the threshold
 *   - item / trade    : the trainer must own the matching item (spent on evolve)
 */

export interface EvolutionEligibility {
  option: EvolutionOption;
  eligible: boolean;
  /** Why it is not yet available (omitted when eligible). */
  reason?: string;
  /** Catalog id of the item that must be spent (item/trade methods). */
  requiredItemId?: string;
  /** Display name of the required item, if any. */
  requiredItemName?: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");

/** The catalog item an evolution needs, matched by name (e.g. "Fire Stone"). */
export function findEvolutionItem(itemName?: string) {
  if (!itemName) return undefined;
  const target = norm(itemName);
  return itemData.find((i) => norm(i.name) === target);
}

/** The evolution options defined for a national dex number. */
export function getEvolutionOptions(idx: number): EvolutionOption[] {
  return EVOLUTIONS[idx] ?? [];
}

/** Normalized names of every item used by an item/trade evolution. */
export const EVOLUTION_ITEM_NAMES: Set<string> = (() => {
  const set = new Set<string>();
  Object.values(EVOLUTIONS).forEach((options) =>
    options.forEach((o) => {
      if ((o.method === "item" || o.method === "trade") && o.itemName) set.add(norm(o.itemName));
    })
  );
  return set;
})();

/** True when a catalog item is used to evolve at least one species. */
export function isEvolutionItem(itemName: string): boolean {
  return EVOLUTION_ITEM_NAMES.has(norm(itemName));
}

/**
 * Evolutions a specific owned pokemon can take using the given item. Honors a
 * level gate if the evolution has one (most stone evolutions do not).
 */
export function evolutionOptionsWithItem(
  poke: Pick<OwnedPokemon, "pokedex" | "experience">,
  itemName: string
): EvolutionOption[] {
  const target = norm(itemName);
  const level = levelForXp(poke.experience ?? 0);
  return getEvolutionOptions(Number(poke.pokedex)).filter((o) => {
    if ((o.method !== "item" && o.method !== "trade") || !o.itemName) return false;
    if (norm(o.itemName) !== target) return false;
    if (o.level && level < o.level) return false;
    return true;
  });
}

/** Does this pokemon have any evolutions at all (regardless of eligibility)? */
export function canEverEvolve(poke: Pick<OwnedPokemon, "pokedex">): boolean {
  return getEvolutionOptions(Number(poke.pokedex)).length > 0;
}

/**
 * Evaluate every evolution option for a pokemon against the trainer's items.
 * Pass a precomputed level to avoid recomputing it per pokemon.
 */
export function evaluateEvolutions(
  poke: OwnedPokemon,
  ownedItems: Item[],
  precomputedLevel?: number
): EvolutionEligibility[] {
  const options = getEvolutionOptions(Number(poke.pokedex));
  const level = precomputedLevel ?? levelForXp(poke.experience ?? 0);
  const friendship = poke.friendship ?? 0;

  return options.map((option) => {
    if (option.method === "friendship") {
      // Friendship is a 0..100 stat now; a full bar (100) unlocks the evolution.
      const need = 100;
      return friendship >= need
        ? { option, eligible: true }
        : { option, eligible: false, reason: `Max out friendship (${friendship}/${need})` };
    }

    if (option.method === "item" || option.method === "trade") {
      const catalogItem = findEvolutionItem(option.itemName);
      if (!catalogItem) {
        return {
          option,
          eligible: false,
          reason: `${option.itemName ?? "A special item"} is not available yet`,
        };
      }
      const owned = ownedItems.find((i) => i.id === catalogItem.id);
      const has = !!owned && (owned.quantity ?? 0) > 0;
      return {
        option,
        eligible: has,
        reason: has ? undefined : `Needs ${catalogItem.name}`,
        requiredItemId: catalogItem.id,
        requiredItemName: catalogItem.name,
      };
    }

    // level or special: gated by level (special also carries a narrative note).
    const need = option.level ?? 1;
    return level >= need
      ? { option, eligible: true }
      : { option, eligible: false, reason: `Reach level ${need} (now ${level})` };
  });
}
