// Generate src/data/item/rarityByItem.json: an obtainability rarity tier (1-5)
// for every catalog item, plus 0 = "flavor" (pure dex decoration, not part of
// the economy, excluded from the obtainability audit). Mirrors gen-stars.mjs.
//
//   Tier 1 Common     base shop stock, always buyable
//   Tier 2 Uncommon   craft / trade / berry farm / recycle / mid shop
//   Tier 3 Rare       RNG only (tours roll, fishing, box, daily-rare, casino)
//   Tier 4 Epic       mission / challenge / research reward, special shop
//   Tier 5 Legendary  admin / event grant only, plot-unique
//   Tier 0 flavor     decorative key item, not obtainable by design
//
// Admin can override any item afterward (admin/item_rarity_overrides), so these
// heuristics only need to be a good first pass. Run: node scripts/gen-item-rarity.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ITEMS_PATH = join(__dirname, "../src/data/item/item.json");
const OUT_PATH = join(__dirname, "../src/data/item/rarityByItem.json");

const items = JSON.parse(readFileSync(ITEMS_PATH, "utf8"));

// Whole groups that map to one tier.
const GROUP_TIER = {
  medicine: 1,
  berry: 2,
  "evo-item": 3,
  "mega-stone": 4,
  "z-crystals": 4,
  fossil: 4,
  "valuable-item": 3,
  // Repeatable secondary-system items (craft / trade / farm / mid shop).
  "hold-item": 2,
  tm: 2,
  tr: 2,
  hm: 2,
  mint: 2,
  gem: 2,
  plate: 2,
  memory: 2,
  roto: 2,
  incense: 2,
  scarf: 2,
  flute: 2,
  mulch: 2,
  petal: 2,
  shard: 2,
  "av-candy": 2,
  "exp-candy": 2,
  "poke-candy": 2,
  "battle-item": 2,
  "ev-item": 2,
  storage: 2,
  apricorn: 2,
  mail: 2,
  "curry-ingredient": 2,
  "partner-gift": 2,
};

// Balls: most are common, a handful are special or legendary.
const BALL_LEGENDARY = new Set(["master"]);
const BALL_EPIC = new Set(["beast", "cherish", "dream", "safari", "sport", "park", "strange"]);

// Functional key items (tools/charms/rods) are real rewards; the rest are flavor.
const KEY_FUNCTIONAL = [
  "rod", "charm", "bike", "escape-rope", "radar", "itemfinder", "dowsing",
  "vs-seeker", "coin-case", "apricorn-box", "berry-pots", "bracelet",
  "key-stone", "z-ring", "z-power-ring", "dynamax-band", "mega-ring",
];

// other-item: a few standouts are epic, coupons uncommon, rest rare.
const OTHER_EPIC = new Set(["bottle-cap", "gold-bottle-cap", "ability-patch", "dynamax-crystal", "armorite-ore", "dynite-ore"]);

function tierFor(item) {
  const g = item.Group;
  const n = String(item.Name || "").toLowerCase();

  if (g === "ball") {
    if (BALL_LEGENDARY.has(n)) return 5;
    if (BALL_EPIC.has(n)) return 4;
    return 1;
  }
  if (g === "medicine") {
    if (n.includes("ability")) return 3; // ability capsule/patch
    return 1;
  }
  if (g === "other-item") {
    if (OTHER_EPIC.has(n)) return 4;
    if (n.includes("coupon")) return 2;
    return 3;
  }
  if (g === "key-item") {
    if (KEY_FUNCTIONAL.some((f) => n.includes(f))) return 4;
    return 0; // flavor
  }
  return GROUP_TIER[g] ?? 2;
}

const out = {};
const tally = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const item of Object.values(items)) {
  const id = item["Item ID"];
  if (!id) continue;
  const t = tierFor(item);
  out[id] = t;
  tally[t]++;
}

writeFileSync(OUT_PATH, JSON.stringify(out) + "\n");
console.log(`Wrote ${Object.keys(out).length} item rarities to ${OUT_PATH}`);
console.log("By tier:", JSON.stringify(tally));
