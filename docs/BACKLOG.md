# Snagem Backlog (circle back later)

Living list of everything known-missing, deferred, or rough. Not blockers, things
to polish or finish when there's time. Grouped by kind. Newest additions from the
July 2026 build-out are marked (2026-07).

## Audits (2026-07, owner-requested)

- **Item sprites, remote 404s.** Every catalog row has a `Filename`, so the
  gaps are remote: sprites load from the CDN and a wrong path renders blank.
  To enumerate real 404s, run a HEAD-request sweep over
  `getItemImageURL(filePath)` for all 994 items from a machine with network
  access and record the failures here. Known suspects: hand-added items
  (Shadow Vaccine) and custom shop/recipe art (see Assets below).
- **Buttons without links.** No `to="/"` placeholders remain (the homepage
  "See Anticipated Updates" was the last and now goes to /Announcements).
  The S.N.A.G. suggestion box is the place to catch any stragglers members
  find; nothing else surfaced in a static sweep of Button/Link usage.
- **Visibility concerns for public/regular users:**
  - `users/{uid}` docs are readable by ANY signed-in member
    (firestore.rules) and carry emails and settings. The members roster only
    displays safe fields, but the raw doc is fetchable. Consider a public
    profile subdocument or field-level split.
  - `tickets` accepts writes from any signed-in user with arbitrary
    payloads (S.N.A.G. relies on this). Fine for now; rate-limit or move
    behind a callable if spam appears.
  - `admin/star_overrides` and `admin/email_templates` are writable by the
    generic admin/{doc} rule, which includes ManageLists/ManageBadges/
    ManageSEO directors, wider than the admin-only UI implies.
  - The Discord notify endpoint is still public in the bundle (known, below).
  - Lore/announcement admin reads are gated by UI only in a few places; the
    Firestore rules are the real boundary and were spot-checked, but a full
    rules review before opening registration is recommended.

## Assets & sprites

- **Shadow Vaccine sprite** (2026-07). The Shadow Vaccine item was added to the
  catalog (`src/data/item/item.json`, item 994) with `Filename:
  medicine/shadow-vaccine.png`, which may not exist yet, so it can render a blank
  icon. Verify/add the sprite (or map to existing art). Re-add the catalog row if
  item.json is ever regenerated.

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
  sprites + catalog rows, or map these ids to existing art. UPDATE (2026-07): the 6 evolution
  items (Link Cable, Metal Alloy, Syrupy Apple, Unremarkable Teacup, Auspicious/Malicious
  Armor), Elemental Gem, and Mystery Pebble now HAVE catalog rows (item_15856-15863) with
  `evo-item/`, `gem/`, `other-item/` sprite paths; the PNG files still need adding.
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
  not modeled. NOTE (corrected 2026-07): the full ~30-row tables are NOT in the repo. The
  earlier "captured in research and can be ported" claim points to an external research
  session, not a file here. Porting requires re-fetching the biome tables from the forum
  (logged in) or recovering those notes; there is nothing in-repo to port from.
- **Research canon tables incomplete** (2026-07). Partial breakdown:
  - **Fossil <-> Pokemon map** DONE + BUG FIX (2026-07). `fossilMap` now covers the full
    canon revivable set (11: Old Amber/Helix/Dome/Root/Claw/Skull/Armor/Cover/Plume/Jaw/Sail
    -> Aerodactyl/Omanyte/Kabuto/Lileep/Anorith/Cranidos/Shieldon/Tirtouga/Archen/Tyrunt/Amaura).
    It ALSO fixes a latent bug: the old entries resolved via `item("valuable", "helix-fossil")`,
    which matched no catalog row and produced synthetic keys (`valuable-helix-fossil`) that
    never matched a real bag fossil's Item ID (`item_01xx`), so `reviveFossil` and the Research
    chamber silently failed for every fossil. Keys are now the real `fossil/<sprite>` catalog
    Item IDs. bird/dino/drake/fish sprites have no canon revived species and are left unmapped.
    CAVEAT: reseeding merges, so the stale synthetic `valuable-*` keys will linger in the
    deployed `admin/research_config` doc alongside the correct ones (harmless, never match a
    real fossil); delete them in the console if you want the doc clean.
  - **Mega Stone <-> species / Z-Crystal <-> species maps** ADDED as pure data (2026-07).
    `research_config.megaStoneSpecies` (45 stones incl. Charizardite X/Y -> charizard) and
    `research_config.zCrystalSpecies` (17 species-locked crystals; the 18 type crystals in
    `Z_NAME` are not species-specific) are now seeded in `seed.mjs`. NOTE: still NO CONSUMER,
    nothing reads them yet (Mega/Z access is gated by capstone unlock flags). They are reference
    data ready for a future "which species can use this stone/crystal" UI.
  - **Channeler per-type skill trees + cooldowns** still GENUINELY MISSING: not canon, custom
    guild content that needs the Gaia sub-posts (logged in) or fresh authoring. See
    `docs/RESEARCH_DATA.md`.
- **Hall of Fame** DONE (verified 2026-07). `hall_of_fame` already seeds each of the 4
  entries with a full 6-slug champion `team` roster (`seed.mjs` hall_of_fame), and the
  Colosseum `ChampionCard` renders it. The earlier "winners only" note was stale.
- **E.V.O.** has no fixed move catalog (priced case-by-case by admins).
- **Recipe ingredients: two unobtainable** RESOLVED / 1 source flagged (2026-07). Both now
  have catalog rows and `SEED_CHECK=1 node scripts/seed.mjs` reports "All recipe ingredients
  are obtainable." **Elemental Gem** DONE: catalog row added (`gem`, item_15862) and it was
  already sold in the "Held Items" shop (2 SC), so the Mega Stone / Z-Crystal recipes can now
  resolve + be crafted. **Mystery Pebble**: catalog row added (`other-item`, item_15863) so the
  Mystery Sack recipe resolves, BUT it has NO source (guild-custom item, not canon; sold/dropped
  nowhere). SOURCE IS AN OWNER DECISION: pick a home (shop price, mission reward, or a drop) so
  players can obtain it and craft the Mystery Sack. Sprites still needed for both (blank icon).

## Pokemon-game mechanics wishlist (2026-07 evaluation)

Ideas evaluated from the mainline games after the battle-mechanics pack landed.
Status as of 2026-07:

- **Held items** DONE (2026-07). Equip/remove per pokemon from the dashboard box
  (`setHeldItem` callable; equipping spends the bag item, removing returns it).
  Battle set wired into `publishForumPost`: Muscle Band (attack), Assault Vest
  (defense), Leftovers/Shell Bell (heal tick), Focus Sash (survive from full HP
  at 1), Quick Claw (flee bonus), Lucky Egg (exp boost). All numbers are
  admin-tunable in Battle Costs (`mechanics.held*`/`luckyEggBoost`). Other
  hold-items equip but are cosmetic. Needs the functions deploy.
- **Fishing** REWORKED into the Fishing Pond (2026-07, owner direction): its own
  pinned Events thread (created on first use via `ensureFishingThread`), one
  cast per member per week, any rod required, 1/2/3 star Water bites at
  60/30/10, release pays 1 Snag Coin, fishing-only posts. Seed the Mall's
  "Angler's Corner" with `node scripts/seed-fishing-rods.mjs` from `functions/`.
  NOTE: rod tiers currently only gate ACCESS (any rod works, same odds); if
  better rods should improve the 2-3 star odds, that is an owner call.
- **Berry farming** DONE (2026-07). The Berry Farm on /Activities:
  `plantBerry`/`harvestBerry` callables, state in `users/{uid}/bag/farm`
  (server-written only per rules), grow days / yield / plot count admin-tunable.
- **Gym rematch ladder** DONE (2026-07). Rematch Ladder card on /Challenges for
  badge-holding leaders; `requestChallenge` kind "rematch" (validates the badge,
  computes the tier, pings staff with a suggested star level),
  `grantChallengeStep` kind "rematch" bumps the tier. Staff inbox + Grading form
  updated.
- **Abilities (one passive per species)** DEFERRED, owner call. A 1025-species
  data lift for modest payoff; revisit after held items have seen play, since
  the battle hook points are the same.

## Unbuilt features

- **Lore Library content** — NO LONGER Gaia-blocked; real gaps FILLED (2026-07). The Lore tab
  is BUILT, and a full Gaia crawl (all posts + replies) recovered the sections a first-post-only
  scraper had missed. `functions/scripts/lore-data.json` now includes them (LOCAL edit only, NOT
  yet seeded to the DB): Book of Normal -Bareeno Village-; Book of Water -The Gyaan- and
  -The Disappearance-; and 7 new Compendium rosters ([Unova], [Kalos], [Alola], [Galar],
  [Other], [Ultra Space], [Paldea] Natives; Barbara Perez and Indi kept as faithful stubs).
  Short Stories (Frozen Bond both parts, Amaya's Riddle Part 1 stub) and the 5 gem stubs
  (aliases present, descriptions blank on Gaia) were already faithful. To publish: run
  `node functions/scripts/seed-lore.mjs` (owner-confirmed DB write, not done here).
  NOT a gap: the 9 "missing" type books (Fire, Grass, Electric, Ground, Rock, Flying, Fighting,
  Ice, Steel) were NEVER WRITTEN on Gaia and do not exist -- creating them is fresh authoring, an
  OWNER DECISION, not a migration. OWNER DECISION also: Team Shout vs Team Yell (the Gaia
  [Team Shout] post is a completely empty stub; nothing there says whether it renames Team Yell,
  so the repo's "Team Yell" was left untouched). Optional: cross-book search; Tiptap editor for
  bodies (today an HTML textarea with sanitized preview).
- **Scheduled Shadow Lotto draw** (2026-07). DONE for now as a manual admin action:
  `drawLotto` splits the jackpot among matching tickets and there is a grader/admin "Draw
  winner" button on the Casino Shadow Lotto card. A weekly cron is intentionally NOT used
  (owner's call). Add an `onSchedule` job later if an automatic weekly draw is wanted.
- **Tournament bracket management** (2026-07). Bracket DISPLAY is now built: the
  `Tournament` type carries an optional `bracket: BracketRound[]` (`src/queries/colosseum.ts`),
  and `BracketCard` renders it read-only (rounds as columns, winner highlighted, mobile
  horizontal-scroll) inside the featured tournament (`src/Pages/Colosseum/index.tsx`).
  Verified rendering with an injected sample. STILL DEFERRED: an in-app bracket EDITOR.
  Authoring the `bracket`/standings fields is admin-only and needs a Firestore write rule
  on `tournaments/{id}` (console) before a client editor can be shipped; today the field is
  populated via seed/console.
- **Dedicated mission detail design** (2026-07). `/Missions/:id` is a functional page;
  a bespoke design from the owner is still pending.
- **Colosseum battle-report entry** DONE (2026-07). Admin > Grading now has a `BattleReportForm`
  (`src/Pages/User/Dashboard/Admin/Grading.tsx`) that itemizes a reported battle (Pokemon
  defeated/survived, win, champion, upset rank gap, tournament win), computes the point total
  from the documented scoring scheme, and awards it through the existing secured
  `awardRankingPoints` callable (no new collection/write path). The plain UID+points form is
  kept above it for manual adjustments. Wins/losses/streak still adjust manually. Visual QA
  pending a logged-in staff pass.

## Backend / integrity

- **Currency stored as strings** DONE, APPLIED + DEPLOYED (2026-07). All server writes emit
  NUMBERS: `addCurrencyString` renamed to `addCurrency` (returns a number, still tolerates a
  legacy string on read); the ~7 direct `String(have - x)` writes + `Record<string,string>`
  accumulators in `functions/src/index.ts` made numeric. Client tolerant: `Currencies` typed
  numeric, `CurrencyChip` uses `String(amount).padStart`, Casino `num()` accepts number|string.
  Migration `functions/scripts/migrate-currency-to-numbers.mjs` (dry-run/--backup/--apply/
  --restore, sum-invariant verify) was RUN with `--apply` against `snagemguild`: 2 docs, 3 string
  fields converted to numbers, VERIFY OK (per-field sums unchanged: pokecoin 12, gengarcoin 1,
  snagemblem 1); backup saved under `functions/scripts/backups/` (gitignored). Functions DEPLOYED
  (`firebase deploy --only functions`, 48/48 successful) and the client code was committed +
  pushed to `main` (Netlify build) so the padStart-tolerant build ships. Chain now consistent:
  data numeric, functions write numbers, client reads tolerantly.
- **Recycle rules** (2026-07). DONE. `recycleItems` enforces medicine exclusion,
  consumable-half (RECYCLE_* sets), and the 1-coin-item exclusion (a cached itemId ->
  lowest-shop-price index built from the shops collection; price === 1 items are refused).
  The Mall preview is a non-authoritative estimate and does not know prices, so it may
  slightly over-count 1-coin items; the server returns the real coin total.
- **Candy -> Scent conversion** (2026-07). DONE. `convertCandyToScent` spends a Pokemon's
  Evo Points (experience) for Joy/Excite/Vivid Scents (4/6/8 each) with a UI in the Trash
  Shack. Scents have no catalog sprite yet, so they show a blank icon (see custom sprites).
- **Members post-count index** DONE (2026-07). The `collectionGroup` field indexes the
  directory + profile counts need are now tracked in `firestore.indexes.json` (COLLECTION_GROUP
  scope on `posts.ownerUid`, `threads.hostUid`, `threads.ownerUid`) and DEPLOYED to
  `snagemguild` via `firebase deploy --only firestore:indexes`. Counts populate once the indexes
  finish building (they may briefly still show "-" until then).
- **Public profiles are world-public** (2026-07). Logged-out visitors can view profiles.
  The users doc stays members-only (it holds email + discordUID); its world-safe display
  fields (username, avatar, badges, role, signature, emojis) are mirrored into
  `publicProfiles/{uid}` by the `syncPublicProfile` trigger, and the bag profile subset
  (profile/characters/teams/owned_pokemons) is world-readable. Discord is fetched
  separately from the members-only users doc and shown only to signed-in viewers (per the
  member's `discordPublic` opt-in), so it never reaches the world. BACKFILL DONE (2026-07):
  `node functions/scripts/backfill-public-profiles.mjs` was run against `snagemguild` and
  populated 6 public profiles (the full roster); new writes sync automatically via the trigger.
  Forum activity counts still need sign-in, so they show "-" logged-out.
- **Function CPU cap** REVIEWED, no safe global bump (2026-07). All functions run at cpu 0.25 /
  maxInstances 1 via `setGlobalOptions`. There are now 48 exported functions: 48 x 0.25 x 1 =
  12,000 milli vCPU of the non-raiseable 20,000m regional quota (8,000m headroom). Any GLOBAL
  bump exceeds the cap: cpu 0.5 -> 24,000m, or maxInstances 2 -> 24,000m, both over. So the
  global setting was left unchanged. The only in-limit option is TARGETED per-function
  `maxInstances: 2` (+250m each) on genuinely hot callables (e.g. `buyShopItem`,
  `publishForumPost`, `playCasinoGame`), up to ~32 extra instance-slots before the cap. Not
  applied: no traffic data to pick hot paths, and deploy can't be validated here. Revisit with
  Cloud Run metrics, or if the quota is raised (Sales).

## Pre-existing deferred (from CLAUDE.md)

- **Forum middle-page reads** DONE (2026-07). `getPostsPage` no longer reads
  `safePage * perPage` docs from the top for a cold middle-page jump. It now starts from the
  nearest cached page boundary at or before `safePage-1` and walks forward one page at a time
  (`startAfter` + `limit(perPage)`), caching every intermediate boundary so later jumps are
  cheap and it never holds more than one page of docs in memory. The reverse-tail last-page
  path is unchanged. Verified against a real 33-post thread (7 pages): cold middle-jump,
  sequential 1..7 (concat == full 33, no gaps/dupes), and cold last-page all correct.
- **Thread list filters** DONE (2026-07). `getThreadList(forum, archive)` now filters the
  archive state SERVER-SIDE via `where("closed","==",archive)` + `orderBy("timePosted","desc")`,
  backed by the deployed composite index (threads: closed ASC, timePosted DESC). It falls back
  to the old fetch-all + client-filter if the index is not built yet, so it never breaks during
  rollout. `pinned` stays a client-side float (verified on prod: all 15 threads have `closed`,
  none have `pinned`, so pinned cannot be part of the server orderBy without dropping rows).
  `ForumIndex` keys the query by archive so open/archived cache separately.
- **Deferred XP for non-admin threads** DONE (verified 2026-07). Already wired end to end:
  `publishForumPost` accrues per-pokemon XP into `thread.pendingXp` for non-admin/onClose
  threads (admin/staff threads apply immediately, gated by `createdByAdmin`); the close
  review page `ThreadRewards.tsx` seeds an editable per-pokemon table from `pendingXp`;
  `finalizeThreadRewards` commits the edited `pokemonXp` to `owned_pokemons`, gated by
  `GiveItems`/`ReviewRewards`.
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
- **Six evolution items have no catalog row** DONE (2026-07). Added `evo-item` catalog rows
  (`src/data/item/item.json`, ids item_15856-15861) for Link Cable, Metal Alloy, Syrupy Apple,
  Unremarkable Teacup, Auspicious Armor, Malicious Armor, so they resolve to real ids (were
  synthetic) and `evolvePokemon` matches them by name. SOURCE: 5 were already sold in the
  "Evolutionary Items" shop section at 25 SC; Link Cable was the only one missing and is now
  added there at the same 25. No design decision needed (matches the existing evo-item economy).
  Remaining: sprite PNGs for the 6 (blank icon until added, see Custom item sprites).
- **`bun audit`** clean as of 2026-07 (no vulnerabilities). Re-audit after major bumps.
