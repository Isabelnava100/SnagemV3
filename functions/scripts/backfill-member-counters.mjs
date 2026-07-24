// One-off: backfill the denormalized directory counters (postCount,
// characterCount, pokemonCount) onto publicProfiles/{uid} for every existing
// member. Run AFTER deploying the functions that maintain them
// (publishForumPost increments postCount; syncPublicProfileCharacterCount /
// syncPublicProfilePokemonCount recount the bag maps), so the triggers take
// over from a correct baseline.
//
// Auth (run from the functions/ dir, same as seed.mjs):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//   node scripts/backfill-member-counters.mjs
//
// Semantics match the writers: postCount covers REAL member posts only
// (type "user", plus legacy posts written before the type field existed),
// not edits (they create no doc) and not system announcements (evolution,
// shadowed, boss_end). NOTE: the ownerUid+type count may need a composite
// index; Firestore prints a one-click creation link on the first run.
// Merge-writes, so the display fields synced by syncPublicProfile are
// untouched. Cost per member: 2 bag doc reads + 1 count aggregation
// (1 read per 1000 index entries).

import admin from "firebase-admin";
import { Filter } from "firebase-admin/firestore";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

async function countersFor(uid) {
  const [charsSnap, pokeSnap, postAgg] = await Promise.all([
    db.doc(`users/${uid}/bag/characters`).get(),
    db.doc(`users/${uid}/bag/owned_pokemons`).get(),
    db
      .collectionGroup("posts")
      .where("ownerUid", "==", uid)
      .where(Filter.or(Filter.where("type", "==", "user"), Filter.where("type", "==", null)))
      .count()
      .get(),
  ]);
  return {
    characterCount: Object.keys(charsSnap.data() ?? {}).length,
    pokemonCount: Object.keys(pokeSnap.data() ?? {}).length,
    postCount: postAgg.data().count,
  };
}

async function run() {
  const users = await db.collection("users").get();
  let batch = db.batch();
  let pending = 0;
  let written = 0;
  for (const d of users.docs) {
    const counters = await countersFor(d.id);
    batch.set(db.doc(`publicProfiles/${d.id}`), counters, { merge: true });
    pending++;
    written++;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  console.log(`Backfilled directory counters for ${written} members.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
