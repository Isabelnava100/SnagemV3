# Snagem: Crafting Data Reference (for AI prompting)

Machine-readable inventory for the **Crafting** page (Ambrosial Alchemy). No route
exists yet; add one alongside `/Shop`. Paste any section into another AI tool as context.

Legend. `visibility`: public · admin. `effort`: stored · computed · new.

## What crafting is

A vendor (Ambrosia) crafts items from player-supplied ingredients plus a currency
cost. Recipes have a success rate; below 100% the craft can fail. Failure yields a
**Mystery Pebble**; 3 pebbles exchange for a **Mystery Sack** (random contents).
Successful or failed, all ingredients and currency are consumed. Currency is Snag
Coins, with pricier items also needing Snag Emblems (e.g. Master Ball = 25 Snag
Coins + 5 Snag Emblems). Players can batch up to 20 identical items, each rolled
individually.

## Reuses (existing data)

```yaml
reuses:
  item_catalog:  src/data/item/item.json      # ingredients + outputs are catalog items
  user_bag:      users/{uid}/bag/items         # consumed ingredients + granted outputs
  currency:      users/{uid}/bag/currency      # pokecoin="Snag Coins", snagemblem="Snag Emblems"
  mystery_sack:  admin/mystery_boxes + openMysteryBox()   # REUSE for the failure sack
  pebble/sack:   items in item.json            # Mystery Pebble + Mystery Sack are catalog items
```

The failure economy is already solved: model the **Mystery Sack** as an existing
`admin/mystery_boxes` config and open it with the existing `openMysteryBox` callable.

## New collection to create

```yaml
recipes_schema:
  path: recipes/{recipeId}              # effort: new
  fields:
    - key: output_item_id
      type: string                       # key into item catalog
      visibility: public
    - key: output_qty
      type: number                       # per successful craft (usually 1)
      visibility: public
    - key: max_batch
      type: number                       # cap on simultaneous crafts, e.g. 20
      visibility: public
    - key: ingredients
      type: object[]
      shape: { itemId: string, qty: number }
      visibility: public
    - key: cost
      type: object
      shape: { pokecoin?: number, snagemblem?: number }
      example: { pokecoin: 25, snagemblem: 5 }   # Master Ball
      visibility: public
    - key: success_rate
      type: number                       # 0-100; below 100 can fail to a pebble
      visibility: public
    - key: category
      type: string                       # "Pokeballs", "Held Items", "Pokeblocks", "Mega Stones", "Z-Crystals"...
      visibility: public
    - key: active
      type: boolean
      visibility: public
```

## Craft flow (new callable needed)

Add `craftItem({ recipeId, batch })` Cloud Function. Server-side it must:
1. Verify the user holds every `ingredient` in the required `qty * batch` and enough
   `cost` currency.
2. Consume ingredients + currency up front (consumed on failure too).
3. Roll `success_rate` per unit (server RNG, never client). Grant `output_item_id`
   for successes; grant a **Mystery Pebble** item for failures.
4. Log via `auditLog`. Same callable pattern as `functions/src/index.ts`.

A separate `exchangePebbles()` (or a `recipe` whose ingredient is 3 pebbles and whose
output opens a Mystery Sack via `openMysteryBox`) handles the 3-pebble -> sack step.

## Page display (what to show)

- Recipe list grouped by `category`: output icon/name, `ingredients` (icons + qty),
  `cost` (Snag Coins / Snag Emblems), `success_rate` badge.
- Craft panel: batch selector (1..`max_batch`), shows total cost + total ingredients,
  disabled unless the user's bag/currency can cover it.
- Result: per-unit success/failure summary, pebbles granted on failure.

## Seed content (examples)

```yaml
- output_item_id: "poke-ball"
  output_qty: 1
  max_batch: 20
  ingredients: []            # fill with Ambrosia's real components
  cost: { pokecoin: 2 }
  success_rate: 100
  category: "Pokeballs"
- output_item_id: "master-ball"
  output_qty: 1
  max_batch: 1
  ingredients: []
  cost: { pokecoin: 25, snagemblem: 5 }
  success_rate: 60
  category: "Pokeballs"
```
