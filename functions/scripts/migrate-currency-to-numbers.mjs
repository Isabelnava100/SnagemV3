// Migrate users/{uid}/bag/currency fields from legacy STRINGS to NUMBERS.
//
// Fields migrated: pokecoin, gengarcoin, snagemblem, snagEmblemPieces.
// Value-preserving: Number(parseInt(value)). Idempotent: numeric fields are
// left untouched. Never zeroes a value it cannot parse; it reports it instead.
//
// Auth (run from the functions/ dir, same as seed.mjs):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//
// Modes (default is a READ-ONLY dry run, no writes):
//   node scripts/migrate-currency-to-numbers.mjs                 # dry run + before-counts
//   node scripts/migrate-currency-to-numbers.mjs --backup        # dry run + write a JSON backup
//   node scripts/migrate-currency-to-numbers.mjs --apply         # convert (auto-backs up first)
//   node scripts/migrate-currency-to-numbers.mjs --verify        # recount types only
//   node scripts/migrate-currency-to-numbers.mjs --restore FILE  # roll back from a backup JSON
//
// DEPLOY ORDER: the currently-deployed CLIENT must tolerate numeric currency
// (CurrencyChip String(amount).padStart) BEFORE --apply runs, otherwise members
// on the old bundle crash on the Dashboard. Ship the client + functions first.

import admin from "firebase-admin";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const here = dirname(fileURLToPath(import.meta.url));
const FIELDS = ["pokecoin", "gengarcoin", "snagemblem", "snagEmblemPieces"];
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const restoreIdx = args.indexOf("--restore");

/** parseInt-style parse that flags anything non-finite. */
function toNumber(value) {
  const n = parseInt(String(value ?? "0"), 10);
  return Number.isFinite(n) ? n : null; // null => could not parse
}

/** Read every users/{uid}/bag/currency doc. Returns [{uid, ref, data}]. */
async function loadCurrencyDocs() {
  const users = await db.collection("users").get();
  const out = [];
  // Chunk the per-user currency reads so we don't open thousands at once.
  const ids = users.docs.map((d) => d.id);
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    const refs = slice.map((uid) => db.doc(`users/${uid}/bag/currency`));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, j) => {
      if (snap.exists) out.push({ uid: slice[j], ref: snap.ref, data: snap.data() || {} });
    });
  }
  return out;
}

/** Tally types + per-field sums across all docs. */
function analyze(docs) {
  const stats = {};
  for (const f of FIELDS) stats[f] = { string: 0, number: 0, missing: 0, unparseable: [], sum: 0 };
  let docsWithString = 0;
  for (const { uid, data } of docs) {
    let anyString = false;
    for (const f of FIELDS) {
      const v = data[f];
      if (v === undefined || v === null) { stats[f].missing++; continue; }
      const t = typeof v;
      if (t === "number") { stats[f].number++; stats[f].sum += v; }
      else if (t === "string") {
        stats[f].string++; anyString = true;
        const n = toNumber(v);
        if (n === null) stats[f].unparseable.push({ uid, value: v });
        else stats[f].sum += n;
      } else {
        stats[f].unparseable.push({ uid, value: `(${t}) ${JSON.stringify(v)}` });
      }
    }
    if (anyString) docsWithString++;
  }
  return { stats, docsWithString, total: docs.length };
}

function printReport(label, { stats, docsWithString, total }) {
  console.log(`\n=== ${label} ===`);
  console.log(`currency docs: ${total} | docs with >=1 string field: ${docsWithString}`);
  for (const f of FIELDS) {
    const s = stats[f];
    console.log(
      `  ${f.padEnd(16)} string=${String(s.string).padStart(4)} number=${String(s.number).padStart(4)} ` +
        `missing=${String(s.missing).padStart(4)} sum=${s.sum}` +
        (s.unparseable.length ? `  !! UNPARSEABLE x${s.unparseable.length}` : "")
    );
    if (s.unparseable.length) {
      for (const u of s.unparseable.slice(0, 10)) console.log(`      - ${u.uid}: ${JSON.stringify(u.value)}`);
    }
  }
  return stats;
}

function writeBackup(docs) {
  const dir = resolve(here, "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = resolve(dir, `currency-backup-${stamp}.json`);
  const payload = docs.map(({ uid, data }) => ({ uid, data }));
  writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`\nBackup written: ${file} (${payload.length} docs)`);
  return file;
}

async function apply(docs) {
  let batch = db.batch();
  let pending = 0;
  let converted = 0;
  let fieldsConverted = 0;
  for (const { ref, data } of docs) {
    const update = {};
    for (const f of FIELDS) {
      const v = data[f];
      if (typeof v === "string") {
        const n = toNumber(v);
        if (n === null) continue; // never write garbage; leave for manual review
        update[f] = n;
        fieldsConverted++;
      }
    }
    if (Object.keys(update).length) {
      batch.set(ref, update, { merge: true });
      converted++;
      pending++;
      if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
    }
  }
  if (pending) await batch.commit();
  console.log(`\nApplied: ${converted} docs updated, ${fieldsConverted} string fields converted to numbers.`);
}

async function restore(file) {
  const payload = JSON.parse(readFileSync(resolve(file), "utf8"));
  let batch = db.batch();
  let pending = 0;
  for (const { uid, data } of payload) {
    const update = {};
    for (const f of FIELDS) if (f in data) update[f] = data[f];
    if (Object.keys(update).length) {
      batch.set(db.doc(`users/${uid}/bag/currency`), update, { merge: true });
      pending++;
      if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
    }
  }
  if (pending) await batch.commit();
  console.log(`Restored ${payload.length} currency docs from ${file}.`);
}

async function run() {
  if (restoreIdx >= 0) {
    const file = args[restoreIdx + 1];
    if (!file) throw new Error("--restore needs a backup file path");
    await restore(file);
    process.exit(0);
  }

  const docs = await loadCurrencyDocs();
  const before = analyze(docs);
  const beforeStats = printReport("BEFORE", before);

  if (has("--verify")) process.exit(0);
  if (has("--backup") && !has("--apply")) { writeBackup(docs); process.exit(0); }

  if (!has("--apply")) {
    console.log("\nDRY RUN — no writes. Re-run with --apply to convert (a backup is taken first).");
    process.exit(0);
  }

  // --apply: always back up first, then convert, then re-read and verify sums.
  writeBackup(docs);
  await apply(docs);

  const after = analyze(await loadCurrencyDocs());
  const afterStats = printReport("AFTER", after);

  let ok = true;
  for (const f of FIELDS) {
    if (afterStats[f].string !== 0) { console.error(`VERIFY FAIL: ${f} still has ${afterStats[f].string} string values`); ok = false; }
    if (afterStats[f].sum !== beforeStats[f].sum) {
      console.error(`VERIFY FAIL: ${f} sum changed ${beforeStats[f].sum} -> ${afterStats[f].sum}`); ok = false;
    }
  }
  console.log(ok ? "\nVERIFY OK: all fields numeric and per-field sums unchanged." : "\nVERIFY FAILED — review above.");
  process.exit(ok ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
