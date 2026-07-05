// Extend src/data/pokemon/pokemon.json to the full National Pokedex (1..1025).
// Existing entries (1..905) are kept as-is; 906..1025 are added from Showdown
// data (@pkmn/dex, dev dependency) with pokesprite-style slugs.
// Run from the repo root:  node scripts/gen-species.mjs
import { Dex } from "@pkmn/dex";
import fs from "fs";

const path = new URL("../src/data/pokemon/pokemon.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(path, "utf8"));

const have = new Set(Object.values(data).map((p) => Number(p.idx)));

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[.'’:]/g, "")
    .replace(/[éÉ]/g, "e")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const byNum = new Map();
for (const s of Dex.species.all()) {
  if (s.forme) continue;
  if (typeof s.num !== "number" || s.num < 1 || s.num > 1025) continue;
  if (!byNum.has(s.num)) byNum.set(s.num, s.name);
}

let added = 0;
for (let n = 906; n <= 1025; n++) {
  if (have.has(n)) continue;
  const name = byNum.get(n);
  if (!name) continue;
  const key = String(n).padStart(3, "0");
  data[key] = { idx: key, name: { eng: name }, slug: { eng: slugify(name) } };
  added++;
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
console.log("added:", added, "total:", Object.keys(data).length);
console.log("906:", JSON.stringify(data["906"]));
console.log("1025:", JSON.stringify(data["1025"]));
