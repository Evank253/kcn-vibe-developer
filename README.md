# KCN Vibe Developer / KCN Vibe Coder (Merged)

**Official merged product** of KCN Vibe Developer + KCN Vibe Coder.

Human-governed AI coding system with:
- Pinned, reliable environment (Developer gate)
- Feature implementation to contract (Coder)
- Smoke gates before anything is considered ready
- Full token economy + NFT agents

## Economy Layer (First Purchase Flow)

On **first successful purchase**:

1. Buyer pays via Stripe
2. Buyer connects wallet
3. System mints utility tokens to buyer
4. System mints NFT agent(s) to buyer (license + agent identity)
5. **Reverse mint**: tokens are also minted to the creator (Evan / KCN)

This is the core “produce on first purchase + reverse to creator” behavior we planned.

## Pricing (locked)

- 2-day free trial
- $39 / 1 month
- $99 / 3 months
- $179 / 6 months
- $299 / 1 year
- $699 Lifetime

Merchant of Record / payments: Stripe (primary) with wallet connect on first purchase.

## Structure

```
/
├── docs/                  # Architecture + economy docs
├── contracts/             # Token + NFT agent contracts (Solidity)
├── server/                # Backend (Stripe webhooks, mint orchestration)
├── client/                # Product UI
└── scripts/               # Deploy + smoke helpers
```

## Status

- Merged product scaffold: ✅
- First-purchase mint + reverse-token: scaffolded (see `docs/ECONOMY.md` and `server/mint/`)
- NFT agents: scaffolded
- Ready for contract addresses, exact token amounts, and chain finalization

## License & IP

Proprietary KCN technology. Source stays private for commercial distribution. Strong IP protection applies.
