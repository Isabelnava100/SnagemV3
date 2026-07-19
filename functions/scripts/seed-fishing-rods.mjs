// Add the "Angler's Corner" (fishing rods) section to the Golden Sarcophagus
// shop so members can buy rods for the forum fishing encounter roll.
//
// Rod tiers set the Fishing Pond's bite odds (server: rollEncounter ROD_ODDS):
//   Old Rod 65/30/5 (1/2/3 star), Good Rod 60/30/10,
//   Super Rod 55/30/10 plus a 5% 4-star bite.
//
// Idempotent: replaces the section by title if it already exists.
//
// Validate without touching Firestore:
//   node scripts/seed-fishing-rods.mjs --check
// Seed (run from the functions/ dir, needs application-default credentials):
//   node scripts/seed-fishing-rods.mjs

import admin from "firebase-admin";

const SECTION_TITLE = "Angler's Corner";
const SHOP_ID = "golden-sarcophagus";

const RODS = [
  {
    itemId: "item_0445",
    name: "Old Rod",
    filePath: "key-item/old-rod.png",
    category: "key-item",
    price: 5,
    description:
      "A beat-up rod that still gets the job done. Bites: 1-star 65%, 2-star 30%, 3-star 5%.",
  },
  {
    itemId: "item_0446",
    name: "Good Rod",
    filePath: "key-item/good-rod.png",
    category: "key-item",
    price: 15,
    description: "A dependable rod for serious anglers. Bites: 1-star 60%, 2-star 30%, 3-star 10%.",
  },
  {
    itemId: "item_0447",
    name: "Super Rod",
    filePath: "key-item/super-rod.png",
    category: "key-item",
    price: 40,
    description:
      "The best rod money can buy. Bites: 1-star 55%, 2-star 30%, 3-star 10%, and a 5% shot at a 4-star catch.",
  },
];

if (process.argv.includes("--check")) {
  console.log(`OK: ${RODS.length} rods, section "${SECTION_TITLE}" for shop ${SHOP_ID}.`);
  process.exit(0);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "snagemguild" });
const db = admin.firestore();

const ref = db.doc(`shops/${SHOP_ID}`);
const snap = await ref.get();
if (!snap.exists) {
  console.error(`Shop ${SHOP_ID} does not exist. Run scripts/seed.mjs first.`);
  process.exit(1);
}
const sections = (snap.data().sections ?? []).filter((s) => s.title !== SECTION_TITLE);
sections.push({ title: SECTION_TITLE, items: RODS });
await ref.set({ sections }, { merge: true });
console.log(`Seeded "${SECTION_TITLE}" (${RODS.length} rods) into shops/${SHOP_ID}.`);
