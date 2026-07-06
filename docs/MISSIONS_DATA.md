# Snagem: Missions Data Reference (for AI prompting)

Machine-readable inventory for the **Missions** page (`/Missions`, currently a
`ComingSoon` stub). Paste any section into another AI tool as context.

Legend. `visibility`: public = safe to show anyone · admin = author/editor only.
`effort`: stored = read directly · computed = needs a query · new = field/collection
must be created.

## What a mission is

An admin or director authors a mission (title, story, objective, rewards). Any
member can pick one up, which opens a roleplay thread in the **Quests** forum
(`forum/Quests/threads`, already built). When the host closes the thread, rewards
pay out through the existing reward-session flow (`rewardSessions/{forum}_{threadId}`,
finalized by the `finalizeThreadRewards` callable). Missions themselves are just the
authored briefs; the play and payout reuse forum + reward machinery that already exists.

## Reuses (existing data, no new work)

```yaml
reuses:
  quest_threads:   forum/Quests/threads          # pickup + play, already built
  reward_payout:   rewardSessions/{forum}_{threadId} + finalizeThreadRewards()
  currency:        users/{uid}/bag/currency.pokecoin   # "Snag Coins" reward
  item_catalog:    src/data/item/item.json        # id,name,category,filePath
  egg/pokemon:     grantPokemon() callable         # for "you may receive an egg"
```

## New collection to create

```yaml
missions_schema:
  path: missions/{missionId}          # effort: new (top-level collection)
  fields:
    - key: title
      type: string
      example: "You Better Work"
      visibility: public
    - key: story
      type: html
      note: flavor text; sanitize before render (DOMPurify)
      visibility: public
    - key: objective
      type: string | string[]         # bullet lines
      visibility: public
    - key: opposition
      type: string | string[]
      note: what the player may fight; can be empty
      visibility: public
    - key: pokemon_note
      type: string
      note: pokemon rules / egg-reward hint, free text
      visibility: public
    - key: rewards
      type: object
      shape: { pokecoin?: number, snagemblem?: number, items?: {itemId,qty}[], note?: string }
      note: base payout; "note" holds bonus-for-good-writing style copy
      visibility: public
    - key: difficulty
      type: enum(Easy|Medium|Hard|Story)   # optional tag for filtering
      visibility: public
    - key: image
      type: image_url                  # optional banner
      visibility: public
    - key: active
      type: boolean
      note: hide retired missions without deleting
      visibility: public
    - key: createdBy
      path: .createdBy                 # uid
      visibility: admin
    - key: createdAt
      type: timestamp
      visibility: public

  computed:
    - key: times_taken
      source: count threads in forum/Quests linked to this missionId
      effort: computed
      visibility: public
```

## Page display (what to show)

- Grid/list of active missions: `title`, `image`, `difficulty` chip, short reward summary.
- Detail view: `story` (sanitized html), `objective`, `opposition`, `pokemon_note`,
  full `rewards`, and a "Pick up mission" button that starts a `forum/Quests` thread
  pre-linked to `missionId`.

## Seed content (first mission)

```yaml
- title: "You Better Work"
  difficulty: Story
  story: >
    Team Snagem like any other organization needs money to run, and you the members
    are how we stay running. Lumiose City provides many opportunities to earn an honest
    living, but that's not always the way of doing things, is it? Find some part-time
    work in Lumiose City: work at a hotel or cafe, drive a taxi, even groom some Pokemon.
    Just find a job and earn some cash. Though it would be even better if you gave
    yourself a "bonus", if you catch my drift. Consider it "snagging", we are Snagems
    after all.
  objective:
    - "Get a job and make some money, and take some too if you are feeling brave."
  opposition:
    - "If you get caught stealing you may be attacked. Otherwise you may have to use your Pokemon in your job."
  pokemon_note: "None. You may receive an egg for a good job."
  rewards:
    pokecoin: 3
    note: "Heavy on story. Make it funny and enjoyable to read and you will be rewarded extra."
```

---

# Mission system extensions (from the Mission Locker subforum)

The single "You Better Work" mission above is one row of a larger catalog plus a
grading workflow and a bonus currency. Full mechanics below.

## Mission catalog (Mission Vault)  (CONTENT + FUNCTIONALITY)

Always-available standard missions. Base reward **2-4 Snag Coins**; manual bonus for
humor/quality writing. Rewards a Pokemon by snag / catch / recruit / egg (0-1).

```yaml
mission_extra_fields:                    # add to missions_schema above
  - key: location
    type: string                         # "Lumiose City, Kalos"
  - key: pokemon_reward
    type: object
    shape: { kind: enum(snag|catch|recruit|egg|none), count: 0|1, note?: string }
  - key: coins
    type: number                         # 2..4 base
  - key: special_item
    type: string?                        # e.g. "Old Rod (handmade)"
  - key: tier
    type: enum(Standard|Master|Exceptional)   # gates emblem-piece bonus (below)
  - key: emblem_eligible
    type: boolean                        # false for Master Missions, Badge Runs, Island Trials

catalog_seed:                            # partial; re-scrape logged in for full set
  - { name: "Special Delivery",   location: "Lumiose City, Kalos", opposition: "Lumiose Gang (Dark)", pokemon_reward: {kind: snag, count: 1}, coins: 3 }
  - { name: "Harassment",         location: "Lumiose City",        opposition: "Team Flare Grunt",     pokemon_reward: {kind: snag, count: 1}, coins: 3 }
  - { name: "Sparring Partner",   location: "Saffron City",        opposition: "Wild Tyrogue",         pokemon_reward: {kind: recruit, count: 1}, coins: 2 }
  - { name: "Energy War",         location: "Virbank Complex, Unova", opposition: "Wild Elekid/Magby",  pokemon_reward: {kind: catch, count: 1}, coins: 3 }
  - { name: "An Ashy Situation",  location: "Route 113, Hoenn",     opposition: "Team Magma Grunt",     pokemon_reward: {kind: snag, count: 1}, coins: 4 }
  - { name: "Rod Thief",          location: "Dewford Town",         opposition: "Team Aqua Grunt",      pokemon_reward: {kind: snag, count: 1}, coins: 3, special_item: "Old Rod" }
  - { name: "Schoolyard Brawl",   location: "Jubilife City, Sinnoh", opposition: "2 Team Galactic Grunts", pokemon_reward: {kind: snag, count: 1}, coins: 4 }
  - { name: "Krane's Lab",        location: "Orre",                 opposition: "Cipher Peon",          pokemon_reward: {kind: snag, count: 1}, coins: 3 }
  # ...more rows exist in the Vault; scrape the full thread while logged in
```

## Grading workflow (Front Desk)  (FUNCTIONALITY)

Every mission/challenge/trial completion funnels through one admin-run grading queue.
This replaces Gaia's "PM an admin, post a nudge after 24h" flow with a real queue.

```yaml
submission_schema:
  path: missionSubmissions/{id}          # effort: new
  fields:
    - missionRef: string                 # missionId (or challenge/trial ref)
    - submitterUid: string
    - threadLink: string                 # the RP thread where it was played
    - submittedAt: timestamp
    - status: enum(pending|graded|rejected)
    - assignedGraderUid: string?
    - gradedAt: timestamp?
    - awarded: object?                    # coins/items/pokemon/emblem actually granted
  on_grade: applies rewards via grantCurrency / grantPokemon / item write; log via auditLog
  gate: only a grader capability may move status -> graded and grant rewards
```

## Snag Emblem Pieces (Mission Bonus)  (FUNCTIONALITY — currency)

Bonus premium currency dropped for well-done Vault missions. **3 pieces = 1 Snag Emblem.**

```yaml
emblem_pieces:
  drop: high chance of 1 piece per qualifying mission
  once_only: max 1 piece per mission per user, ever (no re-farming)
  excluded_sources: [Master Missions, Badge Runs, Island Trials]
  exceptional_tier: awards a FULL Snag Emblem PLUS a piece
  conversion: 3 pieces -> 1 snagemblem
  storage:
    - users/{uid}/bag/currency.snagEmblemPieces   # new field (number)
    - users/{uid}/bag/currency.snagemblem          # existing field
    - per-user per-mission pieceAwarded flag        # enforce once-only
  note: pieces/emblems spend in Ambrosial Alchemy, E.V.O., and Mega/Z systems
```

See `CHALLENGES_DATA.md` for Gym Leader Challenges + Island Trials (sibling systems,
both excluded from emblem-piece drops), and `RESEARCH_DATA.md` for Master Missions
(the Hybrid/Channeler progression missions requested via the Master Mission Board).
