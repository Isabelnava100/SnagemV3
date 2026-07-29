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

## Email action links (verify, password reset)

Firebase mails the links; the page they land on is ours. `/Auth/Action`
(`src/Pages/auth/AuthAction.tsx`) reads `mode` + `oobCode`, applies the code,
reloads the cached auth user (otherwise the access gate still reads
"unverified"), and redirects into the site. Password resets are forwarded to the
existing `/Reset` screen. Only same-origin `continueUrl` values are followed, so
the parameter cannot be used as an open redirect.

`sendEmailVerification` is always called with `verifyEmailActionSettings()`
(`src/Pages/auth/components/Components.tsx`), which sets the continue URL from
the running origin, so localhost and production both work.

**Console-only settings.** The Identity Toolkit admin API refuses to write
`notification.sendEmail` for this project (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`),
so these two live in the Firebase console, Authentication > Templates:

- the verification email's subject and body, and
- **Customize action URL**, which must be `https://snagemguild.com/Auth/Action`.
  Until it is set, links keep landing on the unstyled
  `snagemguild.firebaseapp.com/__/auth/action` page and `/Reset` is unreachable
  from a password-reset email.

`authorizedDomains` IS writable over that API and now includes `snagemguild.com`
and `www.snagemguild.com` (it previously held only localhost and the two Firebase
domains, which would have rejected our continue URLs).

## The two-step access gate

A Firebase session is not membership. `useAccessGate` (`src/components/auth/AccessGate.tsx`)
reads `user.emailVerified` and `user.profileExists` (both stamped in
`AuthContext`), and `App.tsx` renders the gate in place of every route except the
public marketing/auth screens and the Library. It fails OPEN when
`profileExists` is undefined, i.e. the `users` doc read failed: a flaky read must
never lock out an approved member.

Copy varies by account: an already-approved member sees step 2 as done (only the
email link is left), and returning GaiaOnline members are told an admin is
confirming their account against their Gaia username rather than reviewing a
roleplay application. The login screen learns both from `lastSignInContext`
(`LoginHandle.tsx`), since the session is dropped before the gate renders.

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
