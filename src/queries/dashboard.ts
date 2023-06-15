import {
  Character,
  Currencies,
  Draft,
  Item,
  OwnedPokemon,
  Profile,
  Team,
} from "../components/types/typesUsed";
import { db } from "../context/firebase";

export const getCurrencies = async (uid: string): Promise<Currencies> => {
  const { doc, getDoc } = await import("firebase/firestore");
  return (await getDoc(doc(db, "users", uid, "bag", "currency"))).data() as Currencies;
};

export const getItems = async (uid: string): Promise<Item[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "users", uid, "bag", "items"))).data() as Record<
    string,
    Omit<Item, "name">
  >;
  const formattedData = Object.keys(data).map((name) => ({
    name,
    category: data[name].category,
    quantity: data[name].quantity,
    action: data[name].action,
    box_id: data[name].box_id,
  })) as Item[];
  return formattedData;
};

export const getDrafts = async (uid: string): Promise<Draft[]> => {
  const { getDocs, collection } = await import("firebase/firestore");
  const query = await getDocs(collection(db, "users", uid, "drafts"));
  const data: Draft[] = [];

  query.forEach((item) => {
    const newItem = {
      id: item.id,
      ...item.data(),
    };
    data.push(newItem as Draft);
  });

  return data;
};

export const getCharacters = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "users", uid, "bag", "characters"))).data() as Record<
    string,
    Character
  >;
  const formattedData = Object.keys(data).map((key) => {
    const character = data[key] as Character;
    return { ...character, id: key };
  }) as Character[];
  const sortedData = formattedData.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
  return { sortedData, rawData: data };
};

export const getOwnedPokemons = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");

  const data = (await getDoc(doc(db, "users", uid, "bag", "owned_pokemons"))).data() as Record<
    string,
    Omit<OwnedPokemon, "id">
  >;

  const formattedData = Object.keys(data).map((key) => {
    const character = data[key] as Omit<OwnedPokemon, "id">;
    return { ...character, id: key };
  }) as OwnedPokemon[];

  const sortedData = formattedData.sort((a, b) => a.date_caught.seconds - b.date_caught.seconds);

  return { sortedData, rawData: data };
};

export const getTeams = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");

  const data = (await getDoc(doc(db, "users", uid, "bag", "teams"))).data() as Record<
    string,
    Omit<Team, "id">
  >;

  const { sortedData: ownedPokemons } = await getOwnedPokemons(uid);
  const ownedPokemonIds = ownedPokemons.map((pokemon) => pokemon.id);

  const formattedData = Object.keys(data).map((key) => {
    const team = data[key] as Omit<Team, "id">;

    const teamPokemons = ownedPokemons.filter((pokemon) => team.pokemon_ids.includes(pokemon.id));

    return { ...team, id: key, pokemons: teamPokemons };
  }) as Team[];

  const sortedData = formattedData.sort((a, b) => a.created_at.seconds - b.created_at.seconds);

  return { sortedData, rawData: data };
};

export const getProfile = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "users", uid, "bag", "profile"))).data() as Profile;
  return data;
};
