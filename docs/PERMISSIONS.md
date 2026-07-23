# SnagemV3: Roles & Permissions

The model has **two orthogonal axes**. A user's role and their capabilities are
independent: being a Director does not grant forum access, and being a Master
does not grant any actions.

> Every check in the codebase is **client-side UI gating only**. The real
> authorization boundary is Firestore security rules (console-managed, not in
> this repo). UI gates keep honest users out of the wrong screens; rules keep
> attackers out of the data. Both are required.

Source of truth: `src/components/types/typesUsed.ts` (enums) and
`src/lib/permissions.ts` (helpers).

---

## Axis 1: Role (`permissions` field, exactly one)

Trust tier and forum visibility. Higher tiers see more forums; roles do **not**
imply any capabilities.

| Role | Meaning | Forum visibility |
|---|---|---|
| `Admin` | Full control; manages others' roles and capabilities | All forums |
| `Director` | Functional role; powers come from granted capabilities, not the role | Base forums (unless granted `SeeMasterForums`) |
| `Master` | Forum-visibility tier | Base + master-only forum(s) |
| `Verified` | Standard trusted member | Base forums |
| `New` | Freshly approved member | Base forums |
| `Applicant` | Still in the `NewUsers` queue | None: cannot log in |
| `Disabled` | Access revoked | None: cannot log in |

**Forum visibility is data-driven** (`typesUsed.ts`): `BASE_FORUM_VALUES` (Main,
Side RP, Quests, Events, Private) are visible to any member; `MASTER_FORUM_VALUES`
(Master Mission) is unlocked by the Master role **or** the `SeeMasterForums`
capability. Default is **deny**: an unknown or empty role gets only the base set
(this replaced an earlier bug where unknown roles saw *everything*). Adjust access
by editing those two lists, not by adding role branches.

**Role is assigned by hand in the Firestore console.** The app only ever writes
`permissions: "New"` into the `NewUsers` queue at registration; nothing in the
client writes to the live `users` collection or sets any other role.

---

## Axis 2: Capabilities (`capabilities` field, zero or more)

Granular action grants an Admin toggles per user, mainly for Directors. **Admin
has every capability implicitly.**

| Capability | Grants |
|---|---|
| `SeeMasterForums` | View the master-only forum(s) without being a Master |
| `GiveItems` | Send items to other users (Donate) |
| `HostEvents` | Host/run events |
| `ManageLists` | Edit the admin pokemon lists |

Check with `hasCapability(user, Capability.X)` from `src/lib/permissions.ts`
(returns true for any Admin). Example already wired: `Donate.tsx` gates the
item-grant on `GiveItems` and records an audit entry per grant.

### The Director model, concretely
A Director is a member the Admin has handed specific powers to. Example: an Admin
grants a Director `GiveItems` and `HostEvents` but not `SeeMasterForums`. That
Director can hand out items and run events but sees only the normal forums. This
is exactly the "set a director to allow them to do certain things" flow.

---

## FUTURE: Admin capability checklist (planned, not built)

A checklist on the **Settings tab, Admin-only**, listing each Director (or any
user) with a toggle per `Capability`. Toggling writes the `capabilities` array on
that user's `users/{uid}` doc. Because `hasCapability` and the `Capability` enum
already exist, building this is mostly UI:

1. Admin-only Settings sub-page listing users (reuse `getUsers`, but paginate: it's currently an unbounded scan).
2. A row per user with a switch per `Capability`.
3. On toggle, `updateDoc(users/{uid}, { capabilities })`.
4. **Firestore rule:** only an Admin may write the `capabilities` (and `permissions`) field. See below.
5. Log each change via `logAuditEvent({ action: "user.capability_change", ... })`.

To add a new power: add it to the `Capability` enum, gate the feature with
`hasCapability`, and it shows up in the checklist automatically.

---

## Audit logging

`src/lib/auditLog.ts` → `logAuditEvent(entry)` appends to the `auditLogs`
collection. Wired now on item grants (`items.grant`). Attach it wherever a
sensitive or reversible-by-someone-else action happens, **especially post
edits/deletes** (`post.edit`, `post.delete`) when that feature is built, plus
role/capability changes and event hosting.

**Integrity:** client-written logs are only as trustworthy as the rules make them.
Make `auditLogs` **append-only** (allow `create`, deny `update`/`delete`, pin
`actorUid == request.auth.uid`). For a tamper-proof trail, move the sensitive
write itself behind a Cloud Function that logs server-side.

---

## Required Firestore rules (write these in the console)

These are the real fix for the privilege-escalation findings: the app cannot
enforce them. Priorities:

- **`users/{uid}`**: a user may write their own doc, but **`permissions` and
  `capabilities` are Admin-only** (deny client changes on create *and* update; pin
  `permissions` to a safe default on self-create). This is the single most
  important rule: without it any user can self-assign `permissions: "Admin"`.
- **`users/{uid}` reads**: owner or staff only (`isStaff()` = Admin or any
  capability holder). The doc holds email + discordUID + settings, so members
  no longer read each other's user docs; cross-member display goes through the
  world-safe `publicProfiles/{uid}` mirror (which also carries Discord id and
  username only for members who opted in via `discordPublic`).
- **`NewUsers/{uid}`**: create allowed for the authenticated owner; `permissions`
  pinned to `"New"`. Promotion to `users` is Admin/Cloud-Function only.
- **`users/{uid}/bag/items`**: writable only by the owner or an Admin (blocks the
  Donate path being reproduced by any user from the console).
- **`admin/*`**: writable only by Admins.
- **`forum/{f}/threads/{id}/posts/{p}`**: create only if the thread isn't closed
  and (not private or `request.auth.uid in thread.privateTo`); update/delete only
  if `request.auth.uid == resource.data.ownerUid` (needs the `ownerUid` field from
  the forum build plan).
- **`auditLogs`**: append-only, `actorUid == request.auth.uid`.

## Known gaps still open
- No in-app role/capability management UI (the checklist above): all manual console edits today.
- No `NewUsers` → `users` approval UI: approval is a manual console doc move.
- Private-thread ACLs key on `displayName` (mutable, non-unique). Migrate to uid (forum build plan rec 8).
- Post editing/deletion not built; posts lack `ownerUid` (blocks authz). See forum build plan rec 7.
