// Generate the type(s) of every National Pokedex species (base forms).
//
// Used by the battle system's type-effectiveness scaling: a post's damage
// against an enemy and the enemy's counter-attack are both multiplied by the
// attacker-vs-defender type matchup (see src/lib/typeChart.ts and its mirror
// in functions/src/index.ts).
//
// Types come from @pkmn/dex (already a dev dependency). Output is written to
// BOTH copies (functions cannot import from src):
//   functions/src/typesByDex.json
//   src/data/pokemon/typesByDex.json
//
// Run from the repo root:  node scripts/gen-types.mjs
import { Dex } from "@pkmn/dex";
import fs from "fs";

const MAX_DEX = 1025;

const types = {};
let missing = 0;
for (const s of Dex.species.all()) {
  if (s.forme) continue;
  if (typeof s.num !== "number" || s.num < 1 || s.num > MAX_DEX) continue;
  if (types[String(s.num)]) continue;
  types[String(s.num)] = s.types;
}
for (let n = 1; n <= MAX_DEX; n++) {
  if (!types[String(n)]) {
    console.warn(`No types for dex ${n}; defaulting to Normal.`);
    types[String(n)] = ["Normal"];
    missing++;
  }
}

const json = JSON.stringify(types) + "\n";
fs.writeFileSync(new URL("../functions/src/typesByDex.json", import.meta.url), json);
fs.writeFileSync(new URL("../src/data/pokemon/typesByDex.json", import.meta.url), json);
console.log("species:", Object.keys(types).length, "missing:", missing);
["Charizard", "Squirtle", "Gengar", "Magikarp"].forEach((n) => {
  const s = Dex.species.get(n);
  console.log(`${n}:`, types[String(s.num)]);
});
