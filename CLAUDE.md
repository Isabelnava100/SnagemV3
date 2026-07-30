# SnagemV3 Project Rules

Pokemon roleplay community site (forums, dashboard, character/team management).
Live: snagemguild.com. Deploy: Netlify (`netlify.toml`, SPA redirect to index.html).

**Setting this up on a new machine? Read `docs/SETUP.md` first.** It covers the
`.env` you must create by hand, `firebase use snagemguild` (there is no
`.firebaserc` in the repo), where the runtime secrets actually live, both
deploy paths, and the environment gotchas.

## Writing style

- NEVER use em dashes anywhere: user-facing copy, UI text, descriptions, placeholders, docs, code comments, or commit messages. Rewrite with a comma, colon, period, parentheses, or by rephrasing, and fix grammar so the sentence reads correctly. This applies to all new writing and to any existing text you touch.

## Stack (upgraded July 2026; keep these current)

- React 19, TypeScript 6 (`moduleResolution: bundler`), Vite 8 (rolldown bundler)
- Mantine 9 (+ `@mantine/emotion` for `sx` support), Tailwind 4 (CSS-first, no config file, preflight OFF)
- Firebase 12 (fully modular SDK; init in `src/context/firebase.ts`, compat layer removed July 2026, do not reintroduce `firebase/compat`)
- @tanstack/react-query 5, Tiptap 3, react-router-dom 6
- Package manager: **bun** (`bun.lock`). Never introduce package-lock.json in the repo root. Exception: `functions/package-lock.json` is tracked on purpose (the firebase.json predeploy and CI run `npm` in functions/).

## UI rules

- **Page headers**: every main section opens with the shared `PageHero` from `src/components/common/PageHero.tsx` (striped gradient banner, uppercase eyebrow, fw 800 h1, `gray.4` subtitle, optional `HeroStat` chips). New pages use it too; the Snag Dashboard keeps its own header but borrows the same banner styling.
- **Mantine first.** Reach for Mantine components/props before custom CSS or Tailwind. Tailwind utilities are OK for quick layout in existing Tailwind-styled areas (dashboard tables); do not mix both approaches in one new component.
- `sx` prop works via `@mantine/emotion` (see `src/emotion.d.ts` + provider in `src/routes.tsx`). For new code prefer style props (`fz`, `fw`, `c`, `gap`, `justify`) over `sx`.
- v9 prop names: `gap` not `spacing`, `justify` not `position`, `c` not `color` (Text/Title), `fw` not `weight`, `fz` for numeric font sizes, `leftSection`/`rightSection` not icons props, `wrap="nowrap"` not `noWrap`.
- Dark theme only (`defaultColorScheme="dark"`, theme in `src/lib/mantine.ts`; palettes must be 10 shades).
- Icons: `@tabler/icons-react` (NOT dead `@tabler/icons` v1).
- **Everything must be mobile responsive.** Any new or edited UI must work at 375px width with no horizontal scroll: use Mantine responsive props (`span={{ base: 12, xs: 6 }}`, responsive style props), relative widths (`maw` + `w="100%"`) over fixed px, and verify at the mobile viewport before committing. Theme breakpoints: xs=480, sm=800 (`src/lib/mantine.ts`).

## SEO rules (owner's QA standard, apply to every new or edited page)

Source: the owner's agency QA checklist (Google Doc "QA Checklist"). These are requirements, not suggestions:

- **Meta title** 30-70 chars (aim under 60), **meta description** 50-160 chars, unique per page. New pages must ship with both via the shared `<Seo>` helper (`src/components/common/Seo.tsx`); never leave a page on the generic fallback.
- **Headings**: exactly one H1 per page, at least one H2, no skipped levels.
- **Canonicals**: every indexable page gets a self-referential canonical. Paginated pages self-canonicalize to their own page URL (NOT to page 1) and append "Page X" to the title. Query-parameter variants (search, filters, tabs that don't merit indexing) canonicalize back to the parent/base page.
- **Indexability**: private pages (dashboard, editor, settings, admin, auth) get `noindex` meta AND are excluded from the sitemap. Only unique, indexable, canonical pages belong in `public/sitemap.xml` (generated at build by `scripts/gen-sitemap.mjs` from `src/lib/seo/pages.ts`; new public routes must be added there). robots.txt links the sitemap.
- **Images**: every image has alt text (descriptive, weave in pokemon/roleplay/Snagem keywords where natural; decorative images get `alt=""`). Prefer WebP/SVG, size to container, lazy-load below the fold only; never lazy-load LCP/above-the-fold images or anything functional.
- **Schema**: add relevant schema.org JSON-LD (via `<Seo schema=...>`) for new content types; validate with validator.schema.org / Google rich results test.
- **Security headers** live in `netlify.toml`: HSTS (max-age 31536000, includeSubDomains, preload), CSP, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy. Keep them passing on securityheaders.com; when adding a third-party origin (script/frame/api), update the CSP.
- **ANNUAL SECURITY RENEWAL (owner-requested): the HSTS policy is set for 1 year (set July 2026). If you are developing in this repo in or after July 2027, re-verify and renew the security setup as part of that work**: confirm the HSTS header is still served with max-age 31536000, re-test everything at securityheaders.com, and refresh the header set against current best practice. The max-age window refreshes on every visit, but treat July of each year as the audit date. Also tracked in docs/BACKLOG.md.
- **Performance**: keep Core Web Vitals passing; reserve image dimensions to avoid layout shift.

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
- Firestore and Storage load lazily: `src/context/firebase.ts` exports async memoized `getDb()` / `getStorage()` (only `app` and `auth` are eager). Never statically import a `db`/`storage` binding from that module; call `await getDb()` at the usage site like the query modules do.
- Never trust client checks for authz: admin gating in `Admin/index.tsx` is UI-only; real enforcement lives in Firestore security rules (`firestore.rules` in this repo, deployed with `firebase deploy --only firestore:rules`). Any new collection/write path needs a matching rule.
- **Permissions: two orthogonal axes.** These are `role` (`permissions` field, forum-visibility tier) and `capabilities` (granted actions). Use helpers in `src/lib/permissions.ts` (`isAdmin`, `hasCapability`, `canAccessForum`), never raw string compares. Gate sensitive actions with `hasCapability` and log them via `src/lib/auditLog.ts`. Full model + roadmap: `docs/PERMISSIONS.md`. Database map + forum build plan: `docs/DATABASE.md`.

## Security rules

- User-generated HTML (Tiptap output stored in Firestore) MUST be sanitized with `DOMPurify.sanitize()` before any `dangerouslySetInnerHTML`. Precedent: `src/Pages/forum/mainThreadLayout/components/EachPost.tsx`.
- No secrets in client code. `VITE_*` env vars are PUBLIC (bundled). Firebase web config is fine; anything privileged (Discord bot endpoint) must validate/rate-limit server-side.
- `.env` is gitignored. Keep it that way; update `.env.example` when adding vars.
- Email verification is enforced at sign-in (July 2026): password sign-in is refused until `emailVerified` (Login.tsx shows a resend path). Admin approval is independent of verification (owner decision, July 2026): `approveNewUser` may promote an unverified applicant, the login gate still keeps them out until they verify. Do not add a flow that lets unverified password accounts sign in.
- Member PII: `users/{uid}` is readable only by its owner, admins, and capability holders (it carries email + discordUID). Member-facing displays of other members go through the world-readable `publicProfiles/{uid}` mirror (syncPublicProfile trigger; Discord fields only when the member opted in via `discordPublic`). Never read another member's users doc from member-facing UI.
- App Check is opt-in: set `VITE_APPCHECK_SITE_KEY` (reCAPTCHA v3 site key) to enable the client side; enforcement is a Firebase console step. Server-side cost control today: per-uid throttle on the roll callables (rollDice/rollRandom/rollEncounter, 2s minimum interval).

## Build & dev

- `npm run dev` / `bun run dev` (vite), `npm run build` = `tsc && vite build`. Both must pass before commit.
- CI runs on every push/PR to main (`.github/workflows/ci.yml`): `tsc --noEmit`, vitest, eslint, and the functions tsc build. Keep it green.
- vite.config.ts `manualChunks` is a function (rolldown requires it). Only react and firebase are force-grouped (app+auth in `firebase`, firestore in its own lazy `firestore` chunk); do NOT re-add mantine/tiptap groups, forcing them made the whole bundle load eagerly (~600KB extra on first paint).
- Homepage hero + team images are self-hosted WebP in `public/images/` (converted from the old Firebase Storage originals). Keep new site imagery WebP, self-hosted, with width/height set; lazy-load below the fold only. Gen 9 box sprites live in `public/images/sprites/gen9/` and load on demand by URL; do not move them back into src/assets (they were base64-inlined into a 254KB chunk).
- **Homepage boot shell**: `index.html` contains a PERMANENT static copy of the hero (`#boot-shell`, outside `#root`) plus inline critical CSS, so first paint and LCP do not wait for the bundle and React never remounts the hero. The React `HomePage` renders only what is below the hero, `App.tsx` hides/shows the shell per route, and a CSP-hashed inline script strips it on non-home loads. When editing the hero, marketing top bar, or the `.dc-cta`/`.dc-kicker`/`.hp-*` classes, update the shell and its inline CSS in the same commit. The shell's inline script has a sha256 in the CSP in `netlify.toml`; recompute it if the script changes.
- Fonts are self-hosted in `public/fonts` (Roboto variable regular + italic, Quantico 4 styles); @font-face lives in `src/assets/styles/index.css` and `redesign.css`. Do not re-add Google Fonts links.
- Typecheck: `npx tsc --noEmit` (also `bun run typecheck`). Keep at zero errors. Tests: `bun run test` (vitest). `react-hooks/rules-of-hooks` is an eslint ERROR; the rest are warnings.
- This repo lives in iCloud-synced Documents: if builds hang on file reads, node_modules was evicted: run `brctl download node_modules` and wait.

## Known deferred work

- Guild Blog (July 2026, /Blog + admin editor at /Blog/edit/new): needs `firebase deploy --only firestore:rules,firestore:indexes` (public-read published `blogPosts` + composite index), then `node scripts/seed-blog.mjs` from `functions/` for the placeholder post. Blog posts are the site's indexable articles: own child sitemap (`sitemap-blog.xml`, built from Firestore REST on deploy), BlogPosting schema, title/description enforced as meta in the editor.
- SEO build (July 2026): full system documented in `docs/SEO.md` (registry `src/lib/seo/pages.json`, `Seo` component, sitemap/robots/llms.txt, netlify.toml security headers). Needs `firebase deploy --only firestore:rules` for the public-read `admin/seo` rule AND the Main-Forum public-read forum rules (Main-Forum viewable logged-out, other boards members-only). Forums/threads/profiles are never indexable: robots.txt + X-Robots-Tag headers + noindex meta. After the next Netlify deploy, verify headers at securityheaders.com and submit sitemap.xml in Search Console. Backlog: replace the placeholder og-image.png with branded art.

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
  `users/{uid}.settings.siteNotifications`, honors
  `settings.directPingNotifications` for mention notifications, and mirrors
  every notification to Discord as a channel ping (never a DM) for recipients
  with `settings.discordNotifications === true` AND a linked `discordUID`,
  via the Site Settings webhook; silently inert until the admin saves the
  webhook URL, then live immediately (needs a functions deploy). Admins can still assign BONUS team XP
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
  encounters can be fled at post time (success 95/95/90/90/80/75/70% by star;
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
- Battle mechanics pack + Daycare + Trading (July 2026) need a rules + functions
  deploy (`firebase deploy --only firestore:rules,functions`): STAB (x1.1),
  critical hits (3% / x1.5 both directions), 25 natures (attack/defense/speed/
  neutral; hash-derived for existing pokemon, random at catch/hatch), status
  conditions (burn/poison/paralysis, type-flavored, cured by the matching
  medicine items), thread weather (host sets sun/rain/sandstorm/snow at
  creation; boosts/weakens attacker types), ball-tier catch odds on beaten
  wilds (worn-down bonus, cap 95, Master Ball 100), and the mid-thread
  `pokemonCenterHeal` callable (Snag Coins, clears `battleDamage` +
  `battleStatus` for the caller). Every knob lives in
  `admin/battle_config.mechanics` (editable in Admin > Permissions > Battle
  Costs); client mirror `DEFAULT_BATTLE_MECHANICS` in `src/queries/game.ts`,
  server mirror `DEFAULT_MECHANICS`/`mechanicsFrom` in `functions/src/index.ts`;
  keep them in sync. New pages: /Daycare (breeding: one pair per member in
  `users/{uid}/bag/daycare`, server-written only per rules; egg hatches after
  mechanics.hatchDays days OR hatchPosts posts, offspring = base form of the
  non-Ditto parent's line) and /Trading. Guide: Library > The War Room reads
  the live config.
- Held items + Berry Farm + gym rematches (July 2026) need a rules + functions
  deploy: `setHeldItem` (equip from the dashboard box; battle effects for
  Muscle Band / Assault Vest / Leftovers / Shell Bell / Focus Sash / Quick
  Claw / Lucky Egg in `publishForumPost`, knobs in `mechanics.held*`),
  `plantBerry`/`harvestBerry` (`users/{uid}/bag/farm`, server-written only, UI
  on /Activities; defaults 7 grow days, yield 2), and challenge kind "rematch"
  on `requestChallenge`/`grantChallengeStep` (Rematch Ladder on /Challenges,
  tier = wins + 1, suggested star = 3 + tier). Abilities per species stay
  deferred (docs/BACKLOG.md wishlist).
- Trading Post + Fishing Pond + Center/breeding/battle-staff rework (July
  2026) need a rules + functions deploy:
  - /Trading is a LISTING BOARD (`tradeListings` collection, members read,
    writes via `createTradeListing`/`cancelTradeListing`/`makeTradeOffer`/
    `respondTradeOffer`; offers notify in-app). Old `proposeTrade`/
    `respondTrade` are gone. A pokemon on a locked team in an OPEN battle
    thread is untradable: locks mirror to `users/{uid}/bag/threadLocks`
    (written by publishForumPost team lock, cleaned by onThreadClosed,
    server-only per rules), greyed with a tooltip link client-side, enforced
    by `assertTradable` server-side. Self-trades between own characters ride
    `assignPokemonCharacter`. Wants criteria + snapshot previews are
    data-driven (MUSTHAVE_OPTIONS in `src/Pages/Trading/index.tsx` +
    `tradeSnapshotOf` server-side); extend those when new mechanics land.
    Reach the page from the Snag Mall footer cards.
  - The Fishing Pond: `ensureFishingThread` creates a pinned fishing-only
    thread in Events on first use (like the training log). One cast per member
    per week (snagWeekId, `thread.fishingClaims`); a rod is required and the
    BEST rod owned sets the bite odds (`ROD_ODDS`: Old 65/30/5 for 1/2/3
    star, Good 60/30/10, Super 55/30/10 + a 5% 4-star bite). Seed the Mall's
    Angler's Corner: `node scripts/seed-fishing-rods.mjs` from `functions/`.
    Releasing the catch pays 1 Snag Coin (`fleeAttempt` on the pond always
    succeeds). Entry card on /Activities.
  - Pokemon Center: no coins; a POST is the price (`centerVisit` on
    publishForumPost), and the lock is PER CHARACTER: it heals only the team
    brought on the visit post, and only that character sits out battles on
    the visit post + their next (`thread.battleLog.{uid}.chars.{charId}`;
    rollEncounter honors the cooldown for encounters rolled for that
    character). The member's other characters are unaffected.
    `pokemonCenterHeal` and `mechanics.centerCost` are gone.
  - Breeding: one male + one female sharing a (non-Undiscovered) egg group,
    OR anything paired with a Ditto (the universal partner, Undiscovered
    included). Only 7 star legendaries/mythicals never breed
    (eggGroupsByDex.json via `scripts/gen-egggroups.mjs`, mirrored in
    functions + src/data/pokemon). Offspring = mother's (or non-Ditto
    parent's) base form. Info boxes show nature, gender, star and egg group
    (catch banners intentionally do not).
  - New capability `ManageBattles` (battle staff): only admins/holders may
    toggle battle mode (`encounterConfig`, enforced in firestore.rules thread
    key sets) and they get host access on ANY thread (HostMenu, boss battles,
    weather, safari judging). Hosts can retune `weather` at any time
    (`setThreadWeather` callable + Host Menu panel).
- Type effectiveness + S.N.A.G. + Dev Board (July 2026) need a rules +
  functions deploy (`firebase deploy --only firestore:rules,functions`):
  battle damage/progress now scale by pokemon-type matchup (0.5x..2x clamp,
  chart in `src/lib/typeChart.ts` mirrored in functions; species types in
  `typesByDex.json`, regenerate with `scripts/gen-types.mjs`). GRAY,
  formerly S.N.A.G. (renamed July 2026; route is /GRAY, /SNAG redirects)
  (main nav, walkie icon) is a self-contained FAQ/SOP chat (NOT
  connected to external AI) that answers from a built-in knowledge base +
  member progress and files suggestions/bugs/questions into `tickets`
  (types dev_suggestion/dev_bug/member_question, status new). Admin >
  Manage > Dev Board triages those (discard or promote), tracks dev
  tickets, and holds admin-only planning notes (`devBoard` collection,
  admin-only rules). GRAY's knowledge base (KB array in
  `src/Pages/SnagAgent/index.tsx`) answers per-role: entries take an `admin`
  flag and give staff the admin manual (approve applications/imports, Adjust
  Lists, Safari launch, Dev Board) while members get the player-facing
  answer. July 2026 refresh added starter/new-member gate, Gaia import,
  encounter lists + 4-star rarity, registration verification, currencies,
  and tickets entries; keep the KB updated when features ship. /GRAY (and
  the legacy /SNAG) is noindex (meta + robots.txt + X-Robots-Tag in
  netlify.toml). Dashboard nav renamed Snag -> Trainer. Library gained
  The War Room (battle guide, live config numbers) and The Charter (forum
  permissions); forum pages show a small bottom-right category disclaimer.
- Forum-first flows (July 2026) need a functions + rules deploy before they work live: new callables `ensureTrainingThread`, `pickUpMission`, `requestChallenge`, `resolveChallengeRequest`, `requestMasterClearance`, `resolveMasterClearance`, updated `buyLottoTicket`/`logTrainingPost`/`onThreadClosed`, plus the `challengeRequests` and `masterClearanceRequests` rules blocks. After deploying, run `node scripts/seed-mission-encounters.mjs` from `functions/` (gcloud ADC; `--check` validates slugs offline) to seed per-mission encounter lists. Mission-default lists carry `missionDefault: true` and stay hidden from Field Registers and the host encounter picker.
- Training posts now flow through the forum: the Colosseum "Log a Training Post" button opens the pinned "Super Training Room Log" thread (`trainingLog: true`, created on first use) and the composer calls `logTrainingPost` (10-post window cap) before publishing. Direct replies to that thread bounce to /Colosseum.
- Mission grading: closing a thread with `missionId` auto-files the pending `missionSubmissions` doc (onThreadClosed); the manual submit form was removed from the mission brief.
- Onboarding gate + starter pick (July 2026) need a functions deploy: new `chooseStarter` callable (one-time first pokemon, any 1-star species or classic starter, only while owning zero pokemon; STARTER_DEX mirrored in `src/lib/starters.ts` and `functions/src/index.ts`, keep in sync) and server-side enforcement in `publishForumPost`/`publishForumThread` (new posts/threads require at least 1 character, each with a team holding at least 1 pokemon; edits exempt). Client: `useOnboardingStatus` + `OnboardingChecklist` (`src/components/onboarding/OnboardingChecklist.tsx`) render as the dashboard welcome (replaces the old zero-character banner, shows for Gaia returnees too) and as a pre-gate in both composers.
- Encounter rarity + region lists (July 2026): `rollEncounter` roll mode is star-weighted (4+ star species on a list are the rare bucket, `RARE_ENCOUNTER_RATE` = 5% per roll; star overrides honored) and needs a functions deploy. Default public lists: 4 habitat lists per region (36 total, ids `region-<region>-<area>`, 1-4 star only), seeded/refreshed with `node scripts/seed-region-lists.mjs` from `functions/` (`--check` previews; `--wipe` additionally deletes non-mission hand-made lists, used once for the July 2026 cleanup, plain runs never touch admin-created lists). List visibility is the existing `public` flag (Admin > Adjust Lists checkbox); mission pools stay `missionDefault: true` and hidden.
- Gaia profile export (July 2026): `scripts/gaia-export/` scrapes the guild's public Member Profiles board (61 threads incl. the "Snagem Member and Pokemon Listing" roster) into `raw/*.json` (`scrape.py`), then `organize.py` merges roster + profile threads into `accounts.json` (58 members, 105 characters, 460 pokemon, 534 item stacks) + `gap-report.md`. Purpose: prefill returning-Gaia-member onboarding imports. Uploaded to Firestore as `gaiaExports/{slug}` + `gaiaExports/_index` via `functions/scripts/upload-gaia-exports.mjs` (levels by evolution stage 5/20/40, shadow flag -> shadow 100, items matched to the catalog, misses shipped as itemsUnmatched; Gaia Snag Coins -> `pokecoin`, Emblems -> `snagemblem`). /Onboarding now has a self-serve GaiaPrefill panel (`src/Pages/User/Onboarding/GaiaPrefill.tsx`): locked to the account's `users/{uid}.gaiaName` when one is on file (copied at approval since July 2026; accounts with no Gaia name still get the searchable picker), then prefill the draft (merge, never clobber; unmatched items + emblem pieces + stale-roster warnings go to the reviewer note), create characters with their Gaia history, or download filled CSVs (empty templates remain in BulkUpload). NEEDS DEPLOY: `firebase deploy --only firestore:rules,functions` (gaiaExports read rule + gaiaName copy in approveNewUser). Related shipped pieces: per-character `history` field (Characters dashboard, legacy docs default it empty), pending-verification notice on Login/registration, encounter-list picker shows private lists to admins.
- Gap-fix pass (July 2026) needs a functions deploy (buyLottoTicket, drawLotto, evoService, cancelTradeListing, respondTradeOffer, assignPokemonCharacter, makeTradeOffer/createTradeListing via assertTradable, grantCurrency, approveImport, grantMasterMission, pickUpMission, requestChallenge, publishForumThread, breedPokemon comment only) plus `node scripts/seed-ambrosial-shop.mjs` from `functions/` to create the Ambrosial Alchemy craft storefront (Mall CraftBody lists the `recipes` collection). Emblem piece rollover (3 pieces = 1 emblem) now applies in grading, Donate grants, and imports alike. One open mission run per member (same mission) is enforced by pickUpMission; Master-tier missions require a master-cleared character. xpAward is fully retired (XP always per post).
- UX pack (July 2026): dashboard "Needs your attention" panel + nav Menu badge dot (shared `useAttention` hook in `src/lib/attention.ts`), forum cross-category search toggle, thread Copy Link, Trading strict "Wants what I have" filter + advisory offer-mismatch warning, Library Pokedex collection tracker (caught counter, silhouettes, caught-only filter), bag "Get more" item-source lines (`src/lib/itemSources.ts`), lore entry search, onboarding first-post nudge, and the `weeklyResetReminder` scheduled function (Monday 00:05 UTC, per-member `settings.weeklyReminders` toggle in Settings > Notifications; needs a functions deploy). GRAY KB covers all of it plus notification settings, the master-mission path, and a "what's next" ladder; keep the KB updated when features ship.
- UX pack 2 (July 2026) needs a functions deploy (publishForumPost, weeklyResetReminder, plus new `weeklyDeadlineReminder` Sun 12:00 UTC + `daycareEggReminder` daily 15:00 UTC scheduled fns; buyLottoTicket unaffected). Adds:
  - **Notifications:** new `settings.activityNotifications` (default OFF) gates `type:"trade"` + `type:"daycare"` pings; `settings.weeklyReminders` (default on) gates `type:"weekly"`. `weeklyDeadlineReminder` nudges members with unfinished Snag List on Sunday; `daycareEggReminder` pings when an egg is ready (stamps `eggReadyNotified` on `bag/daycare`, reset in breedPokemon).
  - **Mega Evolution:** per-post activation, NOT a permanent evolution and the Mega Stone is NEVER consumed (like a fishing rod). `publishForumPost` accepts `mega:{pokemonId,stone}`, checks the stone is owned, applies `mechanics.megaBoost` (default 1.3) to the fighter's attack that post, stamps `post.blocks.mega`, reverts after. Data: `MEGA_FORMS` built from `MEGA_STONE_SPECIES` in `functions/src/index.ts`, mirrored in `src/lib/mega.ts` (keep in sync); sprites are pokesprite `{slug}-mega[-x/-y]`. Composer UI `MegaPanel.tsx`; War Room documents it.
  - **Customizable nav:** `settings.navOrder` (string[] of labels); `src/lib/navConfig.ts` holds `PINNABLE_NAV_LABELS` + `resolveNavOrder`; SideBar shows first 4 (desktop) / 3 (mobile) on the bar, rest in the drawer; reorder UI at Settings > Navigation.
  - **Pokedex filters:** generation (`src/lib/generations.ts`) + type multiselects added to the Library Pokedex tab.
  - GRAY KB expanded: notification toggles, nav customization, mega, pokedex filters, daycare pings, and a staff-tools directory (where every admin task lives).
- Auth-gated pages (dashboard/editor/admin) migrated to Mantine 9 mechanically. Visual QA pending a logged-in pass.
- Forum game actions run through Cloud Functions (`functions/`, deploy with `firebase deploy --only firestore:rules,functions`, Blaze plan required). Deploy rules + functions TOGETHER: the tightened rules assume the callables exist. Older integrity/perf backlog items (public Discord endpoint, hand-editable `bag/*`, post-page cursors, thread-list index, getTeams cascade) are all CLOSED as of 2026-07; see docs/BACKLOG.md before re-adding any of them here.
- Approval/rejection emails (July 2026, needs functions deploy): `approveNewUser`/`rejectNewUser` email the applicant via SendGrid; config in `adminSecrets/email` (Site Settings > Email notices: API key, verified from address, from name), silent no-op until saved. Owner still needs to create the SendGrid account and paste the key.
- Currency naming: the `pokecoin` bag key DISPLAYS as "Snag Coins" everywhere (renamed July 2026; the stored key is unchanged). Emblem pieces (`snagEmblemPieces`) are grantable (Donate), importable (onboarding + Gaia prefill parses "2/3" counts), and applied by `approveImport`; 3 pieces = 1 emblem.
- Starter pick: the checklist's picker is a searchable sprite grid (classic starters first); `chooseStarter` honors `admin/star_overrides` (needs functions deploy).
- XP/stats are awarded automatically; items/coins are reviewed at close. `publishForumPost` applies each team pokemon's per-post experience/friendship/purification/shadow to `owned_pokemons` immediately AND tallies the same amounts into `thread.pendingXp` as a display-only running log. At close, `CloseThreadModal` shows an XP-gained summary from `pendingXp`, and `ThreadRewards.tsx` renders that same XP read-only while the reviewer assigns items/coins/pokemon; `finalizeThreadRewards` grants only those (it no longer re-applies `pokemonXp`, since XP was already given). The old `xpAward: "instant"|"onClose"` choice is retired (still stored, no longer read).
- Item mechanics wave 2 (July 2026, NEEDS a functions deploy, no rules change): Z-Moves, X items, Dire Hit, type-matched Gems, `sellItem` (valuables), and `useItemOnPokemon` (Exp Candy/Rare Candy -> XP, Vitamins -> +friendship, Plates/Memories -> flat XP fallback). Z-Move + battle-item effects apply in `publishForumPost` (payload `zmove:{pokemonId,itemId}` not consumed, `battleItems:[{itemId,name}]` consumed) at the encounter + boss attack calc; new mechanics knobs `zBoost`/`xAttackBoost`/`direHitCrit`/`gemBoost`/`xDefenseMult`/`xSpeedFlee` live in all 4 sync places (DEFAULT_MECHANICS, BattleMechanics, DEFAULT_BATTLE_MECHANICS, MECHANICS_FIELDS). Item->effect maps are keyed by STABLE ITEM ID (bag stores display names, not slugs): server `Z_CRYSTAL_ID`/`XITEM_FX`/`GEM_TYPE`/`SELL_VALUES`/`EXP_CANDY_XP`/`VITAMIN_IDS` mirror client `src/lib/battleItems.ts` + `src/lib/itemUses.ts`; keep in sync. Composer panels `ZPanel`/`BattleItemsPanel`; bag Sell/Use via `ItemActionModal` in `Items.tsx`. Still deferred (docs/BACKLOG.md): EV system, TM/TR movesets, Arceus/Silvally type forms for Plates/Memories (XP fallback until then), X Accuracy/Guard Spec (consumed, no effect).
