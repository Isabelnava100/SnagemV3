# Per-character encounters + battle (feature/per-character-encounters)

Goal: each of a member's characters can hold its own active wild encounter, and
in a single forum post one pokemon from each of those characters' teams attacks
that character's own encounter. Decisions locked with the owner:

- Encounters bind to a character **picked at roll time** (`pending.encounters[characterId]`).
- Each participating character picks its attacking pokemon **explicitly** each post.
- **One** Mega / Z-Move / battle-item activation **per post total** (unchanged).
- Mega + Z-Moves still require a **Master-cleared** character (already shipped).
- Safari Contest turns are **also** per-character.

## Data model

### pending doc (`forum/{forum}/threads/{threadId}/pending/{uid}`)
- NEW: `encounters: { [characterId]: EncounterBlock }` — one active encounter per character.
- LEGACY: `encounter: EncounterBlock` — still read for in-flight threads; treated as
  belonging to `encounter.characterId ?? forCharacterIds[0] ?? ""`.
- `dice`, `random` unchanged (siblings).
- Each stored encounter gains `characterId` and `forCharacterIds = [characterId]`.

### EncounterBlock (src/Pages/forum/types.ts)
Add `characterId?: string`. Existing fields unchanged.

### publishForumPost payload (functionsClient / mutations PublishPostInput)
Replace the single `fighterId` / `fleeAttempt` / `safariAction` scoping with:
```
battleActions?: Array<{
  characterId: string;
  fighterId: string;                 // must be on that character's team
  action: "fight" | "flee" | "ball" | "feed";
  ballItemId?: string;               // bag item id of the ball thrown at this encounter
  foodItemIds?: string[];            // berries/food fed to this encounter
}>
```
Kept for compat + boss: `fighterId` (boss fighter), `attackBoss`, `centerVisit`,
`mega`, `zmove`, `battleItems`, `evolve`, `items` (non-battle item use). Legacy
single-encounter posts (no `battleActions`) fall back to a one-element action
built from `fighterId` + `fleeAttempt` + `safariAction` + the ball/food in `items`.

### post blocks
- `blocks.encounters: EncounterBlock[]` — already an array; now holds every
  resolved encounter this post (one per acting character).
- `blocks.battles: BattleBlock[]` — NEW array (one per fighter that took a hit /
  healed). `blocks.battle` kept = `battles[0]` for older readers until PostCard
  is updated to iterate `battles`.

## Server loop (publishForumPost)

1. Read pending; build `activeEncounters: { charId, encounter }[]` from
   `pending.encounters` entries whose `charId` is among the post's `characters`,
   plus the legacy `pending.encounter` if present (charId from it). Encounters for
   characters NOT on this post stay untouched in pending.
2. Parse `battleActions`; for each active encounter resolve its action (default
   `fight`, fighter = first non-fainted on that character's team). Validate the
   fighter is on `teamsData[character.teamId].pokemon_ids`.
3. `boostFighterId = zInfo?.pokemonId ?? megaInfo?.pokemonId ?? (battleFx active ? firstActionFighterId : "")`.
   The per-post attack multiplier + Dire Hit + X Defense apply only to the
   encounter whose fighter === boostFighterId.
4. For each active encounter run the existing resolution (safari branch OR normal
   branch) against ITS fighter, producing a mutated encounter + `enemyHit` +
   caught/fled/cleared + beatenSlug + notes, then apply `enemyHit` to that
   fighter's HP (per-fighter damage/faint/Focus-Sash, writing `damageNow[fighterId]`
   which is already a per-pokemon map so fighters coexist). Push a BattleBlock.
5. Aggregate: `resolvedEncounters`, `battleBlocks`, `caughtWrites` (each with its
   `characterId`), `beatenSlugs` (arrayUnion all), safari catches (per caught).
6. Write-back per character: surviving catchable/trainer encounter →
   `pending.encounters.${charId} = enc`; resolved (caught/fled/cleared) →
   `pending.encounters.${charId} = FieldValue.delete()`. Legacy single encounter →
   old `encounter` field path.
7. Team wipe / pause: unchanged union-team check (damageNow covers all fighters).
8. Boss stays single-fighter (uses `fighterId` / first action fighter). XP loop,
   heals for non-encounter medicine, itemsUsed decrement, evolve, shadow: unchanged
   (they already operate on the union team / whole post).

## Client (Phase 3)

- `EncounterPanels` roll UI: replace the "Catch it for (optional)" MultiSelect with
  a required single "Which character is this encounter for?" Select; pass
  `characterId` to `callRollEncounter`.
- Composer: for each character on the post that has a pending encounter, render a
  battle-action row (fighter Select + Fight/Flee/Ball/Feed + ball/berry pick).
  Build the `battleActions` array for the publish payload.
- Pending query (`getPendingActions`): return `encounters` map (+ legacy `encounter`).
- `ThreadView` EncounterBanner: render every entry in `pending.encounters`.
- `PostCard`: iterate `blocks.battles` (fall back to `blocks.battle`).

## Deploy
Needs `firebase deploy --only functions` (no rules change: pending + thread
encounter fields are all server-written; the per-character map lives inside the
existing per-uid pending doc). Update docs/FORUM.md after it lands.

## Status (shipped milestone)

SHIPPED and safe to deploy: encounters bind per-character, each character holds
its own active encounter, all display, and a post resolves the posting
character's encounter with correct per-key write-back (other characters' pending
encounters preserved). Backward-compatible with legacy single-encounter threads.

REMAINING (tracked, do as a tested pass before prod): resolve EVERY posting
character's encounter in the SAME post (the multi-fighter loop + per-character
battle-action rows in the composer). Today a multi-character post resolves the
first posting character's encounter; the others resolve on that character's next
post. This is an enhancement, not a broken state. Payload/types (battleActions)
are already in place for it.
