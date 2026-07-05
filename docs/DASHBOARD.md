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

## Open product questions (blocking the remaining scope)

See the current build discussion — currencies economy, badge earn rules,
draft retention countdown, team caps, mystery box contents, public profile
route, notification triggers/channels.
