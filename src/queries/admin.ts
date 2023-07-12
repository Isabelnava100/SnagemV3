import { AdminPokemonList } from "../components/types/typesUsed";
import { db } from "../context/firebase";

export const getPokemonLists = async () => {
  const { getDoc, doc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "admin", "pokemon_lists"))).data() as Record<
    string,
    Omit<AdminPokemonList, "id">
  >;

  if (!data) return { data: [], formattedData: [] };

  const formattedData = Object.keys(data).map((id) => ({
    id,
    ...data[id],
  })) as AdminPokemonList[];

  return { data, formattedData };
};
