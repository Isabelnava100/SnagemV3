// Generate the star rating (1..7) for every National Pokedex species.
//
// Stars set how many posts it takes to beat an encounter in the forum game
// (see STAR_POSTS_TO_BEAT in src/lib/encounterStars.ts and its mirror in
// functions/src/index.ts). The banding follows the Safari Contest default
// pools' spirit for 1..5 (weak commons up to strong fully-evolved species,
// bucketed by base stat total), with two fixed rules from the owner:
//   6 star: pseudo-legendary class (non-legendary BST >= 600, e.g. Garchomp)
//   7 star: legendaries and mythicals (the repo's own battleStages "legendary"
//           list, which also covers Ultra Beasts and Paradox species)
//
// Base stat totals come from @pkmn/dex (already a dev dependency). Output is
// written to BOTH copies (functions cannot import from src):
//   functions/src/starByDex.json
//   src/data/pokemon/starByDex.json
//
// Run from the repo root:  node scripts/gen-stars.mjs
import { Dex } from "@pkmn/dex";
import fs from "fs";

const MAX_DEX = 1025;

const battleStages = JSON.parse(
  fs.readFileSync(new URL("../functions/src/battleStages.json", import.meta.url), "utf8")
);

// BST bands for 1..5 star, calibrated against the Johto Meadow Safari pools
// (azurill/sunkern ~1 star, taillow/wooper ~2, gloom/nuzleaf ~3,
// breloom/cinccino ~4, chansey-class ~5).
function starForBst(bst) {
  if (bst >= 600) return 6;
  if (bst >= 500) return 5;
  if (bst >= 420) return 4;
  if (bst >= 330) return 3;
  if (bst >= 250) return 2;
  return 1;
}

const bstByNum = new Map();
for (const s of Dex.species.all()) {
  if (s.forme) continue; // base forms only; forms share their species' dex entry
  if (typeof s.num !== "number" || s.num < 1 || s.num > MAX_DEX) continue;
  if (bstByNum.has(s.num)) continue;
  const bst = Object.values(s.baseStats).reduce((a, b) => a + b, 0);
  bstByNum.set(s.num, { name: s.name, bst });
}

const stars = {};
const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
const sixStars = [];
let missing = 0;

for (let n = 1; n <= MAX_DEX; n++) {
  const entry = bstByNum.get(n);
  if (!entry) {
    console.warn(`No base stats for dex ${n}; defaulting to 3 star.`);
    stars[String(n)] = 3;
    dist[3]++;
    missing++;
    continue;
  }
  let star;
  if (battleStages[String(n)] === "legendary") {
    star = 7;
  } else {
    star = starForBst(entry.bst);
  }
  stars[String(n)] = star;
  dist[star]++;
  if (star === 6) sixStars.push(`${n} ${entry.name} (${entry.bst})`);
}

const json = JSON.stringify(stars) + "\n";
fs.writeFileSync(new URL("../functions/src/starByDex.json", import.meta.url), json);
fs.writeFileSync(new URL("../src/data/pokemon/starByDex.json", import.meta.url), json);

console.log("distribution:", dist, "missing:", missing);
console.log("6-star class:", sixStars.join(", "));
const spot = (name) => {
  const s = Dex.species.get(name);
  console.log(`${name}: dex ${s.num} -> ${stars[String(s.num)]} star`);
};
["Caterpie", "Pikachu", "Gloom", "Breloom", "Charizard", "Garchomp", "Mewtwo", "Mew", "Kartana", "Great Tusk"].forEach(spot);
