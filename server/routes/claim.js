/**
 * Claim routes — the only path through which a mint is ever actually
 * triggered. A Stripe webhook alone never mints anything (see
 * server/webhooks/stripe.js); it only creates a pending claim. This route
 * requires the buyer to explicitly submit a wallet address before any
 * on-chain transaction happens.
 */

const express = require('express');
const { getClaim, markClaimed } = require('../claims/store');
const { getTier } = require('../config/pricing');
const { mintFirstPurchase } = require('../mint/firstPurchaseMint');
const { ethers } = require('ethers');

const router = express.Router();

router.get('/:token', (req, res) => {
  const claim = getClaim(req.params.token);
  if (!claim) return res.status(404).json({ error: 'Claim not found or expired' });

  const tier = getTier(claim.tierKey);
  res.json({
    status: claim.status,
    tier: tier ? { key: tier.key, label: tier.label, priceUsd: tier.priceUsd } : null,
    tokenAmountBuyer: tier ? tier.tokenAmountBuyer : null,
    walletAddress: claim.walletAddress,
  });
});

router.post('/:token/claim', express.json(), async (req, res) => {
  const { walletAddress } = req.body || {};
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: 'A valid walletAddress is required' });
  }

  const claim = getClaim(req.params.token);
  if (!claim) return res.status(404).json({ error: 'Claim not found or expired' });
  if (claim.status === 'claimed') {
    return res.status(409).json({ error: 'This purchase has already been claimed', mintTx: claim.mintTx });
  }

  const tier = getTier(claim.tierKey);
  if (!tier) return res.status(500).json({ error: `Unknown tier: ${claim.tierKey}` });

  try {
    const mintTx = await mintFirstPurchase({
      buyerWallet: walletAddress,
      tierKey: tier.key,
      tokenAmountBuyer: tier.tokenAmountBuyer,
      tokenAmountCreator: tier.tokenAmountCreator,
      // TODO: host real per-tier metadata JSON and point this at it —
      // see docs/NFT_AGENTS.md for the expected schema.
      metadataUri: `ipfs://REPLACE_ME/${tier.key}.json`,
    });

    markClaimed(req.params.token, { walletAddress, mintTx });
    res.json({ ok: true, mintTx });
  } catch (err) {
    console.error('[claim] mint failed:', err);
    res.status(500).json({ error: 'Mint failed', detail: err.message });
  }
});

module.exports = router;
