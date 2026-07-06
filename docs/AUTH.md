# Auth & Login

## Flow

1. **Register** (`RegisterHandle.tsx`) → creates a Firebase Auth account + a
   `NewUsers/{uid}` doc (with `username`, `gaiaName`, `isGaia`). Gaia names are reserved
   in `gaiaClaims/{claimId}`. Nothing writes to `users` from the client.
2. **Approve** (`approveNewUser` Cloud Function) → moves `NewUsers/{uid}` into
   `users/{uid}` with `username`, role, `isGaia`, etc., and clears the queue doc.
3. **Login** (`LoginHandle.tsx` / `GoogleHandle.tsx`) → Firebase auth, then `getInfo(uid)`
   reads `users/{uid}`.
4. **Session** (`AuthContext.tsx`) → one `onAuthStateChanged` subscription restores the
   user on reload; `Protect.tsx` gates routes purely on `!user`.

## The login gate (why users were getting kicked back)

Auth can succeed while the member's `users/{uid}` profile is missing or malformed. The
gate must decide: let them in, or sign them back out.

**Rule (current):** gate on the **existence of the `users/{uid}` doc**, NOT on the
`username` field.

- `users/{uid}` exists (even without a `username`) → **let in**. Covers legacy and
  Gaia-imported members whose docs predate/omit the field. Display name falls back to
  `username || displayName`.
- No `users` doc, but `NewUsers/{uid}` exists → **"pending"** (still in approval queue).
- Neither → **"unlinked"**: authenticated but no member profile. Signs out and shows a
  "contact an admin" message instead of a silent logout loop.

`getInfo` returns an `exists` flag for this (`AuthContext.tsx`). Persistence is pinned to
LOCAL in `firebase.ts`.

### History

Previously the gate keyed on `!otherinfo.username` and force-signed-out anyone whose
`users/{uid}` doc lacked a username. Gaia-imported accounts (e.g. SubonicXP) that were
loaded outside the register→approve flow hit this and were logged out on every attempt.

## OPEN: consolidate all users into one `users` collection

The hardened gate stops the silent logout loop, but a member whose profile is **not in
this project's `users` collection at all** (e.g. sitting in a separate Firebase
project/database, or keyed by an old id instead of their Auth uid) will now see
**"unlinked"** — correct, but they still can't get in until their data is migrated.

**To finish the fix, we need to know where those records currently live:**
- If a `users/{docId}` doc exists in THIS project but `docId != Auth uid` → write an
  admin "link account" tool that copies/re-keys it to `users/{authUid}`.
- If the records are in a **different Firebase project** → export and import them into
  `users/`, keyed by each member's Auth uid (match on email or gaiaName).

Either way the target is: **one `users/{authUid}` doc per member**, containing at least
`username`, `permissions`, `isGaia`. Track affected accounts and backfill via a
capability-gated admin tool + `auditLog`, not by hand.
