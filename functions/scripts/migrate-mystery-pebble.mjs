// Merge the legacy Mystery Pebble bag key into the canonical item id.
//
// Some Mystery Pebbles were granted under the DISPLAY-NAME key "mystery-pebble"
// instead of the stable catalog id "item_15863" (catalog slot 993 in
// src/data/item/item.json). Those stacks show up separately and cannot be
// crafted/spent through the id-keyed flows. This script folds each user's
// "mystery-pebble" quantity into "item_15863" and removes the stale key.
//
// Only run this if players report uncraftable pebbles; it is a no-op for anyone
// who never held the mis-keyed stack.
//
// Value-preserving (adds the two quantities), idempotent (a bag with only the
// correct key is skipped), and it never lowers a total.
//
// Auth (run from the functions/ dir, same as the other migration scripts):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//
// Modes (default is a READ-ONLY dry run, no writes):
//   node scripts/migrate-mystery-pebble.mjs                 # dry run + report
//   node scripts/migrate-mystery-pebble.mjs --backup        # dry run + write a JSON backup
//   node scripts/migrate-mystery-pebble.mjs --apply         # merge (auto-backs up first)
//   node scripts/migrate-mystery-pebble.mjs --restore FILE  # roll back from a backup JSON

import admin from "firebase-admin";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const here = dirname(fileURLToPath(import.meta.url));
const LEGACY_KEY = "mystery-pebble";
const CANON_KEY = "item_15863";
// Canonical entry metadata from src/data/item/item.json slot 993.
const CANON_META = {
  name: "mystery-pebble",
  filePath: "other-item/mystery-pebble.png",
  category: "other-item",
};

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const restoreIdx = args.indexOf("--restore");

/** Coerce a bag quantity (number, or legacy {quantity} object) to a number. */
function qtyOf(entry) {
  if (entry == null) return 0;
  if (typeof entry === "number") return Number.isFinite(entry) ? entry : 0;
  const n = Number(entry.quantity);
  return Number.isFinite(n) ? n : 0;
}

/** Read every users/{uid}/bag/items doc that carries the legacy key. */
async function loadAffectedDocs() {
  const users = await db.collection("users").get();
  const ids = users.docs.map((d) => d.id);
  const out = [];
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    const refs = slice.map((uid) => db.doc(`users/${uid}/bag/items`));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, j) => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      if (data[LEGACY_KEY] !== undefined) {
        out.push({ uid: slice[j], ref: snap.ref, data });
      }
    });
  }
  return out;
}

function report(docs) {
  console.log(`\n=== Mystery Pebble key merge (${LEGACY_KEY} -> ${CANON_KEY}) ===`);
  console.log(`affected bags: ${docs.length}`);
  let legacyTotal = 0;
  let mergedTotal = 0;
  for (const { uid, data } of docs) {
    const legacy = qtyOf(data[LEGACY_KEY]);
    const canon = qtyOf(data[CANON_KEY]);
    legacyTotal += legacy;
    mergedTotal += legacy + canon;
    console.log(
      `  ${uid.padEnd(30)} ${LEGACY_KEY}=${String(legacy).padStart(4)} ` +
        `+ ${CANON_KEY}=${String(canon).padStart(4)} -> ${legacy + canon}`
    );
  }
  console.log(`legacy pebbles to fold in: ${legacyTotal}`);
  return { legacyTotal, mergedTotal };
}

function writeBackup(docs) {
  const dir = resolve(here, "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = resolve(dir, `mystery-pebble-backup-${stamp}.json`);
  // Back up only the two keys we touch, per user, so a restore is exact.
  const payload = docs.map(({ uid, data }) => ({
    uid,
    legacy: data[LEGACY_KEY] ?? null,
    canon: data[CANON_KEY] ?? null,
  }));
  writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`\nBackup written: ${file} (${payload.length} bags)`);
  return file;
}

async function apply(docs) {
  const { FieldValue } = admin.firestore;
  let batch = db.batch();
  let pending = 0;
  let merged = 0;
  for (const { ref, data } of docs) {
    const addQty = qtyOf(data[LEGACY_KEY]);
    // Build the canonical entry, preserving any existing meta the bag already has.
    const existingCanon =
      data[CANON_KEY] && typeof data[CANON_KEY] === "object" ? data[CANON_KEY] : {};
    const update = {
      [CANON_KEY]: {
        name: existingCanon.name ?? CANON_META.name,
        filePath: existingCanon.filePath ?? CANON_META.filePath,
        category: existingCanon.category ?? CANON_META.category,
        quantity: FieldValue.increment(addQty),
      },
      [LEGACY_KEY]: FieldValue.delete(),
    };
    batch.set(ref, update, { merge: true });
    merged++;
    pending++;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  console.log(`\nApplied: ${merged} bags merged.`);
}

async function restore(file) {
  const { FieldValue } = admin.firestore;
  const payload = JSON.parse(readFileSync(resolve(file), "utf8"));
  let batch = db.batch();
  let pending = 0;
  for (const { uid, legacy, canon } of payload) {
    const update = {
      [LEGACY_KEY]: legacy === null ? FieldValue.delete() : legacy,
      [CANON_KEY]: canon === null ? FieldValue.delete() : canon,
    };
    batch.set(db.doc(`users/${uid}/bag/items`), update, { merge: true });
    pending++;
    if (pending >= 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  console.log(`Restored ${payload.length} bags from ${file}.`);
}

async function run() {
  if (restoreIdx >= 0) {
    const file = args[restoreIdx + 1];
    if (!file) throw new Error("--restore needs a backup file path");
    await restore(file);
    process.exit(0);
  }

  const docs = await loadAffectedDocs();
  const before = report(docs);

  if (docs.length === 0) {
    console.log("\nNothing to do: no bag carries the legacy key.");
    process.exit(0);
  }

  if (has("--backup") && !has("--apply")) {
    writeBackup(docs);
    process.exit(0);
  }

  if (!has("--apply")) {
    console.log("\nDRY RUN: no writes. Re-run with --apply to merge (a backup is taken first).");
    process.exit(0);
  }

  // --apply: back up first, then merge, then re-read and verify.
  writeBackup(docs);
  await apply(docs);

  const after = await loadAffectedDocs();
  let ok = true;
  if (after.length !== 0) {
    console.error(`VERIFY FAIL: ${after.length} bags still carry ${LEGACY_KEY}`);
    ok = false;
  }
  // Confirm the canonical total grew by exactly the legacy total.
  const canonNow = (
    await Promise.all(
      docs.map(({ uid }) =>
        db.doc(`users/${uid}/bag/items`).get().then((s) => qtyOf((s.data() || {})[CANON_KEY]))
      )
    )
  ).reduce((a, b) => a + b, 0);
  if (canonNow !== before.mergedTotal) {
    console.error(`VERIFY FAIL: canonical total ${canonNow} != expected ${before.mergedTotal}`);
    ok = false;
  }
  console.log(
    ok
      ? "\nVERIFY OK: legacy key cleared and canonical totals match."
      : "\nVERIFY FAILED: review above (restore with --restore if needed)."
  );
  process.exit(ok ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
