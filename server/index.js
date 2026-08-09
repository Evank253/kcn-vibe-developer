/**
 * KCN Vibe Developer / Coder — economy server.
 * Handles Stripe payment webhooks and the wallet-connect claim flow that
 * triggers first-purchase minting. See docs/ECONOMY.md for the full flow.
 */

const express = require('express');
const stripeWebhook = require('./webhooks/stripe');
const claimRoutes = require('./routes/claim');

const app = express();

app.get('/health', (_req, res) => res.json({ ok: true, service: 'kcn-vibe-economy' }));

// Mounted before the global json() parser — Stripe needs the raw body.
app.use('/webhooks', stripeWebhook);

app.use('/claim', claimRoutes);

const PORT = process.env.PORT || 4100;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`KCN economy server listening on :${PORT}`);
  });
}

module.exports = app;
