// Deletes forum threads (with posts/pending subcollections) across all boards.
// Test-data cleanup tool.
//
// Auth (run from the functions/ dir):
//   gcloud auth application-default login   (or GOOGLE_APPLICATION_CREDENTIALS=key.json)
//   node scripts/delete-test-threads.mjs           (dry run: lists threads only)
//   node scripts/delete-test-threads.mjs --delete  (actually deletes)
import admin from "firebase-admin";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();

const doDelete = process.argv.includes("--delete");

const forums = await db.collection("forum").listDocuments();
let total = 0;

for (const forumRef of forums) {
  const threads = await forumRef.collection("threads").listDocuments();
  if (threads.length === 0) continue;
  console.log(`\n[${forumRef.id}] ${threads.length} thread(s):`);
  for (const t of threads) {
    const snap = await t.get();
    const d = snap.exists ? snap.data() : {};
    const posts = (await t.collection("posts").count().get()).data().count;
    console.log(
      `  ${t.id}  "${d?.title ?? "(no title)"}"  posts=${posts}  closed=${d?.closed ?? false}`
    );
    total += 1;
    if (doDelete) {
      await db.recursiveDelete(t);
      console.log(`    deleted.`);
    }
  }
}

console.log(
  `\n${total} thread(s) ${doDelete ? "DELETED" : "found (dry run; re-run with --delete to remove)"}.`
);
