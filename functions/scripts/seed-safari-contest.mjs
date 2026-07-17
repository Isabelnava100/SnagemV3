// Seed the default Safari Contest config (admin/safari_config).
//
// Writes the classic Johto Safari Zone "Meadow Zone" as a ready-to-launch
// contest: five star pools bucketed from the original contest list, the classic
// 40/25/20/10/5 encounter rates, odd posts-to-defeat (floored at 3 so there is
// always a window to catch before a knockout), and the old prize table.
//
// The web app also ships this same default (src/lib/safari.ts), so an admin can
// simply open Admin -> Manage -> Safari Contest and Save. This script is the
// no-UI way to seed it, and doubles as an offline slug check.
//
// Validate the slug table without touching Firestore:
//   node scripts/seed-safari-contest.mjs --check
// Seed (run from the functions/ dir, needs application-default credentials):
//   node scripts/seed-safari-contest.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const pokemonJSON = JSON.parse(readFileSync(resolve(here, "../src/pokemon.json"), "utf8"));
const knownSlugs = new Set(
  Object.values(pokemonJSON)
    .map((p) => p.slug?.eng)
    .filter(Boolean)
);

// star -> pool (unique species from the original Meadow Zone list; the old flat
// 0-star Mankey sits in 1 star, the 6-star Shiny Pikachu sits in 5 star as
// Pikachu, and shininess still rolls at catch time).
const POOLS = {
  1: ["azurill", "oddish", "sunkern", "seedot", "hoppip", "mankey"],
  2: ["buneary", "cleffa", "taillow", "smoochum", "igglybuff", "surskit", "wooper", "shroomish"],
  3: ["skiploom", "vulpix", "marill", "gloom", "minccino", "sunflora", "nuzleaf"],
  4: ["clefairy", "jigglypuff", "masquerain", "breloom", "azumarill", "jynx", "cinccino"],
  5: ["zorua", "feebas", "chansey", "pikachu"],
};
const RATES = { 1: 40, 2: 25, 3: 20, 4: 10, 5: 5 };
const POSTS_TO_DEFEAT = { 1: 3, 2: 5, 3: 7, 4: 9, 5: 11 };

const config = {
  name: "Johto Safari Contest: Meadow Zone",
  blurb:
    "Welcome to the Safari Zone Meadow, a beautiful meadow of flowers, clean ponds and the greenest grass. Hunt the grass for the best Pokemon you can find, then fight, feed or throw a ball to bring it home. The rarest catch, roleplayed the best, wins.",
  tiers: [1, 2, 3, 4, 5].map((star) => ({
    star,
    rate: RATES[star],
    postsToDefeat: POSTS_TO_DEFEAT[star],
    pokemons: POOLS[star],
  })),
  runAwayChance: 5,
  berryBonus: 5,
  berryBonusCap: 25,
  encountersPerPlayer: 20,
  prizeCoins: [10, 10, 7],
  consolationCoins: 3,
  catches: {},
  results: null,
  finalized: false,
};

// --- Validation -----------------------------------------------------------
const bad = [];
for (const [star, pool] of Object.entries(POOLS)) {
  for (const slug of pool) if (!knownSlugs.has(slug)) bad.push(`${star}star: ${slug}`);
}
if (bad.length) {
  console.error("Unknown slugs (fix these before seeding):\n  " + bad.join("\n  "));
  process.exit(1);
}
const total = Object.values(config.tiers).reduce((s, t) => s + t.rate, 0);
console.log(
  `OK: ${config.tiers.length} tiers, ${Object.values(POOLS).reduce(
    (n, p) => n + p.length,
    0
  )} pokemon, total weight ${total}.`
);

if (process.argv.includes("--check")) {
  console.log("Check only, nothing written.");
  process.exit(0);
}

// --- Write ----------------------------------------------------------------
// Stored in the named-zone library (admin/safari_config.zones), keyed so
// re-running updates the Meadow Zone in place without touching other zones.
const { default: admin } = await import("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
await db.doc("admin/safari_config").set({ zones: { "meadow-zone": config } }, { merge: true });
console.log("Wrote admin/safari_config.zones.meadow-zone.");
process.exit(0);
