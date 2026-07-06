import { db } from "../context/firebase";

/**
 * A member card for the Snagem Members directory. Enriches each users doc with
 * cheap per-user bag counts and the featured character. Post count is a
 * best-effort collectionGroup aggregation (one count read per member); it falls
 * back to null if the composite index is missing so the directory never breaks.
 *
 * Reads per member: users doc + bag/profile + bag/characters + bag/owned_pokemons
 * + 1 posts count. Fine for a guild of this size; denormalize onto the users doc
 * (postCount, charCount, pokemonCount) if the roster ever gets large.
 */
export interface MemberCard {
  id: string;
  username: string;
  avatar?: string;
  permissions?: string;
  joinedAt?: { seconds: number };
  postCount: number | null;
  charCount: number;
  pokemonCount: number;
  featured?: { name: string; imageURL?: string };
}

export const getMembers = async (): Promise<MemberCard[]> => {
  const {
    collection,
    getDocs,
    doc,
    getDoc,
    collectionGroup,
    query,
    where,
    getCountFromServer,
  } = await import("firebase/firestore");

  const snap = await getDocs(collection(db, "users"));

  return Promise.all(
    snap.docs.map(async (d) => {
      const u = d.data();
      const uid = d.id;

      const [profileSnap, charsSnap, pokeSnap] = await Promise.all([
        getDoc(doc(db, "users", uid, "bag", "profile")),
        getDoc(doc(db, "users", uid, "bag", "characters")),
        getDoc(doc(db, "users", uid, "bag", "owned_pokemons")),
      ]);

      const chars = (charsSnap.data() as Record<string, { name: string; imageURL?: string }>) || {};
      const pokes = (pokeSnap.data() as Record<string, unknown>) || {};
      const profile = (profileSnap.data() as { featuredCharacterId?: string }) || {};

      const featuredChar = profile.featuredCharacterId ? chars[profile.featuredCharacterId] : undefined;

      let postCount: number | null = null;
      try {
        const agg = await getCountFromServer(
          query(collectionGroup(db, "posts"), where("ownerUid", "==", uid))
        );
        postCount = agg.data().count;
      } catch {
        postCount = null;
      }

      return {
        id: uid,
        username: u.username ?? "",
        avatar: u.avatar,
        permissions: u.permissions,
        joinedAt: u.joinedAt,
        postCount,
        charCount: Object.keys(chars).length,
        pokemonCount: Object.keys(pokes).length,
        featured: featuredChar ? { name: featuredChar.name, imageURL: featuredChar.imageURL } : undefined,
      } as MemberCard;
    })
  );
};
