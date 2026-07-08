// Seed the Lore Library (loreBooks + loreEntries) from lore-data.json.
// Content migrated from the guild's GaiaOnline "Library" subforum.
//
// Idempotent: book and entry ids are derived deterministically from titles, so
// re-running updates docs in place instead of duplicating them.
//
// Auth (run from the functions/ dir):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//   node scripts/seed-lore.mjs
//
// Data shape (lore-data.json): an array of
//   { book: { title, type, description }, entries: [ { category, title, body, attributes, images, status } ] }
// Book/entry order is taken from array position; ids come from slugged titles.

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const here = dirname(fileURLToPath(import.meta.url));
const books = JSON.parse(readFileSync(resolve(here, "lore-data.json"), "utf8"));

/** Stable, collision-resistant slug for deterministic doc ids. */
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";

async function run() {
  let batch = db.batch();
  let pending = 0;
  let bookCount = 0;
  let entryCount = 0;

  const flush = async (force = false) => {
    if (pending >= 400 || (force && pending > 0)) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  };

  for (let b = 0; b < books.length; b++) {
    const { book, entries = [] } = books[b];
    if (!book?.title) continue;
    const bookId = slug(book.title);

    batch.set(
      db.doc(`loreBooks/${bookId}`),
      {
        title: book.title,
        description: book.description ?? "",
        type: book.type ?? "other",
        order: b + 1,
        // Author attribution (omit undefined; Firestore rejects it).
        ...(book.authorName ? { authorName: book.authorName } : {}),
        ...(book.authorUid ? { authorUid: book.authorUid } : {}),
      },
      { merge: true }
    );
    pending++;
    bookCount++;
    await flush();

    // Guard against duplicate entry titles within a book.
    const seen = new Map();
    for (let e = 0; e < entries.length; e++) {
      const entry = entries[e];
      if (!entry?.title) continue;
      const base = `${bookId}__${slug(entry.title)}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const entryId = n === 0 ? base : `${base}-${n + 1}`;

      batch.set(
        db.doc(`loreEntries/${entryId}`),
        {
          bookId,
          category: entry.category ?? "",
          title: entry.title,
          body: entry.body ?? "",
          attributes: entry.attributes ?? {},
          images: Array.isArray(entry.images) ? entry.images : [],
          order: e + 1,
          status: entry.status === "stub" ? "stub" : "complete",
          // Author attribution (omit undefined; Firestore rejects it).
          ...(entry.authorName ? { authorName: entry.authorName } : {}),
          ...(entry.authorUid ? { authorUid: entry.authorUid } : {}),
        },
        { merge: true }
      );
      pending++;
      entryCount++;
      await flush();
    }
  }

  await flush(true);
  console.log(`Seeded ${bookCount} lore books and ${entryCount} entries.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
