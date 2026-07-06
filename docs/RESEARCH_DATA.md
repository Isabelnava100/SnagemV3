# Snagem: Research Facility Data Reference (for AI prompting)

Machine-readable inventory for the **Snagem Research Facility** (Hybrid/Channeler
progression, Fossil revival, Mega/Z unlocks, Legendary capture). No route exists yet.
This is a NEW functional area. Paste any section into another AI tool as context.

Legend. `visibility`: public · admin. `effort`: stored · computed · new.

## Ties into existing app data

The app already has:
- Character `type: enum(None|Hybrid|Channeler)` (`src/components/types/typesUsed.ts`,
  documented in `PROFILE_DATA.md`). This whole facility is the system BEHIND that enum.
- OwnedPokemon with `experience/friendship/purification/shadow` and item catalog for
  stones/crystals/fossils.

## Shared progression engine (Hybrid + Channeler are the same shape)

Both special types progress identically. Build ONE reusable model.

```yaml
master_mission_progress:
  path: users/{uid}/bag/characters[charId].progress   # or a subcollection; effort: new
  per_type:                             # dual-type hybrids track each type
    - type: string                      # "Ghost", "Water", ...
      missions_completed: number        # 0..10
      abilities_learned: string[]       # <= 10 moves (hybrid) or skills (channeler)
  grand_master_complete: boolean        # unlocked after all 10
  mega_unlocked: boolean                # hybrid only, post-grand-master
  zmove_unlocked: boolean               # hybrid only, post-grand-master
rule: 10 Master Missions per type -> 1 ability each -> Grand Master Mission -> Mega/Z access
```

## 1. Hybrid Research Division  (FUNCTIONALITY)

```yaml
hybrid:
  become: born (hybrids beget hybrids) OR accident/unusual phenomenon
  prereq: player must already OWN the species to fuse with
  irreversible: true
  restricted_species:                   # cannot hybridize via normal division
    non_legendary: [Ditto, Smeargle]
    legendary_mythical_ub: [Mewtwo, Mew, Kyogre, Groudon, Dialga, Palkia, Azelf, Uxie,
      Mesprit, Arceus, Reshiram, Zekrom, Tornadus, Thundurus, Landorus, Kyurem, Genesect,
      Xerneas, Yveltal, Zygarde(all forms), Hoopa, "all 4 Tapu", "Type: Null", Silvally,
      "all Ultra Beasts", Zacian, Zamazenta, Eternatus]
    note: legendary hybrids route through the Restricted Library instead
  progression: uses the shared engine above; missions must match the hybrid's type(s)
  capstone: Grand Master Mission -> Mega Evolution and/or Z-Move access (if species supports)
  data:
    - character.species, character.hybridType(s)
    - restricted-species list (constant)
    - shared master_mission_progress
```

## 2. Channeler Research Division  (FUNCTIONALITY)

```yaml
channeler:
  become: concept discussion with admin; document abilities in profile
  requires:
    artifact: string                    # focal-point item, required
    primary_pokemon_id: string          # strongest bond
    secondary_pokemon_ids: string[]     # same type only
  rule: all bonded Pokemon share ONE type
  progression: shared engine; 10 Master Missions = 10 skill tiers -> Grand Master
  ability_gating:
    primary_required_for: [tier 1, tier 5, tier 10, ultimate]
    secondary_cap: 2 abilities max
  per_type_content:                     # CONTENT tables to capture per type
    innate_ability: { name, description }    # passive, e.g. Fairy "Moon's Blessing"
    skills:                             # ordered 1..10
      - { stage: number, name, description, cooldown }
    types_seen: [Fairy, Ghost, Psychic, Water, Ground, Flying, Poison, ...]
    note: full skill trees + cooldowns only partially in-thread; scrape per type or author fresh
```

## 3. Fossil Revitalization Chamber  (FUNCTIONALITY — small transaction)

```yaml
fossil_revival:
  cost: pokecoin (5-10; inconsistent in source, make configurable)  # admin/config
  requires: an empty Poke Ball in bag
  output: adds the revived Pokemon to the user's owned_pokemons (via grantPokemon-style write)
  mapping:                              # CONTENT table (extend to full canon)
    Old Amber: Aerodactyl
    Helix Fossil: Omanyte
    Sail Fossil: Amaura
    Skull Fossil: Cranidos
    Root Fossil: Lileep
  callable: reviveFossil({ fossilItemId }) — verify ball + coins, debit, grant pokemon, auditLog
  reuses: item catalog (fossils), bag/items, currency, owned_pokemons
```

## 4. Mega Evolution & Z-Move Research  (FUNCTIONALITY — item-gated)

```yaml
mega:
  requires: Key Stone (per character) + species Mega Stone (held on pokemon)
  key_stone_via: "Test of Mastery" at Tower of Mastery (Shalour), or Mega Diploma from Golden Sarcophagus
  mega_stones_via: crafted at Ambrosial Alchemy (see CRAFTING_DATA.md) or events
zmove:
  requires: Sparkling Stone (per character) + type Z-Crystal (some species-locked)
  sparkling_stone_via: one of 4 Tapu trials
usage_rule: Mega OR Z-Move once per mission, never both same mission (mutually exclusive)
hybrid_gate: hybrids must finish Grand Master Mission first
data:
  - character flags: hasKeyStone, hasSparklingStone
  - pokemon held item: megaStoneId? / zCrystalId?  (item ids)
  - per-mission usage lock: megaUsedThisMission / zUsedThisMission (mutually exclusive)
  - CONTENT tables (from canon, not in-thread): MegaStone<->species, ZCrystal<->type/species
unlock_missions:
  tower_of_mastery: beat 5 stat-master trainers + Korrina, no healing; reward 10 pokecoin + Key Stone; repeatable per character
    trainers: [HP Kimberly/Audino, Atk Jason/Scizor, Def Billy/Slowbro, SpA Trini/Manectric, Spe Zack/Aerodactyl]
  tapu_trials: 4 trials (Koko/Melemele, Lele/Ruins of Life, Bulu/Ula'ula, Fini/Poni); each reward 10 pokecoin + Sparkling Stone
```

## 5. Restricted Library — Legend Capture / Legendary Hybrid  (mostly CONTENT / thin queue)

```yaml
legend_request:
  flow: character RPs entering, names target legendary -> admin writes a bespoke mission
  bespoke: no point costs/tiers/success %; story-driven, admin-adjudicated
  if_built: request record { characterId, targetLegendary, assignedMissionRef, status }
  note: this is the ONLY path for legendary hybrids (excluded from normal Hybrid Division)
```

## 6. Master Mission Request Board  (FUNCTIONALITY — request queue)

The connective tissue between progression counters and actual play. Replaces Gaia's
"quote an admin" with a structured form.

```yaml
master_mission_request:
  path: masterMissionRequests/{id}       # effort: new
  fields:
    - characterId: string
    - species: string
    - requestedType: string              # e.g. "Ghost", "Ice"
    - requestedMissionNumber: number     # 1..10
    - assignedAdmin: string?
    - status: enum(requested|in_progress|complete)
    - resultThreadLink: string?          # the RP where it plays out
    - unlockedAbility: string?           # move/skill granted on completion
  on_complete: increment character's master_mission_progress for that type, grant the ability
  gate: completion + ability grant behind an admin capability + auditLog
```

## Data gaps to source separately (confirmed shape, partial rows)

- Full Channeler per-type skill trees + cooldowns.
- Full Mega Stone <-> species table; full Z-Crystal <-> type/species table.
- Complete fossil <-> Pokemon map.
These come from Pokemon canon or gated Gaia sub-posts; the threads confirm the schema.
