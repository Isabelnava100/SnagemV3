// One-off: backfill publicProfiles/{uid} for every existing member, so
// logged-out visitors can view profiles created before the syncPublicProfile
// trigger existed. New/edited members sync automatically from then on.
//
// Auth (run from the functions/ dir, same as seed.mjs):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//   node scripts/backfill-public-profiles.mjs
//
// Writes ONLY world-safe display fields. Never copies email; Discord
// (discordUID + discordUsername) is copied only for members who opted in
// via discordPublic on the users doc.

import admin from "firebase-admin";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

// Keep in sync with publicProfileFrom() in functions/src/index.ts.
function publicProfileFrom(data) {
  return {
    username: data.username ?? "",
    avatar: data.avatar ?? "",
    badges: Array.isArray(data.badges) ? data.badges : [],
    permissions: data.permissions ?? "",
    signature: data.signature ?? "",
    emojis: Array.isArray(data.emojis) ? data.emojis : [],
    joinedAt: data.joinedAt ?? null,
    ...(data.discordPublic === true && data.discordUID
      ? { discordUID: data.discordUID, discordUsername: data.discordUsername ?? "" }
      : {}),
  };
}

async function run() {
  const users = await db.collection("users").get();
  let batch = db.batch();
  let pending = 0;
  let written = 0;
  for (const d of users.docs) {
    batch.set(db.doc(`publicProfiles/${d.id}`), publicProfileFrom(d.data()), { merge: false });
    pending++;
    written++;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  console.log(`Backfilled ${written} public profiles.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
