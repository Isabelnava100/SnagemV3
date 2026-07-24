import { getDb } from "../context/firebase";

/**
 * World-safe mirror of a users doc (server-written only; see
 * syncPublicProfile in functions/src/index.ts). The three counters are
 * denormalized and eventually consistent: postCount increments once per
 * published member post (edits and system announcements do not count; it
 * replaced a live collectionGroup count, so it can lag a post or two),
 * characterCount / pokemonCount are recounted by bag-doc triggers.
 */
export interface PublicProfile {
  username: string;
  avatar?: string;
  permissions?: string;
  joinedAt?: { seconds: number };
  postCount?: number;
  characterCount?: number;
  pokemonCount?: number;
}

/**
 * A member card for the Snagem Members directory. Counts come straight off
 * the publicProfiles mirror (the users collection is owner/staff-only), so
 * the directory costs 1 read per member plus 2 small bag docs (bag/profile +
 * bag/characters) for the featured character tile, which the mirror does not
 * carry. postCount is null until the counter backfill has run (or for
 * members with no counted posts yet), and the card shows "-" for it.
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
  const { collection, getDocs, doc, getDoc } = await import("firebase/firestore");

  const db = await getDb();
  const snap = await getDocs(collection(db, "publicProfiles"));

  return Promise.all(
    snap.docs.map(async (d) => {
      const u = d.data() as PublicProfile;
      const uid = d.id;

      // Featured character tile only: the mirror carries no bag data.
      const [profileSnap, charsSnap] = await Promise.all([
        getDoc(doc(db, "users", uid, "bag", "profile")),
        getDoc(doc(db, "users", uid, "bag", "characters")),
      ]);

      const chars = (charsSnap.data() as Record<string, { name: string; imageURL?: string }>) || {};
      const profile = (profileSnap.data() as { featuredCharacterId?: string }) || {};

      const featuredChar = profile.featuredCharacterId ? chars[profile.featuredCharacterId] : undefined;

      return {
        id: uid,
        username: u.username ?? "",
        avatar: u.avatar,
        permissions: u.permissions,
        joinedAt: u.joinedAt,
        postCount: typeof u.postCount === "number" ? u.postCount : null,
        charCount: u.characterCount ?? 0,
        pokemonCount: u.pokemonCount ?? 0,
        featured: featuredChar ? { name: featuredChar.name, imageURL: featuredChar.imageURL } : undefined,
      } as MemberCard;
    })
  );
};
