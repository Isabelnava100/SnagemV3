import { db } from "../context/firebase";
import { EvolutionOption } from "../data/pokemon/evolutions";

/**
 * Apply an evolution the trainer chose. Updates the owned pokemon in place
 * (species, display name, sprite slug and dex number) so its level and earned
 * XP carry straight over, then spends one of the required item when the method
 * needs one. Owned bag docs are owner-writable per Firestore rules, so this
 * runs client-side like the rest of the bag.
 */
export const evolvePokemon = async (
  uid: string,
  pokemonId: string,
  option: EvolutionOption,
  spendItemId?: string
): Promise<void> => {
  const { doc, updateDoc, increment } = await import("firebase/firestore");

  await updateDoc(doc(db, "users", uid, "bag", "owned_pokemons"), {
    [`${pokemonId}.species`]: option.toName,
    [`${pokemonId}.name`]: option.toName,
    [`${pokemonId}.image_slug`]: option.toSlug,
    [`${pokemonId}.pokedex`]: String(option.toIdx),
  });

  if (spendItemId) {
    await updateDoc(doc(db, "users", uid, "bag", "items"), {
      [`${spendItemId}.quantity`]: increment(-1),
    });
  }
};
