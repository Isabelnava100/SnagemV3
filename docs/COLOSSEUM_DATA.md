# Snagem: The Colosseum Data Reference (for AI prompting)

Machine-readable inventory for **The Colosseum** (battles, training, tournaments,
rankings). No route exists yet. This is a NEW functional area not in the earlier
economy scope. Paste any section into another AI tool as context.

Legend. `visibility`: public · admin. `effort`: stored · computed · new.

## What the Colosseum is

The battle/training hub. Four sub-systems, from four Gaia threads:

1. **Super Training Room** — a roleplay-thread grind that earns Evolution Points
   (the app's `experience`/`friendship`/`purification` on OwnedPokemon).
2. **Competitive Battle Rankings** — a points ladder for real WiFi battles.
3. **Hall of Fame** — permanent record of tournament winners + their teams.
4. **Tournaments** (e.g. Paldea Cup) — organized WiFi bracket events with rules,
   sign-ups (friend codes), and prizes.

## 1. Super Training Room  (FUNCTIONALITY — reuses existing XP fields)

A hologram facility; members roleplay training and accrue points per post. This is a
themed variant of the forum XP the app already awards on posts.

```yaml
mechanics:
  usage: once per day, 2-hour limit (4 hours if training in a pair/group)
  evolution_points_solo:
    posts_1_to_5: 1.0 per post
    posts_6_plus: 0.75 per post
    bonus: random extra for high-effort posts
  evolution_points_partner:
    posts_1_to_10: 1.0 per post
  happiness_move_points:            # separate track
    posts_1_to_5: 0.2 per post
    posts_6_plus: 0.1 per post
  shadow_pokemon: earn Purification Points instead of Evolution Points, same rates
  environmental_evolutions: allowed (Alolan/Galarian/Hisuian regional forms)

reuses:
  target_fields: users/{uid}/bag/owned_pokemons.{experience,friendship,purification,shadow}
  xp_config:     admin/xp_defaults   # experiencePerPost etc. already exists
  threads:       runs as forum threads; XP flows through publishForumPost
new:
  - a per-day / per-session usage cap enforcer (once/day, time limit) — NOT in app today
  - a "partner training" mode flag on the session
```

## 2. Competitive Battle Rankings  (FUNCTIONALITY — new)

Points ladder for sanctioned WiFi battles, "for fun and bragging rights."

```yaml
scoring:
  per_battle:
    - defeat_opponent_pokemon: 1 each
    - own_pokemon_surviving_at_end: 1 each
    - win_battle: 3
  tournament:
    - participation: 3
    - third_place: 3
    - second_place: 5
    - victory: 10
  special:
    - defeat_reigning_champion: 5
    - upset_bonus: 0.4 per rank difference (rounded up) when beating a higher-ranked player

rankings_schema:
  path: battle_rankings/{uid}          # effort: new
  fields:
    - uid: string
    - points: number
    - wins / losses: number?
    - updatedAt: timestamp
  display: leaderboard sorted by points desc (username, avatar, points)
  note: point awards are admin-entered (reported battles), so gate writes behind a
        capability + auditLog; do not let players self-award.
```

## 3. Hall of Fame  (CONTENT — record keeping)

Permanent list of tournament champions.

```yaml
hall_of_fame_schema:
  path: hall_of_fame/{entryId}         # effort: new (or a single doc array)
  fields:
    - tournament_name: string          # "Snagem Summer Cup"
    - year: number
    - winner_uid_or_name: string
    - team: string[] | pokemon_slugs   # champion's roster, shown as sprites
  seed:
    - { tournament_name: "Snagem Summer Cup",  year: 2020, winner: "Atlantis_Darts" }
    - { tournament_name: "Snagem Monotype Cup", year: 2020, winner: "Darksol88" }
    - { tournament_name: "Snagem Winter Cup",   year: 2021, winner: "Blizzard120" }
```

## 4. Tournaments  (FUNCTIONALITY — new, optional/heavier)

Organized bracket events. Example: Paldea Cup (Gen 9, double-elimination, singles).

```yaml
tournament_schema:
  path: tournaments/{tournamentId}     # effort: new
  fields:
    - name: string
    - game_generation: string          # "Gen 9 / Paldea"
    - format: string                   # "Double elimination, singles, 6v6"
    - rules: html                      # banned species/moves, Tera allowed, etc.
    - start_date: timestamp
    - status: enum(upcoming|open_signup|running|complete)
    - prizes: object                   # per placement: gift codes, snagemblem, pokemon sets
    - signups: { uid, friendCode, teamId? }[]
    - bracket: object?                 # optional; can start as an external/manual bracket
  reuses:
    prizes_payout: grantCurrency + grantPokemon callables (snagemblem, snag coins, pokemon sets)
  note: friend codes are user-supplied PII-ish; store under the tournament, not public
        profiles. Bracket management can be manual/admin at first.

paldea_cup_seed_rules:                 # example rules block
  - "Paldea Dex only; no legendaries or Paradox pokemon (Charizard, Cinderace excluded)."
  - "No duplicate species."
  - "No hacked/altered pokemon (permanent DQ)."
  - "Auto-loss if you KO your own last pokemon via Self-Destruct/Explosion/Destiny Bond/Perish Song."
  - "Terastallization allowed. Move 'Last Respects' banned."
  - "Register one Battle Team at sign-up; no mid-tournament changes."
  - "Verify teams via shared Team IDs after each battle."
  prizes:
    first:  ["$20 gift code", "2 Snag Emblems", "Discord role", "Paradox pokemon set"]
    second: ["$10 gift code", "2 Snag Emblems", "Shiny starter set"]
    third:  ["2 Snag Emblems", "40 Snag Coins"]
    participation: ["1 Snag Emblem", "raffle entry"]  # min 2 battles
```

## Page display (what to show)

- Colosseum landing: entry cards for Training Room, Rankings ladder, Hall of Fame,
  active/upcoming Tournaments.
- Rankings: leaderboard table. Hall of Fame: champion cards with team sprites.
- Tournament: rules, sign-up (friend code + team), prize table, bracket/standings.
