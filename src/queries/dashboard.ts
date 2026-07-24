import {
  Bookmark,
  Character,
  Currencies,
  Draft,
  Item,
  OwnedPokemon,
  Profile,
  Team,
} from "../components/types/typesUsed";
import { getDb } from "../context/firebase";
import { itemData } from "../data/item";

export const getCurrencies = async (uid: string): Promise<Currencies> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid, "bag", "currency"))).data() as Currencies;
  return data || [];
};

export const getItems = async (uid: string): Promise<Item[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid, "bag", "items"))).data() as Record<
    string,
    Omit<Item, "id">
  >;
  if (!data) return [];
  // Always resolve the display name + sprite from the canonical catalog by id
  // (older bag entries stored raw slug names / stale paths); fall back to the
  // stored values for anything not in the catalog.
  const formattedData = Object.entries(data).map(([id, entry]) => {
    const catalog = itemData.find((item) => item.id === id);
    return {
      id,
      name: catalog?.name ?? entry.name,
      category: catalog?.category ?? entry.category,
      quantity: entry.quantity,
      filePath: catalog?.filePath ?? entry.filePath,
    };
  }) as Item[];
  return formattedData;
};

export const getDrafts = async (uid: string): Promise<Draft[]> => {
  const { getDocs, collection } = await import("firebase/firestore");
  const db = await getDb();
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

export const getBookmarks = async (uid: string) => {
  // One doc per forum location, each a threadId-keyed map of bookmarks.
  const { collection, getDocs } = await import("firebase/firestore");
  const db = await getDb();
  const snapshot = await getDocs(collection(db, "users", uid, "bookmarks"));
  const rawData: Record<string, Bookmark> = {};
  const formattedData: Bookmark[] = [];
  snapshot.forEach((docSnap) => {
    const forumLink = docSnap.id;
    const data = docSnap.data() as Record<string, Bookmark>;
    Object.entries(data).forEach(([threadId, entry]) => {
      const bookmark = {
        ...entry,
        id: `${forumLink}/${threadId}`,
        threadID: entry.threadID ?? threadId,
        threadLocation: (entry.threadLocation ?? forumLink) as Bookmark["threadLocation"],
      };
      rawData[bookmark.id] = bookmark;
      formattedData.push(bookmark);
    });
  });
  // Guard the timestamp: one legacy bookmark without `date` must not throw and
  // wipe the whole list.
  const sortedData = formattedData.sort(
    (a, b) => (a.date?.seconds ?? 0) - (b.date?.seconds ?? 0)
  );
  return { sortedData, rawData };
};

export const getCharacters = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid, "bag", "characters"))).data() as Record<
    string,
    Character
  >;
  if (!data) return { sortedData: [], rawData: {} };
  const formattedData = Object.keys(data).map((key) => {
    const character = data[key] as Character;
    return { ...character, id: key };
  }) as Character[];
  // Guard the timestamp: one legacy character without `createdAt` must not throw
  // and hide every character.
  const sortedData = formattedData.sort(
    (a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)
  );
  return { sortedData, rawData: data };
};

export const getOwnedPokemons = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();

  const data = (await getDoc(doc(db, "users", uid, "bag", "owned_pokemons"))).data() as Record<
    string,
    Omit<OwnedPokemon, "id">
  >;

  if (!data) return { sortedData: [], rawData: {} };

  const formattedData = Object.keys(data).map((key) => {
    const character = data[key] as Omit<OwnedPokemon, "id">;
    return { ...character, id: key };
  }) as OwnedPokemon[];

  const sortedData = formattedData.sort(
    (a, b) => (a.date_caught?.seconds ?? 0) - (b.date_caught?.seconds ?? 0)
  );

  return { sortedData, rawData: data };
};

/**
 * Teams WITHOUT the owned-pokemon cascade: one doc read. Combine with a
 * (cached) getOwnedPokemons query via hydrateTeams. Previously every teams
 * read silently re-fetched the whole owned_pokemons doc as well.
 */
export const getTeamsRaw = async (uid: string): Promise<Team[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();

  const data = (await getDoc(doc(db, "users", uid, "bag", "teams"))).data() as Record<
    string,
    Omit<Team, "id">
  >;

  if (!data) return [];

  const formattedData = Object.keys(data).map((key) => {
    const team = data[key] as Omit<Team, "id">;
    // Guard malformed docs so downstream render code never crashes.
    return { ...team, id: key, pokemon_ids: team.pokemon_ids ?? [], pokemons: [] };
  }) as Team[];

  return formattedData.sort(
    (a, b) => (a.created_at?.seconds ?? 0) - (b.created_at?.seconds ?? 0)
  );
};

/** Fill each team's pokemons from an already-fetched owned-pokemon list. */
export const hydrateTeams = (teams: Team[], ownedPokemons: OwnedPokemon[]): Team[] =>
  teams.map((team) => ({
    ...team,
    pokemons: ownedPokemons.filter((pokemon) => (team.pokemon_ids ?? []).includes(pokemon.id)),
  }));

export const getProfile = async (uid: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getDb();
  const data = (await getDoc(doc(db, "users", uid, "bag", "profile"))).data() as Profile;
  return data || {};
};
