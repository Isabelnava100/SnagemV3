// Upload the organized Gaia export (scripts/gaia-export/accounts.json) into
// Firestore as gaiaExports/{slug} docs + a gaiaExports/_index name index, so
// returning members can self-serve a prefilled onboarding draft.
//
// Per pokemon it assigns the import defaults the site needs but Gaia never
// tracked: level by evolution stage (base 5 / middle 20 / final 40), gender
// from the listing when noted, shadow flag -> shadow stat 100.
// Items are matched against the site catalog; misses ship as itemsUnmatched
// so the draft can carry them in the reviewer note.
//
// Run from functions/ (needs application-default credentials):
//   node scripts/upload-gaia-exports.mjs [--check]
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(resolve(here, p), "utf8"));

const accounts = readJSON("../../scripts/gaia-export/accounts.json");
const pokemonJSON = readJSON("../src/pokemon.json");
const evolutions = readJSON("../src/evolutions.json");
const itemsJSON = readJSON("../../src/data/item/item.json");

const checkOnly = process.argv.includes("--check");

// --- species name -> {idx, slug} --------------------------------------------
const byName = new Map();
for (const p of Object.values(pokemonJSON)) {
  const name = p.name?.eng;
  const slug = p.slug?.eng;
  if (name && slug && !byName.has(name.toLowerCase())) {
    byName.set(name.toLowerCase(), { idx: parseInt(p.idx, 10), slug, name });
  }
}

// --- evolution stage: 1 = base, 2 = middle, 3+ = final-ish ------------------
const parentOf = new Map();
for (const [fromIdx, evos] of Object.entries(evolutions)) {
  for (const evo of evos) parentOf.set(Number(evo.toIdx), Number(fromIdx));
}
function stageOf(idx) {
  let stage = 1;
  let cur = idx;
  while (parentOf.has(cur) && stage < 5) {
    cur = parentOf.get(cur);
    stage += 1;
  }
  return stage;
}
const STAGE_LEVEL = { 1: 5, 2: 20 };
const levelForStage = (s) => STAGE_LEVEL[s] ?? 40;

// --- item catalog match (same display-name rules as src/data/item/index.ts) --
function formatItemName(rawName, group) {
  const titled = rawName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if (group === "ball") return `${titled} Ball`;
  if (group === "berry") return `${titled} Berry`;
  if (group === "tm") return `TM ${titled}`;
  if (group === "tr") return `TR ${titled}`;
  return titled;
}
const itemByName = new Map();
for (const raw of Object.values(itemsJSON)) {
  const name = formatItemName(raw.Name, raw.Group);
  itemByName.set(name.toLowerCase(), {
    refId: raw["Item ID"],
    name,
    category: raw.Group,
    filePath: raw.Filename,
  });
}
// Second index without spaces so "Thunderstone" finds "Thunder Stone".
const itemByCompactName = new Map();
for (const [k, v] of itemByName) itemByCompactName.set(k.replace(/\s+/g, ""), v);

const lookupItem = (name) => {
  const key = name.trim().toLowerCase().replace(/\.$/, "");
  if (!key) return null;
  const forms = new Set([key]);
  if (key.endsWith("ies")) forms.add(key.slice(0, -3) + "y");
  if (key.endsWith("es")) forms.add(key.slice(0, -2));
  if (key.endsWith("s")) forms.add(key.slice(0, -1));
  for (const k of forms) {
    const hit =
      itemByName.get(k) ||
      itemByName.get(`${k} ball`) ||
      itemByName.get(`${k} berry`) ||
      itemByCompactName.get(k.replace(/\s+/g, ""));
    if (hit) return hit;
  }
  return null;
};

/** "Ulla: 8 Potions" / "Potion x3" / "2 Pecha Berries" -> {hit, qty} | null. */
const matchItem = (raw, fallbackQty) => {
  let text = raw.trim();
  let qty = fallbackQty || 1;
  // Optional character-label prefix ("Ulla: 1 Thunderstone").
  const labeled = text.match(/^[\w'. -]{1,24}:\s+(.*)$/);
  const candidates = [text, ...(labeled ? [labeled[1]] : [])];
  for (const cand of candidates) {
    let name = cand;
    let q = qty;
    const lead = cand.match(/^(\d+)\s*[x×]?\s+(.+)$/i);
    if (lead) {
      q = Math.max(1, parseInt(lead[1], 10));
      name = lead[2];
    }
    const tail = name.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
    if (tail) {
      q = Math.max(1, parseInt(tail[2], 10));
      name = tail[1];
    }
    const hit = lookupItem(name);
    if (hit) return { hit, qty: q };
  }
  return null;
};

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const docs = {};
for (const m of accounts) {
  const pokemon = m.pokemon.map((p) => {
    const info = p.species ? byName.get(p.species.toLowerCase()) : null;
    const stage = info ? stageOf(info.idx) : 1;
    return {
      raw: p.raw,
      species: p.species ?? "",
      slug: info?.slug ?? "",
      pokedex: info ? String(info.idx) : "",
      form: p.form || "",
      character: p.character || "",
      gender: p.flags.includes("female") ? "F" : p.flags.includes("male") ? "M" : "",
      shiny: p.flags.includes("shiny"),
      shadow: p.flags.includes("shadow"),
      notes: p.flags.filter((f) => f.startsWith("note:")).map((f) => f.slice(5)),
      level: levelForStage(stage),
    };
  });
  const itemsMatched = [];
  const itemsUnmatched = [];
  for (const it of m.items) {
    const res = matchItem(it.raw, it.qty);
    if (res) itemsMatched.push({ ...res.hit, qty: res.qty });
    else itemsUnmatched.push({ raw: it.raw, qty: it.qty, character: it.character ?? "" });
  }
  const slug = slugify(m.gaiaName);
  docs[slug] = {
    gaiaName: m.gaiaName,
    rank: m.rank ?? "",
    snagCoins: m.snagCoins ?? 0,
    snagEmblems: m.snagEmblems ?? 0,
    emblemPieces: m.emblemPieces ?? "",
    characters: m.characters,
    pokemon,
    itemsMatched,
    itemsUnmatched,
    rosterUpdates: m.rosterUpdates ?? [],
    gaps: m.gaps ?? [],
    threads: m.threads ?? [],
    updatedAt: new Date().toISOString(),
  };
}

let matched = 0;
let unmatched = 0;
for (const d of Object.values(docs)) {
  matched += d.itemsMatched.length;
  unmatched += d.itemsUnmatched.length;
}
console.log(
  `${Object.keys(docs).length} members | item stacks matched ${matched}, unmatched ${unmatched}`
);
const sampleMisses = [
  ...new Set(
    Object.values(docs).flatMap((d) => d.itemsUnmatched.map((i) => i.raw))
  ),
].slice(0, 25);
console.log("sample unmatched items:", sampleMisses.join(" | "));

if (checkOnly) {
  console.log("Check only; nothing written.");
  process.exit(0);
}

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const batchLimit = 400;
const entries = Object.entries(docs);
for (let i = 0; i < entries.length; i += batchLimit) {
  const batch = db.batch();
  for (const [slug, doc] of entries.slice(i, i + batchLimit)) {
    batch.set(db.doc(`gaiaExports/${slug}`), doc);
  }
  await batch.commit();
}
await db.doc("gaiaExports/_index").set({
  names: Object.fromEntries(Object.entries(docs).map(([slug, d]) => [slug, d.gaiaName])),
  updatedAt: new Date().toISOString(),
});
console.log(`Uploaded ${entries.length} gaiaExports docs + _index.`);
