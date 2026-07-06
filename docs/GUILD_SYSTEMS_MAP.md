# Snagem: Guild Systems Map (rebuild scope index)

Master index of every Team Snagem guild system reverse-engineered from the Gaia
subforums, what's already in the app, and what still needs building. Each system has
its own data-reference doc (linked). Read this first, then the per-system doc.

## Shared primitives (already in the app — everything reuses these)

| Primitive | Path / source | Notes |
|---|---|---|
| Currency | `users/{uid}/bag/currency` | `pokecoin`=Snag Coins, `gengarcoin`=Gengar Tokens (casino), `snagemblem`=Snag Emblems. Stored as **strings** (need number migration for math). Add `snagEmblemPieces` (3 = 1 emblem). |
| Item catalog | `src/data/item/item.json` + `index.ts` | ~985 items → `{id,name,category,filePath}`. Add flags: `recyclable`, `consumable`, `nuggetValue`, `medicine`, loot-table membership. |
| User inventory | `users/{uid}/bag/items` | `Record<itemId,{...,quantity}>`. |
| Owned Pokemon | `users/{uid}/bag/owned_pokemons` | `experience/friendship/purification/shadow` = the "Evo Points" every training/mission system feeds. |
| Characters | `users/{uid}/bag/characters` | has `type: enum(None|Hybrid|Channeler)` — the Research Facility is the system behind this enum. |
| Reward payout | `rewardSessions/*` + `finalizeThreadRewards()` | thread-close reward flow, already built. |
| Callables | `functions/src/index.ts` | `grantCurrency`, `grantPokemon`, `openMysteryBox`, `finalizeThreadRewards`. All new economy writes follow this callable + `auditLog` pattern. |

**Golden rule:** never trust client-submitted balances or RNG. Gaia used self-reported
ledgers ("post coins before/after"); the rebuild replaces every one with a server-side
wallet + transaction log in a Cloud Function.

## System catalog

| System | Doc | Status in app | Type | Build weight |
|---|---|---|---|---|
| Public Profile | `PROFILE_DATA.md` | wired, visuals pending | — | done-ish |
| Library (Pokedex/Items/Moves/Lists/FAQ) | built `src/Pages/Library` | LIVE | reference | polish only |
| **Lore Library** (Books, Compendium, history) | `LORE_DATA.md` | none | CONTENT | S — new tab/page + migrate text |
| **Missions** (Vault + grading + emblem pieces) | `MISSIONS_DATA.md` | `/Missions` stub | both | M |
| **Challenges** (Gym Runs, Island Trials) | `CHALLENGES_DATA.md` | none | both | M |
| **Research Facility** (Hybrid/Channeler/Fossil/Mega/Z/Legend) | `RESEARCH_DATA.md` | `type` enum only | FUNCTIONALITY | L — biggest |
| **Snag Mall** (Golden Sarcophagus, Trash Shack, K&L, E.V.O.) | `SHOP_DATA.md` | `/Shop` stub | both | M |
| **Crafting** (Ambrosial Alchemy) | `CRAFTING_DATA.md` | none | FUNCTIONALITY | M |
| **Trading** (Poke Swap) | `TRADING_DATA.md` | none | FUNCTIONALITY | M |
| **Casino** (Darts' Gambling) | `CASINO_DATA.md` | none | FUNCTIONALITY | M — deferred |
| **Colosseum** (Training/Rankings/Hall of Fame/Tournaments) | `COLOSSEUM_DATA.md` | none | both | M |

## How the systems interconnect

- **Evo Points economy:** Super Training Room (`COLOSSEUM`), Missions, Challenges all
  write `experience/friendship/purification` onto owned Pokemon. Trash Shack spends Evo
  Points for Scents. One shared XP model.
- **Snag Emblem chain:** Missions drop **Emblem Pieces** (3 → 1 Emblem) → Emblems spend
  in **Alchemy** (craft), **E.V.O.** (hybrid/channeler moves), tournament prizes.
- **Progression → unlock chain:** Master Missions (requested via the Master Mission
  Board, `RESEARCH`) drive Hybrid/Channeler ability learning → Grand Master Mission →
  **Mega/Z unlocks**. Z-Crystals also come from **Island Trials** (`CHALLENGES`). Mega
  Stones are **crafted** (`CRAFTING`).
- **Grading queue:** Missions, Gym Runs, Island Trials, Master Missions all funnel
  through one `missionSubmissions` queue (`MISSIONS_DATA.md`).
- **Currency map is exact:** the 3 existing currency fields already match the Gaia
  economy (Snag Coins / Gengar Tokens / Snag Emblems). No new currency type needed
  except the Emblem-Pieces counter.

## Suggested build order

1. **Lore Library** — pure content, no backend risk, immediate visible win. Add a Lore
   tab to the existing Library page.
2. **Snag Mall + Crafting** — the economy core; introduces the wallet/transaction
   callable pattern everything else reuses (`buyShopItem`, `craftItem`, `recycleItems`).
3. **Missions + grading queue + Emblem Pieces** — the reward loop that feeds the wallet.
4. **Challenges** (Gym Runs, Island Trials) — reuses grading queue + rewards.
5. **Colosseum** — training (reuses XP), rankings, Hall of Fame, tournaments.
6. **Research Facility** — largest; depends on missions (Master Missions) + crafting
   (stones) + trials (Z-Crystals) being in place.
7. **Trading**, **Casino** — self-contained; do when ready. Casino is user-deferred.

## Open decisions (need your call)

1. **Currency display name:** lore says "Snag Coins", dashboard shows "Poke Coin" for
   the same `pokecoin` field. Pick one.
2. **Trading currency:** your brief wants currency in trades; `docs/FORUM.md` + Policies
   say Poke Swap is Pokemon-for-Pokemon only. Reconcile (see `TRADING_DATA.md`).
3. **Missions place:** run missions as forum threads in the existing `Quests` forum, or
   as a standalone `/Missions` feature with its own submissions? (affects grading queue).
4. **Currency migration:** move `bag/currency` from strings to numbers before building
   spend math, or parseInt everywhere.

## Data still gated on Gaia (pull while logged in)

- Full Mission Vault catalog (only ~14 of N rows captured).
- Full gym rosters/fields per region; full Elite Four/Champion rosters.
- Lore: index pages 2-3 (missing ~9 type books: Fire, Grass, Electric, Ground, Rock,
  Flying, Fighting, Ice, Steel).
- Channeler per-type skill trees + cooldowns; Mega Stone↔species and Z-Crystal↔type
  tables; full fossil↔Pokemon map (these also derive from Pokemon canon).
- K&L: the five 120-slot loot tables are captured but verify against the live thread.
