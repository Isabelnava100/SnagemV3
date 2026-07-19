// Generate the egg group list for every National Pokedex species.
//
// Used by the Daycare's breeding compatibility (functions breedPokemon) and
// the pokemon info boxes. Species in the "Undiscovered" group cannot breed
// at all (this covers legendaries, mythicals and most babies, matching the
// owner's "no legendary breeding" rule).
//
// Data comes from @pkmn/dex (already a dev dependency). Output is written to
// BOTH copies (functions cannot import from src):
//   functions/src/eggGroupsByDex.json
//   src/data/pokemon/eggGroupsByDex.json
//
// Run from the repo root:  node scripts/gen-egggroups.mjs
import { Dex } from "@pkmn/dex";
import fs from "fs";

const MAX_DEX = 1025;

const out = {};
for (const species of Dex.species.all()) {
  const num = species.num;
  if (num < 1 || num > MAX_DEX) continue;
  if (species.forme) continue; // base forms only, same as the star/type maps
  const groups = (species.eggGroups ?? []).filter(Boolean);
  out[String(num)] = groups.length ? groups : ["Undiscovered"];
}

let missing = 0;
for (let i = 1; i <= MAX_DEX; i++) {
  if (!out[String(i)]) {
    out[String(i)] = ["Undiscovered"];
    missing++;
  }
}

const json = JSON.stringify(out);
fs.writeFileSync(new URL("../functions/src/eggGroupsByDex.json", import.meta.url), json);
fs.writeFileSync(new URL("../src/data/pokemon/eggGroupsByDex.json", import.meta.url), json);
console.log(`Wrote egg groups for ${MAX_DEX} species (${missing} filled as Undiscovered).`);
const counts = {};
Object.values(out).forEach((gs) => gs.forEach((g) => (counts[g] = (counts[g] ?? 0) + 1)));
console.log(counts);
