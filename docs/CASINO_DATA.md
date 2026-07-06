# Snagem: Casino Data Reference (for AI prompting)

Machine-readable inventory for the **Casino** (an Activities feature, build later).
No route exists yet. Paste any section into another AI tool as context.

Legend. `visibility`: public · admin. `effort`: stored · computed · new.
Status: **deferred** per your note ("build it out later").

## What the casino is

Darts' Ghastly Gambling. Players exchange Snag Coins for **Gengar Tokens** at 2 Snag
Coins = 1 Token, then bet tokens on games. Winnings are tokens (convert back or redeem
prizes). Games:

- **Shadow Lotto**: 1 token/ticket, weekly draw 1-50, match wins the jackpot (starts 100).
- **Hex Roulette**: bet numbers 1-36, max 5 tokens/number, up to 3 numbers. Payouts:
  single 5.5x, two 5x, three 4.5x, range (1-18/19-36) 1.5x, third-divisions 2x.
- **Dream Dice**: roll 2d6, predict total 2-12, bet 1-3 tokens. 2x normal, 3x on doubles.
- **Payback Pyramid**: d4 even/odd, start 1 token, chain up to 5 tokens, cap 10.

Anti-cheat: no deleting/editing/reposting bets. Server RNG only.

## Reuses (existing data)

```yaml
reuses:
  currency:  users/{uid}/bag/currency
    snag_coins:   pokecoin       # spent to buy tokens
    gengar_token: gengarcoin     # the gambling currency (buy 2:1, wager, cash out)
```

The 2:1 exchange and token wagering map cleanly onto the existing `pokecoin` ->
`gengarcoin` fields. No third currency needed.

## New data to create

```yaml
casino_config:
  path: admin/casino_config           # effort: new, admin singleton
  fields:
    - exchange_rate: number            # snag coins per token (2)
    - games: object                    # per-game payout tables + bet limits (from the list above)
    - enabled: boolean

lotto_state:
  path: casino/lotto                   # effort: new
  fields:
    - jackpot: number                  # current token jackpot
    - draw_number: number?             # this week's drawn number once revealed
    - week_id: string                  # which draw period
    - tickets: { uid: string, number: number }[]   # or a subcollection if it grows

# Individual bets/plays are transient: resolved immediately by the callable, only the
# currency delta is persisted. Keep an audit trail via auditLog.
```

## Play flow (new callables, all server-side RNG)

- `exchangeTokens({ direction, amount })` — pokecoin <-> gengarcoin at `exchange_rate`.
- `playGame({ game, bet, picks })` — validate token balance + bet limits, roll server
  RNG, apply payout to `gengarcoin`. One callable with a `game` switch, or one per game.
- `drawLotto()` — scheduled weekly: roll 1-50, pay matching tickets, roll jackpot over.

NEVER roll gambling outcomes on the client. All RNG, balance checks, and payouts live
in Cloud Functions; the client only displays results. Log every play via `auditLog`.

## Page display (what to show)

- Token balance + an exchange widget (Snag Coins <-> Gengar Tokens at the rate).
- One panel per game with its bet controls and payout table.
- Lotto: current `jackpot`, your ticket number(s), last draw result.
