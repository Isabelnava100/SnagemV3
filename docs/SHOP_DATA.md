# Snagem: Snag Mall / Shop Data Reference (for AI prompting)

Machine-readable inventory for the **Snag Mall** page (`/Shop`, currently a
`ComingSoon` stub). Paste any section into another AI tool as context.

Legend. `visibility`: public = safe to show anyone · admin = editor only.
`effort`: stored · computed · new.

## What the Snag Mall is

A mall of themed vendor shops. Each shop is one NPC vendor with flavor lore, a
currency it accepts, and a list of items for sale at set prices. Some shops have a
"rare section" that rotates daily. Example shop: **The Golden Sarcophagus**
(General Store), run by Nebu, accepts Snag Coins only.

Buying spends currency and adds the item to the user's bag. The item catalog
(name, icon, category) already exists; the shop only adds a **price** per item.

## Reuses (existing data)

```yaml
reuses:
  item_catalog:  src/data/item/item.json     # id,name,category,filePath (name+icon come from here)
  user_bag:      users/{uid}/bag/items        # Record<itemId,{...,quantity}>; purchase increments
  currency:      users/{uid}/bag/currency     # pokecoin="Snag Coins", gengarcoin, snagemblem
  sprite_helper: getItemImageURL(filePath)
```

## New collection to create

```yaml
shops_schema:
  path: shops/{shopId}                 # effort: new
  fields:
    - key: name
      type: string
      example: "The Golden Sarcophagus"
      visibility: public
    - key: type
      type: string                      # "General Store", "Rare Wares", etc.
      visibility: public
    - key: flavor_intro
      type: html
      note: the vendor's lore/greeting; sanitize before render
      visibility: public
    - key: npc_name
      type: string
      example: "Nebu"
      visibility: public
    - key: npc_image
      type: image_url
      visibility: public
    - key: currency
      type: enum(pokecoin|gengarcoin|snagemblem)
      note: which currency this shop accepts; Golden Sarcophagus = pokecoin (Snag Coins)
      visibility: public
    - key: sections
      type: object[]
      shape:
        - title: string                 # e.g. "Pokeballs", "Held Items"
          items:
            - itemId: string            # key into item catalog for name/icon/category
              price: number
              description: string        # shop-specific blurb, optional
              stock: number?             # optional cap; omit for unlimited
      visibility: public
    - key: rare_section
      type: object?
      shape: { rotates_daily: boolean, pool: {itemId, price, description?, weight?}[] }
      note: today's rare offer picked from pool; changes daily
      visibility: public
    - key: active
      type: boolean
      visibility: public
    - key: order
      type: number                       # display sort within the mall
      visibility: public
```

## Purchase flow (new callable needed)

Client purchase writes must NOT be trusted (currency + inventory). Add a
`buyShopItem({ shopId, itemId, qty })` Cloud Function that: validates the price and
stock server-side, checks the user's currency, decrements currency, increments
`bag/items`. Mirror the existing callable pattern in `functions/src/index.ts`
(`grantCurrency`, `openMysteryBox`). Log via `auditLog`.

## Page display (what to show)

- Mall index: card per shop (`npc_image`, `name`, `type`, accepted-currency chip).
- Shop view: `flavor_intro` (sanitized), then each `section` as a grid of item cards
  (icon from catalog, name, `price` + currency), plus the rotating `rare_section`.
- Show the user's balance of the shop's accepted currency and disable "Buy" when short.

## Seed content (first shop)

```yaml
- name: "The Golden Sarcophagus"
  type: "General Store"
  npc_name: "Nebu"
  currency: pokecoin        # Snag Coins
  flavor_intro: >
    There dwells a presence within the depths of Mt. Silver, an eerie one which
    hungers for a precious substance. Within this mountain there is a creature which
    hungers for gold, its hunger never satisfied. It has journeyed all over the world
    mining for the precious mineral. But why should it do all the work? Why not let
    others do it for him? Well, that is just what this creature is doing!

    Yii em hotep! By Ra I welcome you to my humble shop! My name is Nebu! As you can
    see, I have a rather disturbing appearance. But do not let that scare you, it has
    been such a long time since I have had customers, please, look around. Is that gold
    I smell on you? Oh yes, we will get along just well. I accept only gold (Snag Coins)
    in this shop, so as long as you have a piece of that precious god flesh, you are
    welcome here. Please, buy something. And if you do not see something you want in our
    rare section, return tomorrow and my rare wares will be different.
  sections:
    - title: "Pokeballs"
      items:
        - itemId: "poke-ball"     # confirm exact id in item.json
          price: 5
          description: "A standard ball. Can catch first-stage and non-evolving Pokemon, but not baby Pokemon."
  rare_section:
    rotates_daily: true
    pool: []                       # fill with rotating rare items
```

Note: resolve `itemId` values against `src/data/item/item.json` (e.g. the Poke Ball is
`Name: "poke", Group: "ball", Filename: "ball/poke.png"`, normalized to id/name/category/
filePath by `src/data/item/index.ts`) so the icon and canonical name render.

---

# The rest of the Snag Mall

The mall has more vendors than the General Store. All share two patterns from the mall
welcome thread:

- **Daily rotating stock** — only items visible that day are buyable.
- **Self-reported ledger on Gaia** ("post coins before/after") — the rebuild MUST
  replace this with a real server-side wallet + transaction log. Never trust a
  client-submitted balance. Every spend/earn goes through a Cloud Function + `auditLog`.

## Trash Shack — Recycling Center  (FUNCTIONALITY — conversion engine)

Garbodor NPC converts unwanted items into Snag Coins, plus candy (Evo Points) into Scents.

```yaml
recycle_rates:                           # items -> pokecoin
  by_count: { 1: 1, 3: 3, 5: 6, 10: 12 }
  nugget_alone: { Nugget: 3, "Big Nugget": 5 }
  nugget_bundles:                        # items + a nugget
    "3+Nugget": 5, "5+Nugget": 10, "10+Nugget": 20
    "3+BigNugget": 7, "5+BigNugget": 12, "10+BigNugget": 24
  consumables: half payout, rounded down   # berries, balls, potions
  excluded: [medicines]
  not_recyclable: items bought for 1 coin
  accepts: non-consumable held items, pearls, mushrooms, key items
candy_to_scent:                          # spends OwnedPokemon evo points
  "4 Evo Points": "1 Joy Scent"
  "6 Evo Points": "1 Excite Scent"
  "8 Evo Points": "1 Vivid Scent"
needs_item_metadata:                     # add flags to the item catalog
  - recyclable: boolean
  - consumable: boolean                  # triggers half payout
  - nuggetValue: number?                 # Nugget/Big Nugget special payouts
  - medicine: boolean                    # excluded
callable: recycleItems({ itemIds }) — sum rates server-side, credit pokecoin, remove items, auditLog
```

## K&L Nature Tours & Market  (FUNCTIONALITY roll engine + heavy CONTENT loot tables)

RNG "tour" gacha: pay per roll, pick 1 of 5 biomes, roll 1-120 -> item from that
biome's table. Plus an Apricorn-picking minigame with growing trees.

```yaml
tour:
  cost: 2 pokecoin per roll
  areas: [Cool Canyon, Beautiful Meadow, Cute Forest, Clever Swamp, Tough Peak]
  roll: 1-120 -> item from chosen area's loot table
  bonus_roll_7: also grants a free Rare Candy
  every_4th_roll: free
apricorn_picking:
  cost: 6 pokecoin per tree
  yield: roll 1-3 = quantity harvested
  trees: 3 trees cycle Seeds -> Sprout -> Sapling -> Mature; only Mature yields
  colors: [Red, White, Blue, Pink, Black, Green, Yellow]
  status: SHIPPED — getApricornTrees() / pickApricorn({ tree }) callables;
          state in users/{uid}/bag/apricorn_trees (slot-keyed color+plantedAt,
          one stage per 24h derived server-side), apricorns are the standard
          "apricorn"-group catalog items (item_0485..item_0491)

loot_tables:                             # CONTENT: five 120-slot tables, number range -> item
  path: admin/kl_loot_tables             # effort: new; migrate full tables keyed to catalog items
  status: full ranges captured in the research notes (5 biomes, ~30 entries each);
          port them verbatim, fix the two transcription gaps in Clever Swamp (slots 33, 38)
callable: rollTour({ area }) — server RNG 1-120, apply table + bonuses, grant item, debit coins, auditLog
note: this is a gambling-adjacent RNG feature; roll server-side only, never client.
```

## E.V.O. — Hybrid & Channeler Moves/Abilities  (FUNCTIONALITY — see RESEARCH_DATA.md)

NPC "Stuart" sells move/ability slots and moves to Hybrid/Channeler characters. This is
really a Research-progression storefront; it belongs with `RESEARCH_DATA.md` but is
sold from the mall.

```yaml
evo:
  eligibility: Hybrids/Channelers who completed their FIRST Master Mission
  services:                              # default prices (make configurable)
    unlock_restraints: { effect: "add a move/ability slot", cost: { snagemblem: 1 } }
    unlock_potential:  { effect: "learn a move/ability (needs open slot)", cost: { snagemblem: 2 } }
    new_adaptations:   { effect: "swap an ability", cost_options: [{ pokecoin: 25 }, { snagemblem: 2 }] }
  no_fixed_catalog: moves are any admin-approved move, priced case-by-case (mostly ~3 emblems)
  storage: per-character move/ability slots + a transaction log (see RESEARCH_DATA.md progression)
```

## Currency note

Across all mall vendors: **Snag Coins** (`pokecoin`) is the everyday currency; **Snag
Emblems** (`snagemblem`) are premium (E.V.O., alchemy). **Gengar Tokens** (`gengarcoin`)
appear only in the Casino (`CASINO_DATA.md`), not in these shops.
