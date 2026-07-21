// Add the Ambrosial Alchemy crafting storefront doc (kind "craft") without
// re-running the full seed. Recipes themselves are seeded by seed.mjs; the
// Mall's CraftBody lists whatever is in the recipes collection.
//
// Run from the functions/ dir (needs application-default credentials):
//   node scripts/seed-ambrosial-shop.mjs

import admin from "firebase-admin";

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "snagemguild" });
const db = admin.firestore();

await db.doc("shops/ambrosial-alchemy").set(
  {
    name: "Ambrosial Alchemy",
    type: "Crafting Cauldron",
    kind: "craft",
    currency: "pokecoin",
    npc_name: "Ambrosia",
    order: 5,
    active: true,
    flavor_intro:
      "<p>Bring ingredients and coin, and Ambrosia's cauldron does the rest. Every recipe lists what it needs; failed brews still eat the ingredients, so read the success rate.</p>",
  },
  { merge: true }
);
console.log("Seeded shops/ambrosial-alchemy (kind: craft).");
