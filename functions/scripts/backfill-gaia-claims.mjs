// Backfill Gaia name locks for existing members: every users/{uid}.gaiaName
// gets a gaiaClaims/{normalizedName} doc (create-once at registration, so new
// signups cannot take a name already in use), the canonical spelling from the
// gaiaExports index, and isGaia: "Yes" so the dashboard import banner shows.
//
// Existing claims owned by a DIFFERENT uid are reported, never overwritten.
//
// Run from functions/ (application-default credentials):
//   node scripts/backfill-gaia-claims.mjs [--check]
import admin from "firebase-admin";

admin.initializeApp({ projectId: "snagemguild" });
const db = admin.firestore();
const checkOnly = process.argv.includes("--check");

// Same normalizations as RegisterHandle.gaiaClaimId and the export slugs.
const claimId = (name) => name.trim().toLowerCase().replace(/[/.#$\[\]]+/g, "_");
const slugify = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const index = (await db.doc("gaiaExports/_index").get()).data()?.names ?? {};
const canonicalBySlug = Object.fromEntries(
  Object.entries(index).map(([slug, name]) => [slug, name])
);

const users = await db.collection("users").get();
for (const doc of users.docs) {
  const u = doc.data();
  const raw = String(u.gaiaName ?? "").trim();
  if (!raw) {
    console.log(`${u.username ?? doc.id}: no gaiaName, skipped`);
    continue;
  }
  const canonical = canonicalBySlug[slugify(raw)] ?? raw;
  const cRef = db.doc(`gaiaClaims/${claimId(canonical)}`);
  const existing = await cRef.get();
  if (existing.exists && existing.data().uid !== doc.id) {
    console.log(
      `CONFLICT: claim "${claimId(canonical)}" already owned by uid ${existing.data().uid}, ` +
        `wanted by ${u.username ?? doc.id} (${doc.id}). Left untouched.`
    );
    continue;
  }
  const patches = [];
  if (u.gaiaName !== canonical) patches.push(`gaiaName "${u.gaiaName}" -> "${canonical}"`);
  if (u.isGaia !== "Yes") patches.push('isGaia -> "Yes"');
  if (!existing.exists) patches.push(`claim ${claimId(canonical)} created`);
  if (!patches.length) {
    console.log(`${u.username}: already locked and consistent`);
    continue;
  }
  console.log(`${u.username}: ${patches.join(", ")}`);
  if (!checkOnly) {
    await doc.ref.set({ gaiaName: canonical, isGaia: "Yes" }, { merge: true });
    if (!existing.exists) {
      await cRef.set({
        uid: doc.id,
        gaiaName: canonical,
        claimedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        backfilled: true,
      });
    }
  }
}
console.log(checkOnly ? "Check only; nothing written." : "Backfill complete.");
