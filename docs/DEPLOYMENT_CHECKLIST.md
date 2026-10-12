# Vibe Developer – Deployment Checklist

## Prerequisites
- [ ] Base Sepolia (or Base mainnet) RPC URL + private key with gas
- [ ] Stripe account + webhook secret
- [ ] `.env` filled from `.env.example`

## Steps

1. **Compile & test contracts**
   ```bash
   npx hardhat compile
   npx hardhat test
   ```

2. **Deploy to Base Sepolia**
   ```bash
   npx hardhat run scripts/deploy.js --network baseSepolia
   ```
   Record the two contract addresses in `.env`.

3. **Switch claim store to durable**
   In `server/routes/claim.js` and `server/webhooks/stripe.js`, replace:
   ```js
   const { store } = require('../claims/store');
   ```
   with:
   ```js
   const { DurableClaimStore } = require('../claims/durable_store');
   const store = new DurableClaimStore();
   ```

4. **Hook mint → Integration Layer**
   After a successful mint in `firstPurchaseMint.js`, call:
   ```js
   const { registerMintedAgent } = require('../integration/vibe_bridge');
   registerMintedAgent({ tokenId, ownerWallet, tier, txHash });
   ```

5. **Run server**
   ```bash
   node server/index.js
   ```

6. **Point Stripe webhook** at `/webhooks/stripe` and complete a test purchase.

## Next
- Replace file-backed store with Postgres when traffic grows
- Connect `agent_registry.json` to the Python Integration Layer Identity Federation / AI Control Plane over HTTP or a shared DB
