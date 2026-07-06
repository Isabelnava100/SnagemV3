# Snagem: Challenges Data Reference — Gym Runs & Island Trials (for AI prompting)

Machine-readable inventory for the two progress-tracked challenge systems from the
Mission Locker: **Gym Leader Challenges** and **Island Trials**. No route exists yet.
Paste any section into another AI tool as context.

Legend. `visibility`: public · admin. `effort`: stored · computed · new.
Both systems are **excluded from Snag Emblem Piece drops** (see `MISSIONS_DATA.md`).
Both feed the shared grading queue (`missionSubmissions`, see `MISSIONS_DATA.md`).

## 1. Gym Leader Challenges  (CONTENT rosters + FUNCTIONALITY tracking)

Region-by-region gym gauntlet. Earn 8 badges per region, then Elite Four + Champion.

```yaml
mechanics:
  start: pick a region, admin runs the gym leaders, thread titled "[Region] Badge Run"
  battles: gym leader only (no filler trainers); leaders at full power, no handicap
  format: single battle, EXCEPT Mossdeep = double battle
  pokemon_limit: scales per gym (early ~2 -> finals full 6)
  environment: each gym has a field/terrain variation; journey RP allowed between gyms
  unlock: 8 badges -> Elite Four + Champion; beat Champion -> special prize
  regions: [Kanto, Johto, Hoenn, Sinnoh, Unova (Set 1), Unova (Set 2), Kalos, Galar (Set 1), Galar (Set 2)]

region_schema:
  path: gymRegions/{regionId}            # effort: new, CONTENT
  fields:
    - name: string
    - gyms: object[]
      shape: { order, leaderName, type, pokemonRoster: slug[], fieldDescription, challengerPokemonLimit, battleFormat }
    - eliteFour: { members: {name, roster}[], champion: {name, roster} }
    - championPrize: string
  note: per-gym rosters/fields are CONTENT; re-scrape the thread logged in for full rosters

badge_progress_schema:
  path: users/{uid}/bag/badges  (or characters[charId].badges)   # effort: new, FUNCTIONALITY
  fields:
    - region: string
    - badgesEarned: string[]             # up to 8
    - eliteFourUnlocked: boolean
    - championDefeated: boolean
```

## 2. Island Trials  (CONTENT definitions + FUNCTIONALITY tracking)

Alola-style: 7 trials across 4 islands, then 4 Grand Trials vs Kahunas. Rewards Snag
Coins + type Z-Crystals (which feed the Z-Move system in `RESEARCH_DATA.md`).

```yaml
mechanics:
  per_trial: travel -> objective (battle hidden pokemon / collect / puzzle / photos) -> Totem Pokemon
  sos: wild + Totem can call allies; Totem gets stat boosts + held item + guaranteed backup
  trial_reward: 5-10 Snag Coins + a type-specific Z-Crystal
  reward_by_island: { Melemele: 5, Akala: "5-7", "Ula'ula": "8-9", Poni: 10 }
  grand_trials: admin-run RP battles only, 3-4 pokemon limit, single battle; reward = type Z-Crystal
  play_surface: trials as written missions or Side RP Board; Grand Trials require Side RP Board

trial_schema:
  path: islandTrials/{trialId}           # effort: new, CONTENT
  fields:
    - island: string
    - name: string
    - captain: string
    - type: string
    - totemPokemon: string
    - objective: string
    - snagCoins: number
    - zCrystalReward: string             # item id
    - sosEnabled: boolean
  seed:
    - { island: Melemele, name: "Verdant Cave",        captain: Ilima,     type: Normal,   totem: "Gumshoos/Raticate", coins: 5 }
    - { island: Akala,    name: "Brooklet Hill",       captain: Lana,      type: Water,    totem: "Wishiwashi",        coins: "5-7" }
    - { island: Akala,    name: "Wela Volcano",        captain: Kiawe,     type: Fire,     totem: "Salazzle",          coins: "5-7" }
    - { island: Akala,    name: "Lush Jungle",         captain: Mallow,    type: Grass,    totem: "Lurantis",          coins: "5-7" }
    - { island: "Ula'ula", name: "Hokulani Observatory", captain: Sophocles, type: Electric, totem: "Vikavolt",        coins: "8-9" }
    - { island: "Ula'ula", name: "Abandoned Megamart", captain: Acerola,   type: Ghost,    totem: "Mimikyu",           coins: "8-9" }
    - { island: Poni,     name: "Vast Poni Canyon",    captain: null,      type: Dragon,   totem: "Kommo-o",           coins: 10 }

grand_trial_schema:
  path: islandTrials/grand/{id}          # effort: new, CONTENT
  seed:
    - { island: Melemele, kahuna: Hala,   type: Fighting, zCrystalReward: "Fightinium Z" }
    - { island: Akala,    kahuna: Olivia, type: Rock,     zCrystalReward: "Rockium Z" }
    - { island: "Ula'ula", kahuna: Nanu,  type: Dark,     zCrystalReward: "Darkinium Z" }
    - { island: Poni,     kahuna: Hapu,   type: Ground,   zCrystalReward: "Groundium Z" }

trial_progress_schema:
  path: users/{uid}/bag/trials  (or characters[charId])   # effort: new, FUNCTIONALITY
  fields:
    - trialsCompleted: string[]
    - zCrystalsEarned: string[]          # item ids; also gate Z-Moves in RESEARCH_DATA.md
    - grandTrialsCompleted: string[]
```

## Page display (what to show)

- Challenges landing: region cards (Gym Runs) + island cards (Trials).
- Gym Run: badge tracker (8 slots) per region, Elite Four/Champion locked until 8 badges.
- Trials: per-island trial list, Z-Crystals earned, Grand Trial status.
