# Snagem Backlog (circle back later)

Living list of everything known-missing, deferred, or rough. Not blockers, things
to polish or finish when there's time. Grouped by kind. Newest additions from the
July 2026 build-out are marked (2026-07).

## Assets & sprites

- **Gen 9 shiny sprites** (2026-07). Pokemon sprites come from `msikma/pokesprite`
  via jsDelivr, but Gen 9 (#906-1025) box sprites are bundled locally as the REGULAR
  set only (`src/assets/sprites/gen9/`). A shiny Gen 9 species falls back to its
  regular sprite. See `src/helpers/index.ts` (getPokemonImageURL, comment at ~line 36).
  Fix: add a shiny Gen 9 sprite set to `src/assets/sprites/gen9/` and branch on `shiny`.
- **Custom item sprites** (2026-07). Some shop/recipe items are not in the item
  catalog (`src/data/item/item.json`), so they show a blank icon (name + description
  still render). Known: Scents (Joy/Excite/Vivid), Shadow Vaccine, Mega Stones,
  Z-Crystals, Sparkling/Key Stone, Mystery Pebble, Mystery Sack, Snag Emblem/Pieces,
  Destiny Stone, Pokeblocks, some Snag Machine upgrades, fossils, apricorns. Fix: add
  sprites + catalog rows, or map these ids to existing art.
- **Gym badge art** (2026-07). Challenges "Badges Earned" uses letter chips, not real
  badge images. Options logged: SteGriff vector badges (jsDelivr) or vendor pixel PNGs
  into `public/badges/`. Plumbing not added yet.
- **Profile emotes** show placeholder squares; emote images are not resolved on the
  public profile (`src/Pages/User/PublicProfile.tsx`).

## Seed / data completeness (`functions/scripts/seed.mjs`)

- **Mission text is near-verbatim, not exact** (2026-07). Objectives/opposition were
  paraphrased by the page fetcher. Titles, locations, reward kinds, and coin values are
  accurate. Re-fetch the Mission Vault pages logged in for character-exact flavor.
- **Gym rosters are names only** (2026-07). `gymRegions` seeds leader names + types +
  Kanto/Johto/Hoenn only. Missing: per-gym Pokemon rosters, field/terrain descriptions,
  Elite Four/Champion rosters, and Sinnoh/Unova/Kalos/Galar regions.
- **Island trials are partial** (2026-07). Totem/reward basics only; no per-trial
  objective detail or SOS specifics.
- **K&L loot tables are a subset** (2026-07). Each biome has ~5 range entries covering
  1-120, not the full ~30-row forum tables. Consumable-half payout and exclusions are
  not modeled. Full tables were captured in research and can be ported.
- **Research canon tables incomplete** (2026-07). Channeler per-type skill trees +
  cooldowns, full Mega Stone <-> species map, full Z-Crystal <-> type/species map, and
  the complete fossil <-> Pokemon map are partial. See `docs/RESEARCH_DATA.md`.
- **Hall of Fame** seeds winners only, no champion team rosters.
- **E.V.O.** has no fixed move catalog (priced case-by-case by admins).
- **Recipe ingredients** resolve by display name; a few uncommon ingredient ids may
  not match a real catalog id, so those crafts would fail until reconciled.

## Unbuilt features

- **Lore Library page** (2026-07). `docs/LORE_DATA.md` is fully scoped (loreBooks +
  loreEntries schema, the Book of [Type] / Compendium / Story So Far content) but NOT
  built as a page. Intended as a new tab on `/Library` or a sibling page. Also: Gaia
  gated index pages 2-3, so ~9 type books (Fire, Grass, Electric, Ground, Rock, Flying,
  Fighting, Ice, Steel) still need pulling logged in.
- **Scheduled Shadow Lotto draw** (2026-07). `drawLotto` is a manual grader callable;
  no weekly cron. Also winners each get the full jackpot (should split among winners).
- **Tournament bracket management** (2026-07). `tournaments` display sign-ups/prizes;
  bracket + standings are manual/admin, no UI.
- **Dedicated mission detail design** (2026-07). `/Missions/:id` is a functional page;
  a bespoke design from the owner is still pending.
- **Colosseum battle-report entry** (2026-07). Rankings adjust via a simple UID+points
  form in Admin > Grading; no per-battle scoring UI.

## Backend / integrity

- **Currency stored as strings** (2026-07). `bag/currency` values are strings; spend
  math uses parseInt server-side. Migrate to numbers before heavier economy math.
- **Recycle rules simplified** (2026-07). `recycleItems` pays floor(n * 1.2); does not
  enforce consumable-half, medicine exclusion, or the 1-coin-item exclusion. Candy ->
  Scent conversion is not implemented as a function.
- **Members post-count index** (2026-07). The directory + profile post/thread counts use
  a `collectionGroup` aggregation needing a composite index; until created they show
  "-". Firebase logs a one-click create link on first run.
- **Public profiles are members-only.** Reads require sign-in (firestore rules). Not
  viewable logged-out; decide if world-public sharing is wanted.
- **Function CPU cap** (2026-07). All functions run at cpu 0.25 / maxInstances 1 to fit
  the project's non-raiseable 20,000 milli vCPU regional quota. If traffic grows or the
  quota is raised (Sales), bump these in `functions/src/index.ts` setGlobalOptions.

## Pre-existing deferred (from CLAUDE.md)

- **Forum middle-page reads** from top of collection; switch `getPostsPage` to
  `startAfter()` cursors (`src/Pages/forum/queries.ts`).
- **Thread list filters** `closed`/pinned client-side after `limit(200)`; move to
  `where`/`orderBy` (needs a composite index).
- **Deferred XP for non-admin threads**: accumulate per-pokemon XP into the reward
  session and commit at thread close, with an admin edit step and a `ReviewRewards`-style
  gate. Admin threads keep immediate XP.
- **Discord notify endpoint** (`VITE_BACKEND_DISCORD_BOT`, `src/Discord/NewPost.tsx`) is
  public in the bundle; move behind an authenticated / rate-limited Cloud Function.
- **`getTeams()`/`getTeam()`** cascade an extra `getOwnedPokemons()` read; split so
  pokemon data is fetched once (`src/queries/dashboard.ts`).
- **Users can hand-edit their own `bag/*` inventory** (remaining forum integrity gap;
  see `docs/FORUM.md` "Still deferred").
- **`bun audit`** transitive findings; re-audit after major bumps.

## QA

- **Logged-in visual QA pass** across all the new auth-gated pages (dashboard/editor/
  admin + the 2026-07 systems). Preview verification so far was logged-out empty states.
