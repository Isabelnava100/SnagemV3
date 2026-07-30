// Upload the owner-curated Gaia data CSV
// (scripts/gaia-export/Team_Snagem_Gaia_Export.csv, the filled-in
// gaia-data-template) into the existing gaiaExports/{slug} packets.
//
// The CSV is the new source of truth for CHARACTERS and POKEMON: those two
// arrays are replaced wholesale per member, while everything else already in
// the packet (currency, items, roster updates) is kept. Members present in
// Firestore but absent from the CSV are untouched; members only in the CSV
// get a fresh packet and an _index entry.
//
// Character rows carry the full set of savable fields (age, gender,
// pronouns, birthday, height, species, hometown, short description,
// history). Pokemon rows carry the owner character (required), nickname,
// gender, exact level (falls back to the stage default when blank), shiny
// and shadow flags.
//
// Run from functions/ (needs application-default credentials):
//   node scripts/upload-gaia-csv.mjs [--check]
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(resolve(here, p), "utf8"));

const csvText = readFileSync(
  resolve(here, "../../scripts/gaia-export/Team_Snagem_Gaia_Export.csv"),
  "utf8"
).replace(/^﻿/, "");
const pokemonJSON = readJSON("../src/pokemon.json");
const evolutions = readJSON("../src/evolutions.json");

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

// --- evolution stage default level (same rules as upload-gaia-exports) -----
const parentOf = new Map();
for (const [, evos] of Object.entries(evolutions)) {
  for (const evo of evos) parentOf.set(Number(evo.toIdx), Number(evo.fromIdx ?? NaN));
}
// evolutions.json maps fromIdx -> [{toIdx}], rebuild parent map properly.
parentOf.clear();
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

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// --- minimal RFC-4180 CSV parser (quotes, commas, newlines in quotes) -------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") pushField();
    else if (c === "\n") pushRow();
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) pushRow();
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const yes = (v) => /^y/i.test(String(v ?? "").trim());

// Regional/special forms: match the base species and keep the form as a tag
// (the site catalog has base species only; the form rides the packet's
// `form` field into the reviewer note, same as the original export).
const FORM_PREFIXES = ["alolan", "galarian", "hisuian", "paldean", "bloodmoon"];
function lookupSpecies(name) {
  const direct = byName.get(name.toLowerCase());
  if (direct) return { info: direct, form: "" };
  const [first, ...rest] = name.split(/\s+/);
  if (FORM_PREFIXES.includes(first.toLowerCase()) && rest.length) {
    const base = byName.get(rest.join(" ").toLowerCase());
    if (base) {
      return { info: base, form: first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() };
    }
  }
  return { info: null, form: "" };
}

// Column layout of gaia-data-template.csv.
const COL = {
  username: 0,
  type: 1,
  name: 2,
  belongsTo: 3,
  nickname: 4,
  gender: 5,
  level: 6,
  shiny: 7,
  shadow: 8,
  age: 9,
  pronouns: 10,
  birthday: 11,
  height: 12,
  charSpecies: 13,
  hometown: 14,
  shortDescription: 15,
  history: 16,
};

const rows = parseCsv(csvText).slice(1); // drop header
const members = new Map(); // gaiaName -> { characters: [], pokemon: [] }
const problems = [];
const warnings = [];

for (const [i, cols] of rows.entries()) {
  const line = i + 2; // human line number (1-based + header)
  const username = (cols[COL.username] ?? "").trim();
  const type = (cols[COL.type] ?? "").trim().toLowerCase();
  const name = (cols[COL.name] ?? "").trim();
  if (!username || !name) {
    problems.push(`line ${line}: missing username or name, skipped`);
    continue;
  }
  if (!members.has(username)) members.set(username, { characters: [], pokemon: [] });
  const m = members.get(username);

  if (type.startsWith("c")) {
    m.characters.push({
      name,
      age: (cols[COL.age] ?? "").trim(),
      gender: (cols[COL.gender] ?? "").trim(),
      pronouns: (cols[COL.pronouns] ?? "").trim(),
      birthday: (cols[COL.birthday] ?? "").trim(),
      height: (cols[COL.height] ?? "").trim(),
      species: (cols[COL.charSpecies] ?? "").trim() || "Human",
      hometown: (cols[COL.hometown] ?? "").trim(),
      shortDescription: (cols[COL.shortDescription] ?? "").trim(),
      history: (cols[COL.history] ?? "").trim(),
    });
  } else if (type.startsWith("p")) {
    const { info, form } = lookupSpecies(name);
    // Not fatal: eggs/unknown listings upload with no slug and the client
    // routes them into the reviewer note instead of the prefill.
    if (!info) warnings.push(`line ${line}: no Pokedex match for "${name}" (${username})`);
    const levelRaw = parseInt((cols[COL.level] ?? "").trim(), 10);
    const level = Number.isFinite(levelRaw)
      ? Math.max(1, Math.min(100, levelRaw))
      : levelForStage(info ? stageOf(info.idx) : 1);
    const g = (cols[COL.gender] ?? "").trim().toUpperCase();
    m.pokemon.push({
      raw: name,
      species: info?.name ?? name,
      slug: info?.slug ?? "",
      pokedex: info ? String(info.idx) : "",
      form,
      character: (cols[COL.belongsTo] ?? "").trim(),
      nickname: (cols[COL.nickname] ?? "").trim(),
      gender: g.startsWith("F") ? "F" : g.startsWith("M") ? "M" : "",
      shiny: yes(cols[COL.shiny]),
      shadow: yes(cols[COL.shadow]),
      notes: [],
      level,
    });
  } else {
    problems.push(`line ${line}: unknown Type "${cols[COL.type]}", skipped`);
  }
}

// --- validation --------------------------------------------------------------
for (const [username, m] of members) {
  const charNames = new Set(m.characters.map((c) => c.name));
  if (m.characters.length !== charNames.size) {
    problems.push(`${username}: duplicate character names`);
  }
  if (!m.characters.length && m.pokemon.length) {
    problems.push(`${username}: has pokemon but no characters (pokemon need an owner)`);
  }
  for (const p of m.pokemon) {
    if (!p.character) problems.push(`${username}: ${p.species} has no Belongs To Character`);
    else if (!charNames.has(p.character)) {
      problems.push(
        `${username}: ${p.species} belongs to "${p.character}", which is not one of their character rows`
      );
    }
  }
}

const totals = [...members.values()].reduce(
  (acc, m) => ({
    characters: acc.characters + m.characters.length,
    pokemon: acc.pokemon + m.pokemon.length,
  }),
  { characters: 0, pokemon: 0 }
);
console.log(
  `${members.size} members | ${totals.characters} characters | ${totals.pokemon} pokemon`
);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s) (upload proceeds, reviewer note carries them):`);
  for (const w of warnings) console.log("  -", w);
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log("  -", p);
} else {
  console.log("\nNo blocking problems found.");
}

if (checkOnly) {
  console.log("\nCheck only; nothing written.");
  process.exit(problems.length ? 1 : 0);
}

// --- upload ------------------------------------------------------------------
admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const names = {};
let written = 0;
for (const [username, m] of members) {
  const slug = slugify(username);
  names[slug] = username;
  await db.doc(`gaiaExports/${slug}`).set(
    {
      gaiaName: username,
      characters: m.characters,
      pokemon: m.pokemon,
      csvCuratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  written += 1;
}
await db.doc("gaiaExports/_index").set({ names }, { merge: true });
console.log(`\nWrote ${written} packets + refreshed the _index.`);
process.exit(0);
