# Snagem: Trading Center (Poke Swap) Data Reference (for AI prompting)

Machine-readable inventory for the **Trading Center** page. No route exists yet.
Paste any section into another AI tool as context.

Legend. `visibility`: public · admin. `effort`: stored · computed · new.

## OPEN DECISION: does trading accept currency?

Your brief says: "post both items and Pokemons there but accept currency as part of
the exchange." This **conflicts** with two existing sources:

- `docs/FORUM.md`: "Trading (Poke Swap): trade-only, Pokemon-for-Pokemon, no gifting/selling."
- `src/Pages/Policies/index.tsx`: "Pokemon can be traded only for another Pokemon."

Pick one before building. The schema below supports the fuller version (items +
pokemon + currency). If you keep the strict old rule, drop the `currency` and `items`
fields and constrain offers to pokemon-for-pokemon.

## Reuses (existing data)

```yaml
reuses:
  owned_pokemon: users/{uid}/bag/owned_pokemons   # Record<uuid,OwnedPokemon>
  user_bag:      users/{uid}/bag/items            # Record<itemId,{...,quantity}>
  currency:      users/{uid}/bag/currency         # pokecoin/gengarcoin/snagemblem
  pokemon_meta:  OwnedPokemon has species,type1/2,generation,shiny (filter/wanted-by)
  bonus:         Gaia lore gives traded pokemon 1.5x Evo Points (optional mechanic)
```

## New collection to create

```yaml
trades_schema:
  path: trades/{tradeId}                # effort: new
  fields:
    - key: owner_uid
      type: string
      visibility: public
    - key: offering
      type: object
      shape:
        pokemon: string[]               # owned_pokemon ids being offered
        items: { itemId: string, qty: number }[]
        currency: { pokecoin?: number, gengarcoin?: number, snagemblem?: number }
      visibility: public
    - key: wanting
      type: object
      shape:
        pokemon: string[]               # free-text criteria OR species ids: type, breeding group, family, species
        items: { itemId: string, qty: number }[]
        currency: { pokecoin?: number, gengarcoin?: number, snagemblem?: number }
      visibility: public
    - key: note
      type: string                       # optional message from the poster
      visibility: public
    - key: status
      type: enum(open|accepted|cancelled|expired)
      visibility: public
    - key: acceptedBy
      type: string?                      # uid of the counterparty
      visibility: public
    - key: createdAt
      type: timestamp
      visibility: public
```

## Trade execution (new callable needed)

Moving pokemon/items/currency between two users must be atomic and server-side. Add
`acceptTrade({ tradeId, counterOffer })` Cloud Function that, in a Firestore
transaction, verifies both sides still own what they offered, swaps the assets across
both `bag/*` docs, sets `status: accepted`, and (optional) applies the 1.5x Evo Points
bonus to traded pokemon. Log via `auditLog`.

## Page display (what to show)

- Board of open trades: per card show `offering` (pokemon sprites + item icons +
  currency) and `wanting`, poster username/avatar, `note`.
- Filters: by wanted/offered species, type, "has currency", shiny.
- Create-trade form: pick from your own `owned_pokemons` / `bag/items`, set currency,
  describe what you want.
- "Propose"/"Accept" opens the counterparty confirmation, then calls `acceptTrade`.
