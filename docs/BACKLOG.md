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
- **Recipe ingredients: two unobtainable** (2026-07). The 7 Apricorn name mismatches are
  fixed (the `apricorn` group now titles as "X Apricorn"), and `SEED_CHECK=1 node
  scripts/seed.mjs` validates ingredient ids offline. Two ingredients still resolve to no
  catalog item and are craftable/obtainable nowhere: **Elemental Gem** (needed by every
  Mega Stone and Z-Crystal recipe) and **Mystery Pebble** (for the Mystery Sack). Both
  need a real item source or a mapping to existing items before those crafts can succeed.

## Unbuilt features

- **Lore Library content** (2026-07). The Lore tab is BUILT (`src/Pages/Library/lore.tsx`,
  reader + ManageLore admin editor; loreBooks/loreEntries collections + rules; page-1 book
  shells seeded). Still needs real content: the entry bodies are migrated in-app by a
  ManageLore director, and the 9 remaining type books (Fire, Grass, Electric, Ground,
  Rock, Flying, Fighting, Ice, Steel) still need pulling from Gaia logged in. Optional:
  cross-book entry search (today search is per-book) and reusing the rich Tiptap editor
  for the body field (today it is an HTML textarea with a sanitized preview).
- **Scheduled Shadow Lotto draw** (2026-07). DONE for now as a manual admin action:
  `drawLotto` splits the jackpot among matching tickets and there is a grader/admin "Draw
  winner" button on the Casino Shadow Lotto card. A weekly cron is intentionally NOT used
  (owner's call). Add an `onSchedule` job later if an automatic weekly draw is wanted.
- **Tournament bracket management** (2026-07). `tournaments` display sign-ups/prizes;
  bracket + standings are manual/admin, no UI.
- **Dedicated mission detail design** (2026-07). `/Missions/:id` is a functional page;
  a bespoke design from the owner is still pending.
- **Colosseum battle-report entry** (2026-07). Rankings adjust via a simple UID+points
  form in Admin > Grading; no per-battle scoring UI.

## Backend / integrity

- **Currency stored as strings** (2026-07). `bag/currency` values are strings; spend
  math uses parseInt server-side. Migrate to numbers before heavier economy math.
- **Recycle rules** (2026-07). DONE. `recycleItems` enforces medicine exclusion,
  consumable-half (RECYCLE_* sets), and the 1-coin-item exclusion (a cached itemId ->
  lowest-shop-price index built from the shops collection; price === 1 items are refused).
  The Mall preview is a non-authoritative estimate and does not know prices, so it may
  slightly over-count 1-coin items; the server returns the real coin total.
- **Candy -> Scent conversion** (2026-07). DONE. `convertCandyToScent` spends a Pokemon's
  Evo Points (experience) for Joy/Excite/Vivid Scents (4/6/8 each) with a UI in the Trash
  Shack. Scents have no catalog sprite yet, so they show a blank icon (see custom sprites).
- **Members post-count index** (2026-07). The directory + profile post/thread counts use
  a `collectionGroup` aggregation needing a composite index; until created they show
  "-". Firebase logs a one-click create link on first run.
- **Public profiles are world-public** (2026-07). Logged-out visitors can view profiles.
  The users doc stays members-only (it holds email + discordUID); its world-safe display
  fields (username, avatar, badges, role, signature, emojis) are mirrored into
  `publicProfiles/{uid}` by the `syncPublicProfile` trigger, and the bag profile subset
  (profile/characters/teams/owned_pokemons) is world-readable. Discord is fetched
  separately from the members-only users doc and shown only to signed-in viewers (per the
  member's `discordPublic` opt-in), so it never reaches the world. TODO after deploy: run
  the `backfillPublicProfiles` callable once to populate existing members (new writes sync
  automatically). Forum activity counts still need sign-in, so they show "-" logged-out.
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
- **Discord notify endpoint** (2026-07). DONE. `src/Discord/NewPost.tsx` was dead code and
  the only reference to the public `VITE_BACKEND_DISCORD_BOT`; both are removed (and the
  now-unused `axios` dep). Thread-creation Discord notifications already run server-side
  via the `onThreadCreatedDiscord` trigger + `adminSecrets` webhook. If notify-on-new-post
  to bookmark watchers is wanted, add it to that secure server path (not a public URL).
- **`getTeams()`/`getTeam()`** DONE. No cascading read remains: callers use `getTeamsRaw`
  plus a shared, cached `getOwnedPokemons` query and `hydrateTeams` (`src/queries/dashboard.ts`).
- **Users can hand-edit their own `bag/*` inventory** CLOSED (2026-07). `bag/currency`,
  `bag/items`, and `bag/owned_pokemons` are all function/admin-only now. The last two
  client write paths were migrated to callables: `evolvePokemon` (server looks up the real
  evolution, checks the level/friendship/item gate, spends the item, applies the change)
  and `assignPokemonCharacter` (owned-pokemon character assignment). Members can no longer
  self-edit coins, item quantities, experience, species, or shiny state. `bag/items`
  still allows GiveItems/Admin writes for the Donate grant tool.
- **Six evolution items have no catalog row** (2026-07). Link Cable (gates most trade
  evolutions: Alakazam, Machamp, Golem, Gengar), Metal Alloy, Syrupy Apple, Unremarkable
  Teacup, Auspicious Armor, Malicious Armor. Those evolutions are already blocked in the
  UI (the item is unobtainable), and the server matches. Add catalog rows + a source to
  enable them. Same class as the missing recipe items.
- **`bun audit`** clean as of 2026-07 (no vulnerabilities). Re-audit after major bumps.

## QA

- **Logged-in visual QA pass** across all the new auth-gated pages (dashboard/editor/
  admin + the 2026-07 systems). Preview verification so far was logged-out empty states.
