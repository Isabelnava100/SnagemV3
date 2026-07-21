import { useQuery } from "@tanstack/react-query";
import { getRecipes, getShops } from "../queries/mall";

/** One way to obtain an item, shown in the bag's "where do I get this" line. */
export interface ItemSource {
  kind: "shop" | "recipe" | "mission" | "activity";
  label: string;
}

const CURRENCY_LABEL: Record<string, string> = {
  pokecoin: "Snag Coins",
  gengarcoin: "Gengar Tokens",
  snagemblem: "Snag Emblems",
};

// Hand-maintained sources that live outside the shops/recipes data: mission
// special-item grants and activity drops. Extend as new grant paths ship.
const STATIC_SOURCES: Record<string, ItemSource[]> = {
  item_0445: [{ kind: "mission", label: "Rod Thief mission reward" }],
  item_0240: [{ kind: "mission", label: "Mission reward (see the Mission Vault)" }],
};

/**
 * itemId -> everywhere it can be obtained, built from the live shops and
 * recipes collections plus the static grant list. Cached like any query, so
 * every popover on the page shares one read.
 */
export function useItemSources(): Map<string, ItemSource[]> {
  const shops = useQuery({ queryKey: ["item-source-shops"], queryFn: getShops });
  const recipes = useQuery({ queryKey: ["craft-recipes"], queryFn: getRecipes });

  const map = new Map<string, ItemSource[]>();
  const push = (itemId: string, source: ItemSource) => {
    const list = map.get(itemId) ?? [];
    list.push(source);
    map.set(itemId, list);
  };

  (shops.data ?? []).forEach((shop) => {
    const currency = CURRENCY_LABEL[shop.currency] ?? shop.currency;
    (shop.sections ?? []).forEach((section) =>
      (section.items ?? []).forEach((item) =>
        push(item.itemId, { kind: "shop", label: `${shop.name}: ${item.price} ${currency}` })
      )
    );
    (shop.rare_section?.pool ?? []).forEach((item) =>
      push(item.itemId, {
        kind: "shop",
        label: `${shop.name} (daily rare): ${item.price} ${currency}`,
      })
    );
  });

  (recipes.data ?? []).forEach((recipe) => {
    push(recipe.output_item_id, { kind: "recipe", label: "Crafted at Ambrosial Alchemy" });
  });

  Object.entries(STATIC_SOURCES).forEach(([itemId, sources]) =>
    sources.forEach((s) => push(itemId, s))
  );

  return map;
}

/** Short one-line summary for an item's sources ("" when none known). */
export function describeSources(sources: ItemSource[] | undefined): string {
  if (!sources?.length) return "";
  return sources
    .slice(0, 3)
    .map((s) => s.label)
    .join(" · ");
}
