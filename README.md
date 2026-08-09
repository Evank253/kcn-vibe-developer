# kcn-vibe-developer

KCN Vibe Developer + Coder (merged) — human-governed AI coding system with a
Stripe-driven token + soulbound NFT agent economy on Base.

**Status: contracts + server scaffolding built and unit-tested. Not deployed
to any live chain yet. Token amounts per tier are placeholders — see
`docs/ECONOMY.md` for exactly what's locked vs. still open.**

## What's here

```
contracts/
  KCNToken.sol       — ERC-20 utility token, restricted minting, reverse-mint to creator
  KCNAgentNFT.sol    — ERC-721 soulbound NFT license credential
test/
  KCNToken.test.js       — unit tests (reverse mint, access control, supply cap, burn)
  KCNAgentNFT.test.js    — unit tests (soulbound enforcement, minting, tiers)
server/
  webhooks/stripe.js         — verifies Stripe webhooks, creates pending claims
  routes/claim.js            — wallet-connect claim endpoint, triggers the actual mint
  mint/firstPurchaseMint.js  — the on-chain mint service
  config/pricing.js          — locked prices + placeholder token amounts
  claims/store.js            — in-memory claim tracking (swap for a real DB before launch)
docs/
  ECONOMY.md      — the full flow, what's locked, what's still open
  NFT_AGENTS.md   — NFT metadata schema + why soulbound
scripts/
  deploy.js                   — deploys both contracts to Base/Base Sepolia
  manual/local-mint-check.js  — optional local end-to-end sanity check
```

## Setup

```bash
npm install
cp .env.example .env
# fill in .env — see comments in that file for what each value is
```

## Compile + test

```bash
npx hardhat compile
npx hardhat test
```

## Deploy

```bash
# Testnet first — always
npx hardhat run scripts/deploy.js --network baseSepolia

# Only after the testnet flow is fully verified end-to-end
npx hardhat run scripts/deploy.js --network base
```

Copy the printed contract addresses into `.env`.

## Run the economy server

```bash
npm run server
```

Exposes:
- `POST /webhooks/stripe` — Stripe webhook endpoint (configure this URL in your Stripe dashboard)
- `GET /claim/:token` — look up a pending claim
- `POST /claim/:token/claim` — submit a wallet address, triggers the mint

## Before this goes live

See the checklist in `docs/ECONOMY.md`, but the short version:

1. Lock `TOKENS_PER_USD` and `CREATOR_REVERSE_MINT_PCT` — currently placeholders.
2. Get real legal review on the token + NFT + reverse-mint structure before
   selling anything. Not legal advice here — just a strong recommendation.
3. Replace the in-memory claim store with a real database.
4. Build the actual wallet-connect claim page (frontend) — only the API exists right now.
5. Host real NFT metadata (see `docs/NFT_AGENTS.md`).
6. Map your real Stripe Price IDs in `server/config/pricing.js`.
