/**
 * Stripe webhook handler.
 *
 * Mounted with express.raw() body parsing (see server/index.js) because
 * Stripe's signature verification needs the exact raw request bytes.
 *
 * Flow:
 *   checkout.session.completed  -> create a pending claim, email/return the
 *                                  claim link so the buyer can connect a
 *                                  wallet and receive their tokens + NFT.
 *   charge.refunded             -> best-effort clawback if that customer
 *                                  already claimed.
 *
 * This handler never mints anything directly — minting only happens after
 * the buyer explicitly connects a wallet on the claim page (see
 * server/routes/claim.js). That keeps "a webhook fired" and "tokens were
 * minted to an address" as two separate, auditable steps.
 */

const express = require('express');
const Stripe = require('stripe');
const { getTier, tierForStripePriceId } = require('../config/pricing');
const { createClaim, findByStripeCustomerId } = require('../claims/store');
const { clawbackRefund } = require('../mint/firstPurchaseMint');

const router = express.Router();

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY — see .env.example.');
  }
  return new Stripe(key);
}

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET not set — refusing to process unverified webhook.');
    return res.status(500).send('Server not configured');
  }

  let event;
  try {
    const stripe = getStripeClient();
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature verification failed`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tierKey = resolveTierFromSession(session);
        if (!tierKey) {
          console.error('[stripe webhook] could not resolve tier for session', session.id);
          break;
        }
        const claimToken = createClaim({
          tierKey,
          stripeCustomerId: session.customer,
          stripeSessionId: session.id,
          email: session.customer_details?.email || null,
        });
        // TODO: send this link to the buyer (email, or redirect from Stripe's
        // success_url with ?claim=<token>). Not sending email here since no
        // email provider is configured yet.
        console.log(`[stripe webhook] claim ready: /claim/${claimToken} (tier=${tierKey})`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const found = findByStripeCustomerId(charge.customer);
        if (found && found.claim.status === 'claimed') {
          const tier = getTier(found.claim.tierKey);
          await clawbackRefund({
            buyerWallet: found.claim.walletAddress,
            tokenAmount: tier ? tier.tokenAmountBuyer : 0,
            nftTokenId: found.claim.mintTx?.nftTokenId ?? null,
          });
        }
        break;
      }

      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    res.status(500).send('Webhook handler error');
  }
});

function resolveTierFromSession(session) {
  // Prefer mapping by Stripe Price ID (set these in config/pricing.js).
  const priceId = session?.line_items?.data?.[0]?.price?.id || session?.metadata?.price_id;
  if (priceId) {
    const tier = tierForStripePriceId(priceId);
    if (tier) return tier;
  }
  // Fallback: explicit tier passed through Checkout Session metadata.
  return session?.metadata?.tier || null;
}

module.exports = router;
