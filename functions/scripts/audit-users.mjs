// Read-only user-data audit. Finds accounts that would fail the login gate
// (docs/AUTH.md) and profiles that need consolidating into users/{authUid}.
//
// WRITES NOTHING. Safe to run anytime.
//
// Auth (pick one, then run from the functions/ dir):
//   gcloud auth application-default login          # sets Application Default Creds
//   node scripts/audit-users.mjs
// or with a service-account key:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/key.json node scripts/audit-users.mjs
//
// Optional: pass a name to spotlight one account, e.g.
//   node scripts/audit-users.mjs SubonicXP

import admin from "firebase-admin";

admin.initializeApp({ projectId: "snagemguild" });
const auth = admin.auth();
const db = admin.firestore();

const spotlight = (process.argv[2] || "").trim().toLowerCase();

// ---- collect all Firebase Auth accounts ------------------------------------
const authUsers = [];
let pageToken;
do {
  const res = await auth.listUsers(1000, pageToken);
  res.users.forEach((u) =>
    authUsers.push({ uid: u.uid, email: (u.email || "").toLowerCase(), displayName: u.displayName || "" })
  );
  pageToken = res.pageToken;
} while (pageToken);

const authByUid = new Map(authUsers.map((u) => [u.uid, u]));
const authByEmail = new Map(authUsers.filter((u) => u.email).map((u) => [u.email, u]));

// ---- collect users / NewUsers docs -----------------------------------------
const usersSnap = await db.collection("users").get();
const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const usersById = new Map(users.map((u) => [u.id, u]));

const newSnap = await db.collection("NewUsers").get();
const newUsers = newSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const newIds = new Set(newUsers.map((u) => u.id));

// ---- classify problems ------------------------------------------------------
// 1. Auth accounts with NO users doc under their uid, and not a pending applicant.
//    These are the "unlinked" logins (SubonicXP class). Try to match by email to a
//    users doc keyed under a different id -> re-key candidate.
const unlinked = [];
for (const u of authUsers) {
  if (usersById.has(u.uid)) continue; // has a proper doc, fine
  if (newIds.has(u.uid)) continue; // legitimately pending approval
  const emailMatch = users.find((d) => (d.email || "").toLowerCase() === u.email && u.email);
  unlinked.push({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    misKeyedDocId: emailMatch ? emailMatch.id : null, // re-key target if found
    misKeyedUsername: emailMatch ? emailMatch.username : null,
  });
}

// 2. users docs missing a username (would have failed the OLD gate; still worth fixing).
const noUsername = users.filter((u) => !u.username);

// 3. users docs whose id is not a known Auth uid (orphaned / imported under an old id).
const docNotAnAuthUid = users.filter((u) => !authByUid.has(u.id));

// 4. users docs missing a permissions/role.
const noPermissions = users.filter((u) => !u.permissions);

// ---- report -----------------------------------------------------------------
const line = "=".repeat(64);
console.log(line);
console.log("USER DATA AUDIT  (read-only)  project: snagemguild");
console.log(line);
console.log(`Auth accounts:        ${authUsers.length}`);
console.log(`users/ docs:          ${users.length}`);
console.log(`NewUsers/ (pending):  ${newUsers.length}`);
console.log("");

const dump = (title, rows, fmt) => {
  console.log(`\n## ${title}: ${rows.length}`);
  rows.slice(0, 200).forEach((r) => console.log("  - " + fmt(r)));
  if (rows.length > 200) console.log(`  ...and ${rows.length - 200} more`);
};

dump(
  "UNLINKED auth accounts (log in -> 'unlinked', BLOCKED)",
  unlinked,
  (r) =>
    `${r.displayName || "(no name)"} <${r.email || "no-email"}> uid=${r.uid}` +
    (r.misKeyedDocId
      ? `  => users doc "${r.misKeyedDocId}" (username=${r.misKeyedUsername}) matches by email: RE-KEY to uid`
      : "  => no matching users doc by email: needs import/creation")
);
dump("users docs MISSING username", noUsername, (r) => `id=${r.id} email=${r.email || "?"} perms=${r.permissions || "?"}`);
dump("users docs whose id is NOT an Auth uid (orphaned/mis-keyed)", docNotAnAuthUid, (r) => `id=${r.id} username=${r.username || "?"} email=${r.email || "?"}`);
dump("users docs MISSING permissions/role", noPermissions, (r) => `id=${r.id} username=${r.username || "?"}`);

if (spotlight) {
  console.log(`\n${line}\nSPOTLIGHT: "${spotlight}"\n${line}`);
  const hit = (s) => (s || "").toLowerCase().includes(spotlight);
  const au = authUsers.filter((u) => hit(u.displayName) || hit(u.email));
  const ud = users.filter((u) => hit(u.username) || hit(u.email) || hit(u.gaiaName) || hit(u.id));
  const nu = newUsers.filter((u) => hit(u.username) || hit(u.email) || hit(u.gaiaName));
  console.log("Auth match:", JSON.stringify(au, null, 2));
  console.log("users/ match:", JSON.stringify(ud.map((d) => ({ id: d.id, username: d.username, email: d.email, gaiaName: d.gaiaName, permissions: d.permissions, isGaia: d.isGaia })), null, 2));
  console.log("NewUsers/ match:", JSON.stringify(nu.map((d) => ({ id: d.id, username: d.username, email: d.email, gaiaName: d.gaiaName })), null, 2));
}

console.log(`\n${line}\nDone. Nothing was written.\n${line}`);
process.exit(0);
