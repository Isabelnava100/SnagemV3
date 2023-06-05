import { Character, Currencies, Draft, Item } from "../components/types/typesUsed";
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
  return sortedData;
};
