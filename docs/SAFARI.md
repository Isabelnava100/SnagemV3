# Safari Contest

A forum Event where players hunt star-tiered wild Pokemon: roll an encounter,
then each post choose to fight it, feed it a berry, or throw a ball. It
consolidates the pieces that already existed separately (boss-battle health,
encounter capture, the admin encounter lists) into one launch-and-play flow,
modeled on the classic GaiaOnline Safari Zone capture contest.

Live requirement: like the rest of the forum game layer, the callables and
rules must be deployed together (Blaze plan) before this works in production.

## How it plays

1. **Launch (admin/director).** Admin -> Manage -> **Safari Contest** sets the
   five star pools, their encounter rates, posts-to-defeat, run-away chance,
   berry bonus and prizes, then **Save & Launch**. Launch opens the normal new
   thread composer in ?safari=1 mode: the host picks their character + team and
   writes the opening post, exactly like any other thread. The thread is created
   through the `startSafariContest` callable in the **Events** forum with the
   config baked onto it.
2. **Roll (players).** In the thread the player rolls an encounter. A **star
   tier** is drawn by weighted rate (default 40/25/20/10/5 for 1..5 star), then a
   Pokemon is drawn uniformly from that star's pool.
3. **Each turn (one action per post):**
   - **Fight** wears the wild Pokemon's health down. It takes an odd number of
     posts to knock out, floored at 3 (1★ 3, 2★ 5, 3★ 7, 4★ 9, 5★ 11), so there
     is always a window to catch before it faints. Knock it out and it is gone.
     Being weakened raises the catch chance (up to +40% at near-KO).
   - **Feed a berry / food** (a `berry` or `curry-ingredient` item, consumed):
     +5% catch rate each, capped at +25%.
   - **Throw a ball** (a `ball` item, consumed): a percentage capture roll. Base
     rate is by ball type from the old contest table (Poke/Safari 50, Great 60,
     Ultra 70, Master 100, and a few conditional balls), plus the weakened bonus,
     plus fed-berry bonus, capped at 95% (Master Ball is the only sure thing).
   - Every **fight or feed** turn has a 5% chance the Pokemon runs off (ends that
     encounter; the player can roll another up to their per-contest limit). A
     ball throw always resolves so a thrown ball is never wasted to a bolt.
   A caught Pokemon lands in the player's box (with a shiny roll and Safari
   provenance) and is recorded on the thread for judging.
4. **Judge & award (host, admin final say).** In the Host Menu, **Judge
   Contest** rolls a quality of 1-5 for each player's kept (most recent) catch
   and scores it `star x quality`, ranked. The host/admin edits the Snag Coin
   prizes (defaults: 1st/2nd/3rd from config, consolation to everyone else) and
   **Award Prizes** pays them out once. Kept Pokemon stay in the winners' boxes.

## Data model

- **`admin/safari_config`**: the zone library, a `zones` map of
  `zoneId -> SafariConfig`. Each zone (a named encounter list) mirrors
  `SafariConfig` in `src/lib/safari.ts` (`name`, `blurb`, `tiers[{star, rate,
  postsToDefeat, pokemons[]}]`, `runAwayChance`, `berryBonus`, `berryBonusCap`,
  `encountersPerPlayer`, `prizeCoins[3]`, `consolationCoins`). Writable by
  Admin / HostEvents / ManageLists (see firestore.rules). The admin tab loads a
  zone, edits it, saves it back or as a new named zone, and launches it (the
  chosen zone id rides in the launch URL as `?zone=`). A legacy flat config (no
  `zones` map) still loads as a single zone. The web app and seed script ship
  the Johto Meadow Zone as the default.
- **`forum/Events/threads/{id}.safariContest`**: the config snapshot baked on at
  launch, plus live state: `catches{uid: [{slug,name,star,postId}]}`,
  `results[SafariResult]` (draft judging), `finalized`.
- **Encounter (`pending/{uid}.encounter`)** gains Safari fields: `star`,
  `postsToDefeat`, `fightPosts`, `catchBonus`, `failCount`, `outcome`,
  `catchChance` (see `EncounterBlock` in `src/Pages/forum/types.ts`).
- The thread also carries a normal `encounterConfig` with a `__safari__`
  placeholder list so the roll button appears; the actual pool comes from the
  tiers.

## Server (functions/src/index.ts)

- `rollEncounter`: when the thread has a `safariContest`, does the weighted
  star roll instead of the flat list roll.
- `publishForumPost`: resolves the Safari turn (fight / feed / ball), run-away,
  knockout, percentage capture, catch tracking. Non-Safari encounters are
  unchanged.
- `startSafariContest`, `judgeSafariContest`, `finalizeSafariContest`: launch,
  judge, pay out. The catch math mirrors `src/lib/safari.ts`; keep them in sync.

## Tuning / seeding

- Everything is editable in the admin tab and clamped server-side
  (`sanitizeSafariConfig`).
- `node functions/scripts/seed-safari-contest.mjs --check` validates the pools
  offline; without `--check` (and with ADC) it writes `admin/safari_config`.

## Deferred / follow-ups

- Judging keeps the **most recent** catch per player as the "kept" one (the old
  contest's rule); there is no in-thread "release to keep the new one" flow yet.
- Conditional balls are evaluated where our data reaches: Net (Water/Bug type)
  and Dive (Water type) at 70, Repeat (species already in the thrower's box) at
  70, Dusk (server night, UTC 20:00-06:00) at 70, Nest by star tier (1/2/3 star
  = 80/70/60), Timer (+10 per fight post landed, max 80), on top of Level
  (first-stage 70), Quick (first encounter 80) and Heal (after a miss 80).
  Balls needing data we do not have (speed, weight, gender, fishing) — Fast,
  Heavy, Love, Lure, Moon, Friend, Sport, Park, Dream, Beast — fall back to
  their 50% base.
- Prizes pay `pokecoin` (Snag Coins). Evolutionary-item prize option from the
  old contest is not built.
