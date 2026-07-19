// Seed the default PUBLIC encounter lists: four habitat lists per region
// (Kanto through Paldea), auto-built from each region's dex range. Only 1-4
// star species are included (admin star overrides honored), so with the
// server's star-weighted roll every 4 star entry lands on ~5% of rolls.
//
// With --wipe it ALSO deletes every hand-made list (anything that is not a
// mission pool and not one of these region lists). Used once for the July 2026
// test-data cleanup; without the flag re-running only refreshes the region
// lists and leaves admin-created lists alone.
//
// Idempotent: fixed ids (region-<region>-<area>) + merge writes.
//
// Preview without touching Firestore:
//   node scripts/seed-region-lists.mjs --check
// Seed (run from the functions/ dir, needs application-default credentials):
//   node scripts/seed-region-lists.mjs [--wipe]
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(resolve(here, p), "utf8"));
const pokemonJSON = readJSON("../src/pokemon.json");
const starByDex = readJSON("../src/starByDex.json");
const typesByDex = readJSON("../src/typesByDex.json");

const checkOnly = process.argv.includes("--check");
const wipe = process.argv.includes("--wipe");

// Region dex ranges (same GEN_CAPS as functions/src/index.ts).
const REGIONS = [
  { key: "kanto", name: "Kanto", from: 1, to: 151 },
  { key: "johto", name: "Johto", from: 152, to: 251 },
  { key: "hoenn", name: "Hoenn", from: 252, to: 386 },
  { key: "sinnoh", name: "Sinnoh", from: 387, to: 493 },
  { key: "unova", name: "Unova", from: 494, to: 649 },
  { key: "kalos", name: "Kalos", from: 650, to: 721 },
  { key: "alola", name: "Alola", from: 722, to: 809 },
  { key: "galar", name: "Galar", from: 810, to: 905 },
  { key: "paldea", name: "Paldea", from: 906, to: 1025 },
];

// Habitat areas: each species joins the area matching its primary type, so the
// four lists partition a region's 1-4 star dex.
const AREAS = [
  { key: "grasslands", name: "Grasslands & Forests", types: ["Grass", "Bug", "Normal", "Flying", "Fairy"] },
  { key: "mountains", name: "Mountains & Caves", types: ["Rock", "Ground", "Fighting", "Steel", "Dragon"] },
  { key: "waters", name: "Rivers & Coasts", types: ["Water", "Ice"] },
  { key: "cities", name: "Cities & Ruins", types: ["Fire", "Electric", "Poison", "Psychic", "Ghost", "Dark"] },
];

const slugByIdx = new Map();
for (const p of Object.values(pokemonJSON)) {
  const idx = parseInt(p.idx, 10);
  const slug = p.slug?.eng;
  if (idx && slug && !slugByIdx.has(idx)) slugByIdx.set(idx, slug);
}

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

// Star overrides set from the Library Pokedex beat the static table, same as
// rollEncounter.
const overrides = checkOnly
  ? {}
  : (await db.doc("admin/star_overrides").get()).data() ?? {};
const starOf = (idx) => {
  const o = Math.trunc(Number(overrides[String(idx)]));
  if (o >= 1 && o <= 7) return o;
  const s = starByDex[String(idx)];
  return s >= 1 && s <= 7 ? s : 3;
};
const areaOf = (idx) => {
  const primary = (typesByDex[String(idx)] ?? ["Normal"])[0];
  return AREAS.find((a) => a.types.includes(primary)) ?? AREAS[0];
};

const lists = {};
for (const region of REGIONS) {
  const byArea = Object.fromEntries(AREAS.map((a) => [a.key, []]));
  for (let idx = region.from; idx <= region.to; idx++) {
    const slug = slugByIdx.get(idx);
    if (!slug) continue;
    const star = starOf(idx);
    if (star < 1 || star > 4) continue;
    byArea[areaOf(idx).key].push(slug);
  }
  for (const area of AREAS) {
    const pokemons = byArea[area.key];
    if (!pokemons.length) continue;
    lists[`region-${region.key}-${area.key}`] = {
      name: `${region.name}: ${area.name}`,
      creator: "Snagem",
      pokemons,
      public: true,
      rule: "only",
    };
  }
}

for (const [id, list] of Object.entries(lists)) {
  const stars = list.pokemons.reduce((acc, slug) => {
    const idx = [...slugByIdx.entries()].find(([, s]) => s === slug)?.[0];
    const star = starOf(idx);
    acc[star] = (acc[star] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `${id}: ${list.pokemons.length} mons (stars ${Object.entries(stars)
      .map(([s, n]) => `${s}:${n}`)
      .join(" ")})`
  );
}
console.log(`${Object.keys(lists).length} lists built.`);

if (checkOnly) {
  console.log("Check only; nothing written.");
  process.exit(0);
}

// --wipe: delete leftover hand-made lists (not mission pools, not the region
// ids being (re)written). Off by default so refreshing the region lists never
// removes lists admins created since.
const deletions = {};
if (wipe) {
  const existing = (await db.doc("admin/pokemon_lists").get()).data() ?? {};
  for (const [id, list] of Object.entries(existing)) {
    if (!list?.missionDefault && !lists[id]) {
      deletions[id] = admin.firestore.FieldValue.delete();
      console.log(`Deleting old list ${id} ("${list?.name ?? "?"}")`);
    }
  }
}

await db.doc("admin/pokemon_lists").set({ ...lists, ...deletions }, { merge: true });
console.log(
  `Wrote ${Object.keys(lists).length} region lists, deleted ${Object.keys(deletions).length} old lists.`
);
