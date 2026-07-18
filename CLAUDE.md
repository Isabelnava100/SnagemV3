# SnagemV3 Project Rules

Pokemon roleplay community site (forums, dashboard, character/team management).
Live: snagemguild.com. Deploy: Netlify (`netlify.toml`, SPA redirect to index.html).

## Writing style

- NEVER use em dashes anywhere: user-facing copy, UI text, descriptions, placeholders, docs, code comments, or commit messages. Rewrite with a comma, colon, period, parentheses, or by rephrasing, and fix grammar so the sentence reads correctly. This applies to all new writing and to any existing text you touch.

## Stack (upgraded July 2026; keep these current)

- React 19, TypeScript 6 (`moduleResolution: bundler`), Vite 8 (rolldown bundler)
- Mantine 9 (+ `@mantine/emotion` for `sx` support), Tailwind 4 (CSS-first, no config file, preflight OFF)
- Firebase 12 (compat init in `src/context/firebase.ts`, modular API everywhere else)
- @tanstack/react-query 5, Tiptap 3, react-router-dom 6
- Package manager: **bun** (`bun.lock`). Never introduce package-lock.json.

## UI rules

- **Page headers**: every main section opens with the shared `PageHero` from `src/components/common/PageHero.tsx` (striped gradient banner, uppercase eyebrow, fw 800 h1, `gray.4` subtitle, optional `HeroStat` chips). New pages use it too; the Snag Dashboard keeps its own header but borrows the same banner styling.
- **Mantine first.** Reach for Mantine components/props before custom CSS or Tailwind. Tailwind utilities are OK for quick layout in existing Tailwind-styled areas (dashboard tables); do not mix both approaches in one new component.
- `sx` prop works via `@mantine/emotion` (see `src/emotion.d.ts` + provider in `src/routes.tsx`). For new code prefer style props (`fz`, `fw`, `c`, `gap`, `justify`) over `sx`.
- v9 prop names: `gap` not `spacing`, `justify` not `position`, `c` not `color` (Text/Title), `fw` not `weight`, `fz` for numeric font sizes, `leftSection`/`rightSection` not icons props, `wrap="nowrap"` not `noWrap`.
- Dark theme only (`defaultColorScheme="dark"`, theme in `src/lib/mantine.ts`; palettes must be 10 shades).
- Icons: `@tabler/icons-react` (NOT dead `@tabler/icons` v1) or existing `tabler-icons-react`.
- **Everything must be mobile responsive.** Any new or edited UI must work at 375px width with no horizontal scroll: use Mantine responsive props (`span={{ base: 12, xs: 6 }}`, responsive style props), relative widths (`maw` + `w="100%"`) over fixed px, and verify at the mobile viewport before committing. Theme breakpoints: xs=480, sm=800 (`src/lib/mantine.ts`).

## Accessibility rules

Bake these in for every new/edited UI (a11y is a first-class requirement, not a follow-up):

- **Keyboard-operable custom clickables.** Any `<Box>`/`<div>` with an `onClick` MUST be keyboard-operable: spread `clickable(fn)` from `src/lib/a11y.ts` (adds `role="button"`, `tabIndex`, Enter/Space) and give it an `aria-label`. Prefer a real `<Button>`/`UnstyledButton` when practical.
- **Status messages** ("Saved", errors, "Draft saved") get `role="status" aria-live="polite"` so screen readers announce them.
- **Form fields** must have a visible `label`, or an `aria-label` when only a placeholder is shown (search Selects, the `ItemPicker` combobox, note textareas). Mantine wires label/error/description automatically when you use its props, so use them.
- **Contrast.** Do not hand-roll faint text like `rgba(255,255,255,0.5)`; use `c="dimmed"` (the token is contrast-tuned in `src/assets/styles/a11y.css`). Keep small text at AA (>= 4.5:1) on the dark theme.
- **Touch targets** stay ~44px on mobile; coarse-pointer minimums are set globally in `a11y.css`. Don't shrink interactive controls below that on touch.
- **Nav** uses react-router `NavLink`, which sets `aria-current="page"` on the active item; keep using it for nav.
- **Skip link + landmark.** The app renders a `.skip-link` to `#main-content` (the `<main>` in `src/App.tsx`); keep one `<main>` and a logical heading order per page.
- **Icons in `<Image>`**: numeric `width`/`height` are ignored by Mantine 9 (renders full-size). Use `w`/`h` + `fit="contain"`.
- **Zoom**: pinch-zoom is off by default (app feel) but user-toggleable in Settings > Accessibility (`src/lib/viewportZoom.ts` flips the viewport meta). Never assume zoom is disabled.
- Reading text size lives in Settings > Accessibility (`src/lib/readingSize.ts`); keep nav compact, size body copy.

## Data & Firestore rules

- All reads go through react-query. Default `staleTime` 2 min / `gcTime` 10 min set in `src/lib/react-query.ts`. Don't refetch the same doc per component; share query keys.
- Mutation results: invalidate with `queryClient.invalidateQueries({ queryKey: [...] })` (object syntax).
- react-query 5 names: `isPending` (aliased `isPending: isLoading` in older files), no `onSuccess` on queries, `gcTime` not `cacheTime`.
- Firestore is billed per document read: prefer `query(where, limit, orderBy)` over full-collection `getDocs`; paginate server-side (startAfter) instead of fetching all posts and slicing client-side.
- Never trust client checks for authz: admin gating in `Admin/index.tsx` is UI-only; real enforcement lives in Firestore security rules (kept in Firebase console, not this repo). Any new collection/write path needs a matching rule.
- **Permissions: two orthogonal axes.** These are `role` (`permissions` field, forum-visibility tier) and `capabilities` (granted actions). Use helpers in `src/lib/permissions.ts` (`isAdmin`, `hasCapability`, `canAccessForum`), never raw string compares. Gate sensitive actions with `hasCapability` and log them via `src/lib/auditLog.ts`. Full model + roadmap: `docs/PERMISSIONS.md`. Database map + forum build plan: `docs/DATABASE.md`.

## Security rules

- User-generated HTML (Tiptap output stored in Firestore) MUST be sanitized with `DOMPurify.sanitize()` before any `dangerouslySetInnerHTML`. Precedent: `src/Pages/forum/mainThreadLayout/components/EachPost.tsx`.
- No secrets in client code. `VITE_*` env vars are PUBLIC (bundled). Firebase web config is fine; anything privileged (Discord bot endpoint) must validate/rate-limit server-side.
- `.env` is gitignored. Keep it that way; update `.env.example` when adding vars.

## Build & dev

- `npm run dev` / `bun run dev` (vite), `npm run build` = `tsc && vite build`. Both must pass before commit.
- vite.config.ts `manualChunks` is a function (rolldown requires it).
- Typecheck: `npx tsc --noEmit`. Keep at zero errors.
- This repo lives in iCloud-synced Documents: if builds hang on file reads, node_modules was evicted: run `brctl download node_modules` and wait.

## Known deferred work

- Forum post mechanics need a functions deploy (`firebase deploy --only
  functions`) to run live. Progression stats friendship/shadow/purification are
  a fixed 0..100 scale (100 = maxed); experience stays level-based (admin
  `xpConfig`). Per qualifying post on a normal exp thread, each team pokemon:
  gains experience (capped at level 100) + friendship +2 (cap 100), rolls 25%
  for +1 shadow (cap 100 = "Shadow'ed"), and if already shadowed rolls 80% for
  +5 purification (reaching 100 auto-clears shadow). `publishForumPost` also:
  evolves a chosen team pokemon on publish (`applyEvolutionInTx`, shared with the
  `evolvePokemon` callable; friendship evolutions now need friendship 100),
  stamps `post.xpEarned` (only stats a member actually earned; maxed ones are
  omitted), drops `evolution`/`shadowed` system posts + self-notifications, and
  enforces the per-user team lock (`thread.lockedTeams`) on normal threads.
  Thread flag `noXp` (new-thread composer checkbox) disables all progression.
  Cleanup: `useShadowVaccine` callable + "Shadow Vaccine" catalog item (item 994
  in `src/data/item/item.json`; re-add if regenerated). `notifyUsers` honors
  `users/{uid}.settings.siteNotifications`. Admins can still assign BONUS team XP
  at close (`ThreadRewards` editable fields → `finalizeThreadRewards`, applied on
  top of earned XP). Stats scale + shadow/purification guide: `/Library?tab=shadow`
  (`src/Pages/Library/shadow.tsx`); shared helpers in `src/lib/shadow.ts`.

- Safari Contest (July 2026, /Forum Events + Admin > Manage > Safari Contest)
  needs a functions + rules deploy before it works live: new callables
  `startSafariContest`, `judgeSafariContest`, `finalizeSafariContest`, plus the
  star-weighted branch in `rollEncounter` and the Safari turn resolution in
  `publishForumPost` (fight/feed/ball, run-away, percentage capture), and the
  `admin/safari_config` rules block. Config template + Johto Meadow Zone default
  live in `src/lib/safari.ts`; seed with `node scripts/seed-safari-contest.mjs`
  from `functions/` (`--check` validates slugs offline). Full flow + data model:
  `docs/SAFARI.md`. Catch math is duplicated in `functions/src/index.ts` and
  `src/lib/safari.ts`; keep them in sync.

- Snag List (July 2026, /Activities) needs a functions + rules deploy: new callable `claimSnagBox`, `markSnagTask` hooks in the gameplay callables, and the `bag/snaglist` owner-write exclusion in rules. State: `users/{uid}/bag/snaglist` (server-written only). Weekly reset is Monday 00:00 UTC; streak counts consecutive completed weeks.

- Encounter stars + mission close requirements (July 2026) need a functions
  deploy: every species has a star 1..7 (`scripts/gen-stars.mjs` regenerates
  `starByDex.json` in both `functions/src/` and `src/data/pokemon/`; 6 star =
  pseudo-legendary, 7 star = legendary/mythical). Posts to beat by star:
  2/3/5/7/9/12/20. Normal encounters roll gender/shiny up front, drain a
  health bar, and count as beaten at zero; mission threads track
  `defeatedEncounters` vs `requiredEncounters` and CloseThreadModal blocks
  close (with staff override) until all set foes are beaten. Safari keeps its
  own 1..5 scale. Admins can override any species' star from the Library
  Pokedex (stored in `admin/star_overrides`, read by `rollEncounter`, audited
  as `stars.edit`). Details: docs/FORUM.md.
- Battle damage + run-away (July 2026) need a functions deploy: wild
  encounters can be fled at post time (success 80/70/60/50/40/30/20% by star;
  failure wastes the turn and the enemy still hits); trainer-owned
  (non-catchable) encounters battle to the end (no flee, no catch,
  auto-clear when beaten). Every battle post picks a fighter from the locked
  team; the player strikes first (a beaten enemy or felled boss never hits
  back), then the enemy deals FLAT damage by star (20/30/45/60/80/100/140,
  admin-editable) against level-based max HP (100 at level 1, +2/level to 50,
  +4 after; admin-editable in Battle Costs), tracked in `thread.battleDamage`.
  Bosses hit for their species' star damage unless the host set a custom
  value at start (`bossBattle.attackDamage`). Medicine items heal in-post
  (Potion 20 / Super 40 / Hyper 60 / Max+Full Restore full; Revive half, Max
  Revive full; auto-targeted). A solo full-team wipe pauses the thread
  (`thread.paused`) until staff resolve it via `resolveThreadPause` (revive /
  resume) or close it as a loss; with other participants the wiped member's
  team lock lifts instead. `thread.itemsUsedTally` shows every item spent at
  close (CloseThreadModal + ThreadRewards). Team lock is enforced in the
  composer UI (locked team read-only), and hosts can opt out with the
  creation-only "Members may change teams between posts" checkbox
  (`thread.allowTeamChanges`). Constants live in `src/lib/encounterStars.ts`
  + mirrored in `functions/src/index.ts`.
- Type effectiveness + S.N.A.G. + Dev Board (July 2026) need a rules +
  functions deploy (`firebase deploy --only firestore:rules,functions`):
  battle damage/progress now scale by pokemon-type matchup (0.5x..2x clamp,
  chart in `src/lib/typeChart.ts` mirrored in functions; species types in
  `typesByDex.json`, regenerate with `scripts/gen-types.mjs`). S.N.A.G.
  (/SNAG, main nav, walkie icon) is a self-contained FAQ/SOP chat (NOT
  connected to external AI) that answers from a built-in knowledge base +
  member progress and files suggestions/bugs/questions into `tickets`
  (types dev_suggestion/dev_bug/member_question, status new). Admin >
  Manage > Dev Board triages those (discard or promote), tracks dev
  tickets, and holds admin-only planning notes (`devBoard` collection,
  admin-only rules). Dashboard nav renamed Snag -> Trainer. Library gained
  The War Room (battle guide, live config numbers) and The Charter (forum
  permissions); forum pages show a small bottom-right category disclaimer.
- Forum-first flows (July 2026) need a functions + rules deploy before they work live: new callables `ensureTrainingThread`, `pickUpMission`, `requestChallenge`, `resolveChallengeRequest`, `requestMasterClearance`, `resolveMasterClearance`, updated `buyLottoTicket`/`logTrainingPost`/`onThreadClosed`, plus the `challengeRequests` and `masterClearanceRequests` rules blocks. After deploying, run `node scripts/seed-mission-encounters.mjs` from `functions/` (gcloud ADC; `--check` validates slugs offline) to seed per-mission encounter lists. Mission-default lists carry `missionDefault: true` and stay hidden from Field Registers and the host encounter picker.
- Training posts now flow through the forum: the Colosseum "Log a Training Post" button opens the pinned "Super Training Room Log" thread (`trainingLog: true`, created on first use) and the composer calls `logTrainingPost` (10-post window cap) before publishing. Direct replies to that thread bounce to /Colosseum.
- Mission grading: closing a thread with `missionId` auto-files the pending `missionSubmissions` doc (onThreadClosed); the manual submit form was removed from the mission brief.
- Remaining `bun audit` findings are transitive; re-audit after major bumps.
- Auth-gated pages (dashboard/editor/admin) migrated to Mantine 9 mechanically. Visual QA pending a logged-in pass.
- Forum post pages still read from the top of the collection for middle pages (`src/Pages/forum/queries.ts` getPostsPage). Switch to `startAfter()` cursors before threads get long.
- Thread list filters `closed`/pinned client-side after a `limit(200)` fetch (`src/Pages/forum/queries.ts` getThreadList). Move to `where`/`orderBy` clauses; requires a composite Firestore index (create in console first, then change the query).
- Forum game actions run through Cloud Functions (`functions/`, deploy with `firebase deploy --only firestore:rules,functions`, Blaze plan required). Deploy rules + functions TOGETHER: the tightened rules assume the callables exist. Remaining integrity gaps listed in docs/FORUM.md "Still deferred" (notably: users can still hand-edit their own `bag/*` inventory).
- `getTeams()`/`getTeam()` always cascade an extra `getOwnedPokemons()` read (`src/queries/dashboard.ts`). Split so pokemon data is fetched once via its own cached query.
- Discord notify endpoint (`VITE_BACKEND_DISCORD_BOT`, `src/Discord/NewPost.tsx`) is public in the bundle. Anyone can spam it. Move behind an authenticated Cloud Function / rate-limited backend.
- XP/stats are awarded automatically; items/coins are reviewed at close. `publishForumPost` applies each team pokemon's per-post experience/friendship/purification/shadow to `owned_pokemons` immediately AND tallies the same amounts into `thread.pendingXp` as a display-only running log. At close, `CloseThreadModal` shows an XP-gained summary from `pendingXp`, and `ThreadRewards.tsx` renders that same XP read-only while the reviewer assigns items/coins/pokemon; `finalizeThreadRewards` grants only those (it no longer re-applies `pokemonXp`, since XP was already given). The old `xpAward: "instant"|"onClose"` choice is retired (still stored, no longer read).
