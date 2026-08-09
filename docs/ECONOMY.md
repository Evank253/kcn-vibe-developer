# KCN Economy — Token + NFT Agent Flow

## Status: scaffolded and unit-tested, NOT deployed to any live chain yet.

This document is the source of truth for the token/NFT economy described in
planning conversations. If something here conflicts with an older chat
summary, this file wins — it reflects what's actually implemented in
`contracts/` and `server/`.

## Token

- **Name:** Ketchum Cognitive Network
- **Ticker:** KCN
- **Chain:** Base (recommended — cheap gas, mature EVM tooling, easy
  onramp for non-crypto-native buyers). Not locked; `hardhat.config.js`
  also supports Base Sepolia for testing before mainnet.
- **Contract:** `contracts/KCNToken.sol` — ERC-20, `AccessControl`-gated
  minting (`MINTER_ROLE`), hard supply cap set at deploy time.
- **No public mint function.** Tokens only enter circulation through
  `mintWithReverse()`, called by the backend's minter wallet after a
  verified Stripe payment + buyer wallet connection. See "First purchase
  flow" below.

## NFT Agents

- **Contract:** `contracts/KCNAgentNFT.sol` — ERC-721, **soulbound**
  (transfers revert; see `docs/NFT_AGENTS.md` for why and what "soulbound"
  means here).
- One NFT is minted per first purchase, tagged with the tier the buyer
  bought (`1mo`, `3mo`, `6mo`, `1yr`, `lifetime`).
- Represents "you hold a license to this tier," not a tradeable asset.

## Pricing (locked)

| Tier | Price |
|---|---|
| Trial | 2 days free |
| 1 Month | $39 |
| 3 Months | $99 |
| 6 Months | $179 |
| 1 Year | $299 |
| Lifetime | $699 |

Source: `server/config/pricing.js`.

## Token amounts (NOT locked — placeholders)

The token name and prices above are confirmed. The actual number of KCN
tokens minted per purchase is **not** confirmed yet. Current defaults,
both overridable via env vars:

- `TOKENS_PER_USD` = 100 (buyer receives `price * 100` KCN)
- `CREATOR_REVERSE_MINT_PCT` = 0.10 (creator additionally receives 10% of
  the buyer's amount, minted in the same transaction)

**Decide and lock these before any real purchase can mint anything real.**
Changing them later is easy (env var), but changing them *after* buyers
have already received a different amount raises fairness/disclosure
questions — lock them before go-live, not after.

## First-purchase flow

Stripe has no awareness of crypto wallets, so minting can't happen inside
the Stripe webhook itself — the buyer has to connect a wallet first.

```
1. Buyer completes Stripe Checkout
   -> Stripe fires `checkout.session.completed` webhook
   -> server/webhooks/stripe.js verifies the signature, creates a
      "claim" (pending, not yet minted) keyed by a random token
   -> (TODO: email the claim link, or redirect from Stripe's
      success_url with ?claim=<token> — not wired yet, no email
      provider configured)

2. Buyer opens the claim link, connects a wallet (any standard wallet —
   MetaMask, Coinbase Wallet, etc. via WalletConnect)
   -> frontend calls POST /claim/:token/claim { walletAddress }

3. server/routes/claim.js verifies the claim is real and unclaimed, then
   calls server/mint/firstPurchaseMint.js, which:
     a. mints `tokenAmountBuyer` KCN to the buyer's wallet
     b. reverse-mints `tokenAmountCreator` KCN to CREATOR_WALLET_ADDRESS
        (both in the same on-chain transaction, via mintWithReverse())
     c. mints one soulbound NFT agent to the buyer, tagged with their tier

4. Claim is marked `claimed`. Repeat attempts are rejected (409) — this
   is what prevents a buyer (or an attacker replaying the claim link)
   from minting twice off one purchase.
```

## Refunds ("reverse-token" / burn path)

`charge.refunded` webhook -> `clawbackRefund()` in
`server/mint/firstPurchaseMint.js` attempts to burn the buyer's minted
tokens and NFT.

**Open decision, not yet resolved:** burning a buyer's ERC-20 tokens
without their cooperation requires either (a) the buyer having approved
the minter wallet to spend/burn on their behalf, which nothing in this
flow currently asks them to do, or (b) accepting that refund clawback is
best-effort and may simply fail silently on the token side (the code logs
this rather than crashing). Decide your actual refund policy — e.g., "we
refund the dollar amount but don't chase the tokens" is simpler and more
common — before relying on this.

## What's NOT built yet

- Email delivery of the claim link (Stripe webhook currently only logs it)
- A frontend claim page (wallet-connect UI) — only the API exists
- `hardhat verify` / Basescan source verification after deploy
- Any persistent claim store — `server/claims/store.js` is in-memory only
  and resets on restart. Replace with a real database before production.
