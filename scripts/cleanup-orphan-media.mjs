/**
 * One-time / periodic cleanup of orphaned Storage media.
 *
 * It lists every file under the user-media folders, gathers every image URL
 * that is actually referenced in Firestore (profile avatars/covers, the chosen
 * avatar, and character avatars), and deletes ONLY files that nothing points to.
 * Live images are never touched, so this can't create broken pictures.
 *
 * This also cleans up the legacy flat "Avatars/" folder (pre per-user nesting).
 *
 * USAGE
 *   1. Get a service-account key: Firebase console -> Project settings ->
 *      Service accounts -> Generate new private key. Save it somewhere safe.
 *   2. From the repo root:
 *        GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
 *        STORAGE_BUCKET=snagemguild.appspot.com \
 *        node scripts/cleanup-orphan-media.mjs            # dry run (lists only)
 *        node scripts/cleanup-orphan-media.mjs --delete   # actually delete
 *
 * Always run the dry run first and eyeball the list before --delete.
 */
import admin from "firebase-admin";

const BUCKET = process.env.STORAGE_BUCKET || "snagemguild.appspot.com";
const DELETE = process.argv.includes("--delete");
const MEDIA_PREFIXES = [
  "profile-avatars/",
  "cover-backgrounds/",
  "character-avatars/",
  "Avatars/", // legacy flat folder
];

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: BUCKET,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

/** Pull the object path out of a Firebase download URL (…/o/<path>?…). */
function pathFromUrl(url) {
  if (typeof url !== "string") return null;
  const m = url.match(/\/o\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function collectReferencedPaths() {
  const referenced = new Set();
  const add = (url) => {
    const p = pathFromUrl(url);
    if (p) referenced.add(p);
  };

  const users = await db.collection("users").get();
  for (const user of users.docs) {
    add(user.get("avatar"));

    const profile = await user.ref.collection("bag").doc("profile").get();
    if (profile.exists) {
      const d = profile.data() || {};
      (d.avatars || []).forEach(add);
      (d.cover_backgrounds || []).forEach(add);
      add(d.coverBG);
    }

    const characters = await user.ref.collection("bag").doc("characters").get();
    if (characters.exists) {
      Object.values(characters.data() || {}).forEach((c) => add(c && c.imageURL));
    }
  }
  return referenced;
}

async function main() {
  console.log(`Bucket: ${BUCKET}  |  mode: ${DELETE ? "DELETE" : "DRY RUN"}`);
  const referenced = await collectReferencedPaths();
  console.log(`Referenced media files: ${referenced.size}`);

  let scanned = 0;
  const orphans = [];
  for (const prefix of MEDIA_PREFIXES) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      if (file.name.endsWith("/")) continue; // folder placeholder
      scanned++;
      if (!referenced.has(file.name)) orphans.push(file);
    }
  }

  console.log(`Scanned ${scanned} files; ${orphans.length} orphaned:`);
  orphans.forEach((f) => console.log(`  - ${f.name}`));

  if (DELETE && orphans.length) {
    await Promise.all(orphans.map((f) => f.delete()));
    console.log(`Deleted ${orphans.length} orphaned files.`);
  } else if (!DELETE) {
    console.log("Dry run — nothing deleted. Re-run with --delete to remove these.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
