# Snag Dashboard — build notes

Gap-closure pass against the July 2026 dashboard design board. The dashboard
was already ~75% built; this documents what was added and what stays open.
Forum linkage details live in docs/FORUM.md.

## Added in this pass

- **Board tokens/rules**: `#57525B` → `#1E1D20` everywhere, third currency
  renamed "Snag Emblems", main module min-height 1200px on 900–1440px
  viewports, mobile fixed save bar on the Profile tab.
- **Announcements**: admin-managed banner stored at `admin/announcements`
  (`{id, title, body, ctaLabel, ctaUrl, active}`), edited under Dashboard →
  Admin → Announcements. Saving regenerates `id`; "Mark as Read" stores the id
  in `users/{uid}.readAnnouncements`. The create-your-first-character welcome
  shows as fallback while the user has no characters.
- **Badge insert/disable**: clicking a badge in Collections toggles it through
  the `setBadgeEnabled` Cloud Function (ownership + max-5 validated
  server-side), which syncs the enabled set into `users/{uid}.badges` — the
  field forum post cards snapshot. `bag/badges` is now owner-read-only in
  rules (grants and display state are admin/function writes).
- **Pokemon provenance**: forum catches now write
  `caughtIn {forum, threadId, postId, threadTitle}`; the detail popover links
  back to the thread. (Exp/Friendship/Purification/Shadow points from the
  design need the XP model first — open question.)
- **Bookmark cards**: show the thread's last poster/time (denormalized at
  bookmark time) and a remove-bookmark button.
- **Emoji picker**: forum editors now offer the user's owned guild emotes
  (from `users/{uid}.emojis` + the emote catalog) alongside unicode emojis,
  inserted as inline images.
- **Drafts**: cards labeled Thread draft / Post draft; resume links into the
  matching forum composer (`?draft=`).
- **Mystery box stub**: box/mystery items in Your Items open a placeholder
  pop-up (contents deferred by the board).
- **Coming-soon pages** for /Shop, /Users, /Activities, /Missions instead of
  the 404 page.
- **Performance**: pokesprite sprites now load from the jsDelivr https CDN;
  the `getTeams` → `getOwnedPokemons` cascade is gone (`getTeamsRaw` +
  `hydrateTeams` share the cached owned query); per-user query keys are
  uid-scoped.

## Deploy reminder

The badge toggle and pokemon provenance need the updated Cloud Functions and
rules: `firebase deploy --only firestore:rules,functions`.

## Economy & game systems (built from the answered product questions)

- **Rewards on thread close (Q1)** — archiving a thread routes reward
  granters (Admin / `GiveItems`) to `/Forum/{forum}/thread/{id}/rewards`:
  participants list, bulk add-to-everyone, per-user adjustments with
  removable chips, Save Progress (persists to `rewardSessions/{forum}__{id}`),
  Clear All + Finalize behind confirmations. `finalizeThreadRewards` applies
  items/currencies transactionally (currency strings parsed/re-stringified),
  audit-logs, notifies recipients, and locks the session. The same flow will
  later close activities. Direct grants: Donate page gained a Give Currency
  section (`grantCurrency` callable).
- **XP engine (Q5)** — site defaults in `admin/xp_defaults` (edited in
  Admin → Permissions & XP); threads snapshot an `xpConfig {perPost,
  minPostLength}` at creation (overridable by Admin / `AdjustXP`);
  `publishForumPost` awards experience to every pokemon on the teams brought
  into a qualifying post. Stats show in the pokemon detail popover.
- **Director permissions checklist (Q5)** — Admin → Permissions & XP: pick a
  member, toggle capabilities (`SeeMasterForums, GiveItems, HostEvents,
  ManageLists, AdjustXP`), audit-logged.
- **Notifications (Q7)** — `users/{uid}/notifications` written by functions:
  bookmarked-thread posts (via `watcherUids`), @mentions (data-id parse),
  boss battle starts, reward/currency grants. Inbox in Settings →
  Notifications + unread bell badge on the dashboard. Discord channel
  deferred until account linking.
- **Drafts (Q3)** — consumed on publish, 60 cap, warning at 55, clear-all
  from 40 (in the Drafts tab).
- **Teams (Q4)** — 100 cap, warning at 90, names ≤20 chars with a basic
  blocked-word filter (`helpers.containsBlockedWord`).
- **Public profile (Q6)** — placeholder `/Users/:username` (avatar, name,
  role, inserted badges); forum profile popover links there.
- **Mystery boxes (Q8)** — Admin → Mystery Boxes: pick the catalog item that
  acts as the box, build a weighted item/currency pool; `openMysteryBox`
  decrements the box and rolls server-side; the Your Items pop-up opens
  configured boxes. Custom uploaded box art deferred.
- **Editor Gaia-parity** — @mention dropdown now suggests real members
  (was the Tiptap demo celebrity list), code/code-block controls added,
  owned guild emotes in the emoji picker as inline images.
- **Signatures (Gaia-style)** — set in Settings → Signature (rich text +
  live preview), stored on the user doc (`signature`, self-writable, world-
  readable). Composers show an "Attach Signature" checkbox (on by default);
  `publishForumPost`/`publishForumThread` snapshot the signature onto the
  post at publish time, rendered under the post body below a divider.
  YouTube embeds and post-style/say-mode controls are still deferred.

Still open: badge earn automation (Q2 — grows with activities), draft
deletion countdown display, full public profile design, Discord delivery.
