# KCN NFT Agents

NFT agents are minted automatically on the buyer’s **first purchase** of KCN Vibe Developer / Coder.

## Purpose

- Represent the buyer’s licensed access + agent identity inside the KCN system
- Act as the on-chain proof of purchase / entitlement
- Can later be used for gating features, agent swarms, governance, or upgrades

## Mint Trigger

Same first-purchase path as the utility token:

Stripe success → detect first purchase → mint NFT agent(s) to buyer wallet

## Suggested Metadata

```json
{
  "name": "KCN Vibe Agent",
  "description": "Licensed agent identity for KCN Vibe Developer / Coder",
  "attributes": [
    { "trait_type": "Tier", "value": "lifetime" },
    { "trait_type": "Purchase ID", "value": "pi_..." },
    { "trait_type": "Minted At", "value": "2026-..." }
  ]
}
```

## Soulbound vs Transferable

Decide before mainnet deployment. Soulbound is safer for license enforcement; transferable enables secondary markets.
