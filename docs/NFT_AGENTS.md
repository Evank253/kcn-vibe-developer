# KCN Agent NFTs

## What they are

A KCN Agent NFT is a **license credential**, minted once per first
purchase, representing "this wallet holds an active KCN Vibe
Developer/Coder subscription at tier X." It is not a game item, not
artwork, and not designed to have resale value.

## Why soulbound (non-transferable)

`contracts/KCNAgentNFT.sol` overrides `_update()` to revert any transfer
that isn't a mint (`from == address(0)`) or a burn (`to == address(0)`).
This is deliberate:

- It keeps the product story clean: "you hold a license," not "you hold
  a tradeable collectible." Transferable, value-bearing NFTs tied to a
  paid subscription are more likely to be scrutinized as an investment
  product; soulbound access credentials are a much more defensible
  "utility, not security" position — though this is a business/legal
  judgment call, not a guarantee. (I'm not a lawyer — see the note in
  docs/ECONOMY.md and get real legal review before launch.)
- No secondary market to manage, no floor price, no "I sold my license
  to someone who now has your paid product without paying you" problem.

## Metadata schema

Each NFT's `tokenURI()` should point at a JSON object following the
standard ERC-721 metadata schema:

```json
{
  "name": "KCN Vibe Agent — Lifetime",
  "description": "KCN Vibe Developer/Coder license credential. Soulbound to the original purchaser.",
  "image": "ipfs://<REPLACE>/lifetime.png",
  "attributes": [
    { "trait_type": "Tier", "value": "lifetime" },
    { "trait_type": "Soulbound", "value": "true" }
  ]
}
```

**Not built yet:** actual metadata JSON files, and nowhere to host them.
`server/routes/claim.js` currently passes a placeholder URI
(`ipfs://REPLACE_ME/<tier>.json`) — real images/metadata need to be
created and pinned (e.g. via Pinata, nft.storage, or your own IPFS node)
before this is usable in production. One JSON file + one image per tier
(6 tiers total) is enough to start.

## Tier values in use

`trial`, `1mo`, `3mo`, `6mo`, `1yr`, `lifetime` — must match
`server/config/pricing.js` exactly, since that's what gets passed as the
`tier` argument to `mintAgent()`.
