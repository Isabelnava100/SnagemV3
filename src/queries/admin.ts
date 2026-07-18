import { AdminPokemonList } from "../components/types/typesUsed";

export const getPokemonLists = async () => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  const data = (await getDoc(doc(db, "admin", "pokemon_lists"))).data() as Record<
    string,
    Omit<AdminPokemonList, "id">
  >;

  if (!data) return { data: {}, formattedData: [] };

  const formattedData = Object.keys(data).map((id) => ({
    id,
    ...data[id],
  })) as AdminPokemonList[];

  return { data, formattedData };
};

export const getUsers = async () => {
  const { getDocs, collection } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  const data = (await getDocs(collection(db, "users"))).docs.map((doc) => {
    const user = doc.data();
    return { id: doc.id, username: user.username };
  });
  return data;
};

/**
 * Per-species star overrides (admin/star_overrides): a sparse map of national
 * dex number -> star 1..7 that admins set from the Library Pokedex. Species
 * not in the map use the generated default (src/lib/encounterStars.ts). The
 * server reads the same doc in rollEncounter, so an override changes the
 * posts-to-beat everywhere.
 */
export const getStarOverrides = async (): Promise<Record<string, number>> => {
  const { getDoc, doc } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  const data = (await getDoc(doc(db, "admin", "star_overrides"))).data() ?? {};
  const clean: Record<string, number> = {};
  for (const [idx, star] of Object.entries(data)) {
    const s = Math.trunc(Number(star));
    if (s >= 1 && s <= 7) clean[idx] = s;
  }
  return clean;
};

/** Set one species' star override; pass null to reset it to the default. */
export const setStarOverride = async (idx: string, star: number | null): Promise<void> => {
  const { setDoc, doc, deleteField } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  const key = String(Number(idx));
  await setDoc(
    doc(db, "admin", "star_overrides"),
    { [key]: star === null ? deleteField() : Math.trunc(star) },
    { merge: true }
  );
};
