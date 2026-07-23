# Snagem Backlog (circle back later)

Living list of everything known-missing, deferred, or rough. Not blockers, things
to polish or finish when there's time. Grouped by kind. Newest additions from the
July 2026 build-out are marked (2026-07).

## Redesign + gameplay gap audit (2026-07, post-redesign)

Full audit after the site-wide redesign. The callable layer is complete (every
game callable referenced in `src/` exists in `functions/src/index.ts`); the
long "needs a functions/rules deploy" list is deploy-pending, not missing code.
Real gaps, highest value first:

**Redesign mockup features not built:**
- **Casino: 3 missing games + 2 simplified.** `Casino OK.dc.html` has 7 games;
  the build backs 4. Missing entirely: **Spooky Slots** (3 reels; small, extend
  `playCasinoGame`, no new CF), **Ghost Card Flip** (3 cards, pick index; small,
  no new CF), **Haunter's High-Low** (call higher/lower, pot doubles, cash out;
  needs a NEW stateful Cloud Function to persist the in-progress hand + query
  wrappers). Simplified: **Hex Roulette** allows 1 pick at 5.5x vs mockup's up
  to 5 hexes at 20x (`functions/src/index.ts:6253`); **Dream Dice** one total
  vs up to 3. Extending both = CF payout-math + multi-select grid.
- **Dashboard team "LOCKED TO THREAD" state** DONE (2026-07-23). `SingleTeam`
  reads `users/{uid}/bag/threadLocks` (map keyed `${forum}__${threadId}` with
  `teamIds` + `title`) and shows a red LOCKED TO THREAD badge (tooltip names
  the thread) in place of EDIT/DELETE when a team is locked into an open
  battle thread. The editor is also guarded in `isEditing`, the Edit click
  handler, and `handleSave`, so a locked team cannot be opened for edits.
- **Thread team-tile hover is name-only** vs the mockup's per-pokemon stat card
  (Lv/type/HP/shadow/held). `PostCharacter.pokemon` denormalizes only
  `{slug,name}`; surfacing the rest needs `publishForumPost` to denormalize
  more onto the post team snapshot. Small client, medium overall (CF change).
- **Activities "More things to do" place-card grid missing** (`Activities/
  index.tsx` ~585-593 jumps to a "coming soon" line). Small, no CF (router Links).
- **Research "Are you ready?" checklist is hardcoded** (identical per character;
  the red "not met" state is unreachable) and the hero ACCESS badge keys off the
  active view, not the character's clearance. Medium/small, no CF (data present).
- **Colosseum friend-code regex validation** DONE (2026-07-23). `RegisterCard`
  normalizes to uppercase and gates on `^SW-\d{4}-\d{4}-\d{4}$` with an inline
  "Format: SW-1234-4567-8901" error; the same normalized value is saved.

**Gameplay gaps (redesign-independent):**
- **Z-Crystals/Z-moves have no battle consumer.** Items exist, `progress.
  zCrystals` + `zmoveUnlocked` are written, but `publishForumPost` has no Z
  effect and there is no composer Z panel (Mega is fully wired for contrast).
  Medium (functions + composer). Likely intended as deferred Mega-parity.
- **Channeler per-type skill trees + cooldowns unauthored** (custom content
  gap, `docs/RESEARCH_DATA.md`). Medium for the Research end-game.
- **Mystery Pebble has no obtain source**, so the Mystery Sack recipe (needs 3)
  is uncraftable though `craftItem` resolves it. Owner assigns a price/drop.
- **Nature Tours (K&L) loot tables are a ~5-row subset** of the full ~30-row
  biome tables (blocked on owner pasting the Gaia tables). Medium shop-balance.
- **Challenges content is thin** (gym rosters names-only, no Elite Four/Champion,
  Kanto/Johto/Hoenn only, island trials partial). Content gap.
- **`submitMission` Cloud Function REMOVED (2026-07-23).** It was orphaned
  (zero client refs; onThreadClosed auto-files instead). Deleted from
  `functions/src/index.ts` and from the live project
  (`firebase functions:delete submitMission --region us-central1`).
- Cosmetic: custom item sprites missing (Scents/Mega Stones/Z-Crystals/Emblems/
  fossils/apricorns/evo items show blank), gen-9 shiny sprites fall back to
  regular, gym badges use letter chips not art. All low.

## Audits (2026-07, owner-requested)

- **Dependabot vulnerabilities on the repo (2026-07).** GitHub reports 32
  open vulnerabilities on `Isabelnava100/SnagemV3`'s default branch: 2
  critical, 10 high, 16 moderate, 4 low. TRIAGED (2026-07-23): both
  `bun audit` (root) and `npm audit` (functions/) report ZERO
  vulnerabilities, so the GitHub findings are stale or already resolved in
  the lockfiles. Dismiss them on the Dependabot page:
  https://github.com/Isabelnava100/SnagemV3/security/dependabot . Re-audit
  after major dependency bumps.

- **Require email verification before sign-up completes** DONE (2026-07-23).
  Password sign-in is refused when `emailVerified === false`: `handleSignIn`
  signs the user straight back out and Login.tsx swaps to a "verify your
  email" screen with a resend button (60s cooldown, `sendEmailVerification`,
  live-region confirmations) and a wrong-email path. Google sign-in is
  unaffected (always verified). `approveNewUser` also throws
  failed-precondition for unverified applicants (admin UI surfaces the
  message via `callableMessage`). Known limit: a session persisted before
  this change is not force-revoked on reload; the gate lives in the login
  flow.

- **Annual security header renewal, due 2027-07.** The HSTS policy in
  `netlify.toml` runs on a 1 year max-age (set 2026-07). Any dev work in or
  after July 2027 must renew it: confirm the header is still served, re-test
  at securityheaders.com, and update HSTS/CSP/the rest to current best
  practice. Repeat yearly. Also noted in CLAUDE.md SEO rules so it surfaces
  in every session.

- **Item sprites, remote 404s.** SWEPT (2026-07-20): HEAD-checked all 994
  catalog filenames against the jsDelivr CDN. 25 failed. 16 were a data bug:
  a stray dagger character on the end of the `Filename` (metal-coat,
  kings-rock, and 14 key-items), now stripped in `item.json`, all 16 resolve.
  Elemental Gem was remapped to the real `gem/normal.png` sprite. The 8 real
  gaps left (custom art needed, see Custom item sprites): link-cable,
  metal-alloy, syrupy-apple, unremarkable-teacup, auspicious-armor,
  malicious-armor, shadow-vaccine, mystery-pebble.
- **Buttons without links.** No `to="/"` placeholders remain (the homepage
  "See Anticipated Updates" was the last and now goes to /Announcements).
  The S.N.A.G. suggestion box is the place to catch any stragglers members
  find; nothing else surfaced in a static sweep of Button/Link usage.
- **Visibility concerns for public/regular users:** ALL ADDRESSED (2026-07-23):
  - `users/{uid}` is no longer readable by every member: the rule is now
    owner, admin, or capability holders only (emails + discordUID are
    staff-only). Member-facing reads (members directory, @mention chips,
    public-profile Discord badge) were repointed to the world-readable
    `publicProfiles/{uid}` mirror, which now also mirrors
    discordUID/discordUsername only when the member opted in via
    `discordPublic`. REQUIRES: functions deploy + re-run of
    `node functions/scripts/backfill-public-profiles.mjs` to populate the
    Discord fields, THEN the rules deploy (order matters; the new client
    depends on the mirror).
  - `tickets` no longer accepts arbitrary writes: members get validated
    create-only (actorUid pinned, key allowlist, status pinned to "new"),
    update/delete are admin-only.
  - `admin/{doc}` is admin-only by default; per-doc grants cover
    pokemon_lists (ManageLists), badges (ManageBadges), seo (ManageSEO),
    safari_config (HostEvents/ManageLists). Economy/balance docs
    (battle_config, casino_config, star_overrides, email_templates) are
    admin-only now.
  - Also closed in the same pass: `bag/{doc}` wildcard owner-writes
    (currency/items/owned_pokemons/research/challenges/casino are now
    function/admin-only for real; the July "closed" note below was wrong
    because overlapping rules OR), auditLogs create validation,
    notifications update limited to `read`, importRequests owner updates
    pinned to draft/pending/completed with reviewerNote/history protected,
    SVG uploads excluded in storage.rules, per-uid 2s throttle on the roll
    callables, and opt-in App Check (`VITE_APPCHECK_SITE_KEY`; console
    enforcement is the remaining owner step).

## Assets & sprites

- **New social share (OG) image** DONE (2026-07). Replaced with the branded
  Snagem Guild banner (commit 66571ad).

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
- **Profile emotes** DONE (2026-07-20). Public profiles now resolve owned emotes
  through the emote catalog (`src/data/emote`) and render the Firebase Storage
  image; unknown ids keep the placeholder square.

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
  session, not a file here. REFETCH ATTEMPTED (2026-07): Gaia guild threads return HTTP
  403 to automated fetchers (bot protection), so the tables cannot be pulled from a
  build session even though the threads are public, and no thread URL for the K&L
  Market is recorded in-repo. OWNER ACTION: open the K&L Nature Tours thread in a
  browser and paste (or screenshot) the five biome tables (Cool Canyon, Beautiful
  Meadow, Cute Forest, Clever Swamp, Tough Peak; slots 1-120 each, noting the two
  Clever Swamp transcription gaps at slots 33 and 38). Porting them into
  `functions/scripts/seed.mjs` (`kl` map) is then mechanical.
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
  RESOLVED (2026-07, owner call): rod tiers now shape the odds. Old Rod
  65/30/5 (1/2/3 star), Good Rod 60/30/10, Super Rod 55/30/10 plus a 5%
  4-star bite (`ROD_ODDS` in rollEncounter; rod card copy matches).
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
  (aliases present, descriptions blank on Gaia) were already faithful.
  PUBLISHED (2026-07-20): `seed-lore.mjs` run against `snagemguild`, 14 books +
  118 entries seeded; the recovered sections (Bareeno Village, The Gyaan, new
  Compendium rosters) verified live in `loreEntries`.
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
- **Dedicated mission detail design** DONE (2026-07, owner greenlit building it
  in-house). `/Missions/:id` keeps the striped hero + two-column brief and now
  reads threat at a glance: hero chips for Threat level (toughest star in the
  pool) and Set foes (count + estimated battle posts), and every encounter chip
  shows its star + posts-to-beat. Further art direction welcome any time.
- **Colosseum battle-report entry** DONE (2026-07). Admin > Grading now has a `BattleReportForm`
  (`src/Pages/User/Dashboard/Admin/Grading.tsx`) that itemizes a reported battle (Pokemon
  defeated/survived, win, champion, upset rank gap, tournament win), computes the point total
  from the documented scoring scheme, and awards it through the existing secured
  `awardRankingPoints` callable (no new collection/write path). The plain UID+points form is
  kept above it for manual adjustments. Wins/losses/streak still adjust manually. Visual QA
  pending a logged-in staff pass.

## Performance

- **Firebase compat-to-modular migration: DONE (2026-07).** Init is now the
  modular SDK (firebase chunk 782KB -> 606KB minified, 230KB -> 180KB gzip).
  Nearly all call sites already used the modular API; only init,
  `refFromURL` (Profile avatars), and a dead compat import changed.
  Remaining QA: a logged-in pass over login, Google sign-in, register,
  password reset, logout, and avatar upload/delete on the live site.
- **Font subsetting** (2026-07). Roboto now loads as the Google Fonts
  variable font (2 files, swap). Self-hosting a subset woff2 would shave a
  bit more, at the cost of manual font upkeep.
- **Asset + bundle pass (2026-07-23).** Gen 9 box sprites moved from
  src/assets to `public/images/sprites/gen9/` and load on demand by URL
  (were 240 base64 data URIs inlined into a 254KB shared chunk, ~160KB
  gzip off sprite-bearing pages). sylveon.svg (1.45MB raster-in-SVG)
  replaced by a 45KB webp. Firestore + Storage now load lazily via
  `getDb()`/`getStorage()` in `src/context/firebase.ts` (firebase chunk
  split: app+auth 35KB gzip on the boot path, firestore 135KB gzip on
  first data use). Members directory query staleTime raised to 30min (was
  ~5N+1 reads every 2min). Admin Manage page lazy-loads its 16 tools.
  Follow-ups: Grading.tsx still splits imperfectly (Inbox imports it
  statically); directory counts could be denormalized onto publicProfiles
  (1 read/member) if the directory ever gets hot.

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

- **Item mechanics wave 2** (2026-07). SHIPPED: Z-Moves (per-post activation, crystal never
  consumed, `mech.zBoost`), X items + Dire Hit + type-matched Gems (consumed per post:
  `mech.xAttackBoost` / `direHitCrit` / `xDefenseMult` / `xSpeedFlee` / `gemBoost`), a
  `sellItem` callable for valuables + bottle caps (flat SELL_VALUES table), and
  `useItemOnPokemon` (Exp Candy/Rare Candy grant XP, Vitamins raise friendship, Plates +
  Memories grant a flat XP chunk as a fallback). Composer panels: `ZPanel`, `BattleItemsPanel`.
  Maps mirrored client (`src/lib/battleItems.ts`, `src/lib/itemUses.ts`) and server
  (`functions/src/index.ts`); keep in sync. NEEDS a functions deploy (`firebase deploy --only
  functions`) before the callables + publish handling run live. No rules change (all writes
  are server-side; item ids drive validation, not display names).
  STILL DEFERRED (need whole systems, left as XP/backlog for now):
  - **EVs / vitamins as stat training**: no EV model exists; vitamins currently raise
    friendship. A real EV system (per-stat caps, EV-reducing berries) is a separate build.
  - **TMs / TRs**: need a moveset/move system (the site tracks no moves today). Backlog.
  - **Plates + Memories -> Arceus/Silvally type forms**: needs a type-changing form system
    (held-item-driven species type + sprite swap). Until then they grant flat XP
    (`PLATE_MEMORY_XP`). When built, switch them off the XP fallback.
  - **X Accuracy / Guard Spec**: consumed with no stat effect (no accuracy/stat-drop model).
