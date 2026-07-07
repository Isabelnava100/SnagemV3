import { db } from "../context/firebase";

/** A storefront in the Snag Mall (see docs/SHOP_DATA.md). */
export interface Shop {
  id: string;
  name: string;
  type: string;
  flavor_intro?: string;
  npc_name?: string;
  npc_image?: string;
  currency: "pokecoin" | "gengarcoin" | "snagemblem";
  sections?: Array<{
    title: string;
    items: Array<{ itemId: string; price: number; description?: string; stock?: number }>;
  }>;
  rare_section?: { rotates_daily?: boolean; pool: Array<{ itemId: string; price: number; description?: string }> };
  kind?: "store" | "recycle" | "tour" | "evo";
  active?: boolean;
  order?: number;
}

/** A crafting recipe (Ambrosial Alchemy). */
export interface Recipe {
  id: string;
  output_item_id: string;
  output_qty?: number;
  max_batch?: number;
  ingredients?: Array<{ itemId: string; qty: number }>;
  cost?: { pokecoin?: number; snagemblem?: number };
  success_rate?: number;
  category?: string;
  active?: boolean;
}

export const getShops = async (): Promise<Shop[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "shops"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Shop, "id">) }))
    .filter((s) => s.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

export const getShop = async (id: string): Promise<Shop | null> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "shops", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Shop, "id">) }) : null;
};

export const getRecipes = async (): Promise<Recipe[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "recipes"));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Recipe, "id">) }))
    .filter((r) => r.active !== false);
};

async function call<T>(name: string, data: unknown): Promise<T> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../context/firebase");
  const res = await httpsCallable(getFunctions(), name)(data);
  return res.data as T;
}

export const buyShopItem = (shopId: string, itemId: string, qty: number) =>
  call<{ ok: boolean; spent: number; currency: string }>("buyShopItem", { shopId, itemId, qty });

export const craftItem = (recipeId: string, batch: number) =>
  call<{ ok: boolean; successes: number; failures: number }>("craftItem", { recipeId, batch });

export const recycleItems = (itemIds: string[]) =>
  call<{ ok: boolean; coins: number; recycled: number; excluded: number }>("recycleItems", {
    itemIds,
  });

export type ScentKey = "joy" | "excite" | "vivid";
/** Trash Shack: spend a Pokemon's Evo Points for aroma Scents (4/6/8 each). */
export const convertCandyToScent = (pokemonId: string, scent: ScentKey, qty: number) =>
  call<{ ok: boolean; scent: ScentKey; qty: number; spent: number; remaining: number }>(
    "convertCandyToScent",
    { pokemonId, scent, qty }
  );

export const rollTour = (area: string) =>
  call<{ ok: boolean; item: { name: string; filePath?: string }; bonusRareCandy: boolean; free: boolean }>(
    "rollTour",
    { area }
  );

export const evoService = (
  action: "unlock_restraints" | "unlock_potential" | "new_adaptations",
  characterId: string,
  payload?: { moveName?: string; replaceMove?: string; payWith?: "pokecoin" | "snagemblem" }
) => call<{ ok: boolean }>("evoService", { action, characterId, ...payload });
