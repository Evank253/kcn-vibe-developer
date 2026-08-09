# KCN Vibe Economy — Token + NFT Agents

## Core Rule

**On first purchase of the tool:**
- Mint utility tokens to the buyer
- Mint NFT agent(s) to the buyer
- Reverse-mint tokens to the creator (Evan / KCN treasury)

Stripe handles payment. Buyer connects wallet during/after checkout. Minting is triggered by the successful payment webhook.

## Planned Components

### 1. Utility Token
- Name / Ticker: TBD (placeholder: `KCN` or `VIBE`)
- Chain: Base (recommended) or Ethereum
- First-purchase amount to buyer: TBD
- Reverse-mint amount to creator: TBD
- Reverse-token mechanics: mint to creator on every first purchase; optional burn/usage rules later

### 2. NFT Agents
- Represent the buyer’s licensed agent identity + access rights inside the Vibe system
- Minted automatically on first purchase
- Metadata includes: license tier, purchase timestamp, linked wallet, agent capabilities
- Can be soulbound or transferable (decide before mainnet)

### 3. Flow

```
Stripe Checkout → payment_intent.succeeded webhook
       ↓
Detect first purchase for this customer/wallet
       ↓
Mint tokens → buyer
Mint NFT agent(s) → buyer
Reverse mint tokens → creator wallet
       ↓
Record in ledger + unlock product access
```

## Creator Wallet

The reverse-token destination is the creator’s wallet (configured via environment variable `CREATOR_WALLET`).

## Next Steps for Live

1. Finalize token name, ticker, chain, and exact mint amounts
2. Deploy contracts (or use existing ones)
3. Set `STRIPE_WEBHOOK_SECRET`, `CREATOR_WALLET`, and RPC keys
4. Wire wallet connect (RainbowKit / wagmi or equivalent) into the purchase flow
