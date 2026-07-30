import { useQuery } from "@tanstack/react-query";
import { getRecipes, getShops } from "../queries/mall";
import { getMysteryBoxes } from "../queries/game";
import { getMissions } from "../queries/missions";
import itemCatalog from "../data/item/item.json";

/** One way to obtain an item, shown in the bag's "where do I get this" line. */
export interface ItemSource {
  kind: "shop" | "recipe" | "mission" | "box" | "activity";
  label: string;
}

/** Normalize a display name to the slug form used by item.json Names. */
function normName(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// name (slug) -> catalog item id, for resolving a mission's free-text
// `special_item` back to a real item. First match wins on the rare collision.
const NAME_TO_ID = new Map<string, string>();
Object.values(itemCatalog as Record<string, { "Item ID": string; Name: string }>).forEach((it) => {
  const key = normName(it.Name);
  if (key && !NAME_TO_ID.has(key)) NAME_TO_ID.set(key, it["Item ID"]);
});

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
  const boxes = useQuery({ queryKey: ["mystery-boxes"], queryFn: getMysteryBoxes });
  const missions = useQuery({ queryKey: ["missions-all"], queryFn: getMissions });

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

  // Mystery boxes: each box's item rewards (currency entries are skipped).
  Object.values(boxes.data ?? {}).forEach((box) => {
    if (box.archived) return;
    (box.pool ?? []).forEach((entry) => {
      if (entry.kind === "item" && entry.refId)
        push(entry.refId, { kind: "box", label: `Mystery box: ${box.name}` });
    });
  });

  // Missions: resolve the free-text special_item reward back to a catalog id.
  (missions.data ?? []).forEach((m) => {
    if (!m.special_item) return;
    const id = NAME_TO_ID.get(normName(m.special_item));
    if (id) push(id, { kind: "mission", label: `Mission: ${m.title}` });
  });

  Object.entries(STATIC_SOURCES).forEach(([itemId, sources]) =>
    sources.forEach((s) => push(itemId, s))
  );

  return map;
}

/**
 * Non-hook version of the source map: fetches shops + recipes + boxes +
 * missions once and assembles the same itemId -> sources map. For places that
 * cannot call the hook (e.g. the GRAY chat answer builders).
 */
export async function buildItemSources(): Promise<Map<string, ItemSource[]>> {
  const [shopsData, recipesData, boxesData, missionsData] = await Promise.all([
    getShops(),
    getRecipes(),
    getMysteryBoxes(),
    getMissions(),
  ]);
  const map = new Map<string, ItemSource[]>();
  const push = (itemId: string, source: ItemSource) => {
    const list = map.get(itemId) ?? [];
    list.push(source);
    map.set(itemId, list);
  };
  (shopsData ?? []).forEach((shop) => {
    const currency = CURRENCY_LABEL[shop.currency] ?? shop.currency;
    (shop.sections ?? []).forEach((section) =>
      (section.items ?? []).forEach((item) =>
        push(item.itemId, { kind: "shop", label: `${shop.name}: ${item.price} ${currency}` })
      )
    );
    (shop.rare_section?.pool ?? []).forEach((item) =>
      push(item.itemId, { kind: "shop", label: `${shop.name} (daily rare): ${item.price} ${currency}` })
    );
  });
  (recipesData ?? []).forEach((r) =>
    push(r.output_item_id, { kind: "recipe", label: "Crafted at Ambrosial Alchemy" })
  );
  Object.values(boxesData ?? {}).forEach((box) => {
    if (box.archived) return;
    (box.pool ?? []).forEach((e) => {
      if (e.kind === "item" && e.refId) push(e.refId, { kind: "box", label: `Mystery box: ${box.name}` });
    });
  });
  (missionsData ?? []).forEach((m) => {
    if (!m.special_item) return;
    const id = NAME_TO_ID.get(normName(m.special_item));
    if (id) push(id, { kind: "mission", label: `Mission: ${m.title}` });
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
