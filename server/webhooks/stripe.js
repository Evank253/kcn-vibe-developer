/**
 * Stripe webhook handler for KCN Vibe Developer / Coder
 * Listens for successful payments and triggers first-purchase mint + reverse token.
 */

const express = require("express");
const Stripe = require("stripe");
const { mintOnFirstPurchase } = require("../mint/firstPurchaseMint");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const router = express.Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const session = event.data.object;

      // Extract buyer wallet (you will collect this during checkout / post-purchase wallet connect)
      const buyerWallet = session.metadata?.wallet || session.client_reference_id;
      const customerId = session.customer;
      const tier = session.metadata?.tier || "monthly";
      const paymentId = session.payment_intent || session.id;

      if (buyerWallet) {
        try {
          const result = await mintOnFirstPurchase({
            buyerWallet,
            customerId,
            tier,
            stripePaymentId: paymentId,
          });
          console.log("First-purchase mint result:", result);
        } catch (mintErr) {
          console.error("Mint failed:", mintErr);
          // Still return 200 so Stripe doesn’t keep retrying forever — log + alert instead
        }
      } else {
        console.warn("No buyer wallet attached to session — mint deferred until wallet connect");
        // Optional: store pending mint record keyed by customerId for later claim
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
