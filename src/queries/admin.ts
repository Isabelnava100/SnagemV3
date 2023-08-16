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
