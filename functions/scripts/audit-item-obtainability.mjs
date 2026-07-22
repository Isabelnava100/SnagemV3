// Item obtainability audit. Cross-references every catalog item's rarity tier
// (src/data/item/rarityByItem.json) against where it can actually be obtained
// (the live `shops` + `recipes` collections, plus known static grants), and
// reports the non-flavor items that have NO obtain path yet, grouped by tier.
// This is the "what is missing for players to get" list.
//
// WRITES NOTHING. Auth (run from the functions/ dir):
//   gcloud auth application-default login
//   node scripts/audit-item-obtainability.mjs            # summary
//   node scripts/audit-item-obtainability.mjs --list     # also list every gap
//
// Caveat: it sees shops + recipes + the static grant list below. Items granted
// only by missions, mystery boxes, or admin tools that are not represented here
// may show as gaps; extend KNOWN_STATIC_GRANTS as those paths are wired in.

import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(readFileSync(join(__dirname, "../../src/data/item/item.json"), "utf8"));
const rarity = JSON.parse(readFileSync(join(__dirname, "../../src/data/item/rarityByItem.json"), "utf8"));

const RARITY_LABELS = { 0: "Flavor", 1: "Common", 2: "Uncommon", 3: "Rare", 4: "Epic", 5: "Legendary" };
// Mirror src/lib/itemSources.ts STATIC_SOURCES + any hand-known grants.
const KNOWN_STATIC_GRANTS = new Set(["item_0445", "item_0240"]);

const listMode = process.argv.includes("--list");

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const byId = {};
for (const it of Object.values(items)) byId[it["Item ID"]] = it;

// ---- collect every obtainable item id --------------------------------------
const obtainable = new Set(KNOWN_STATIC_GRANTS);
const shopSnap = await db.collection("shops").get();
shopSnap.forEach((doc) => {
  const s = doc.data();
  (s.sections ?? []).forEach((sec) => (sec.items ?? []).forEach((i) => i.itemId && obtainable.add(i.itemId)));
  (s.rare_section?.pool ?? []).forEach((i) => i.itemId && obtainable.add(i.itemId));
});
const recipeSnap = await db.collection("recipes").get();
recipeSnap.forEach((doc) => {
  const r = doc.data();
  if (r.output_item_id) obtainable.add(r.output_item_id);
});

console.log(`Shops read: ${shopSnap.size}, recipes: ${recipeSnap.size}, obtainable ids: ${obtainable.size}\n`);

// ---- find the gaps ----------------------------------------------------------
const gapsByTier = { 1: [], 2: [], 3: [], 4: [], 5: [] };
let flavor = 0;
for (const [id, tier] of Object.entries(rarity)) {
  if (tier === 0) { flavor++; continue; }
  if (obtainable.has(id)) continue;
  gapsByTier[tier].push(id);
}

const totalGaps = Object.values(gapsByTier).reduce((n, a) => n + a.length, 0);
console.log(`Non-flavor items with NO obtain path: ${totalGaps}  (flavor items skipped: ${flavor})\n`);
for (const tier of [1, 2, 3, 4, 5]) {
  const g = gapsByTier[tier];
  const groups = {};
  g.forEach((id) => { const grp = byId[id]?.Group ?? "?"; (groups[grp] = groups[grp] || []).push(byId[id]?.Name ?? id); });
  console.log(`Tier ${tier} ${RARITY_LABELS[tier]}: ${g.length} unobtainable`);
  Object.entries(groups).sort((a, b) => b[1].length - a[1].length).forEach(([grp, names]) => {
    console.log(`   ${grp} (${names.length})${listMode ? ": " + names.slice(0, 40).join(", ") : ""}`);
  });
}
process.exit(0);
