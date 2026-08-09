/**
 * Claim store — tracks a pending mint from Stripe checkout until the buyer
 * connects a wallet and claims it.
 *
 * IMPORTANT: this is in-memory only, so it resets on server restart and
 * does not work across multiple server instances. Swap this for a real
 * database (Postgres, Redis, etc.) before going live — this exists so the
 * rest of the pipeline (webhook -> claim -> mint) is fully wired and
 * testable now.
 */

const crypto = require('crypto');

/** @type {Map<string, { tierKey: string, stripeCustomerId: string, stripeSessionId: string, email: string|null, status: 'pending'|'claimed', walletAddress: string|null, mintTx: object|null, createdAt: number }>} */
const claims = new Map();

function createClaim({ tierKey, stripeCustomerId, stripeSessionId, email = null }) {
  const token = crypto.randomBytes(24).toString('hex');
  claims.set(token, {
    tierKey,
    stripeCustomerId,
    stripeSessionId,
    email,
    status: 'pending',
    walletAddress: null,
    mintTx: null,
    createdAt: Date.now(),
  });
  return token;
}

function getClaim(token) {
  return claims.get(token) || null;
}

function markClaimed(token, { walletAddress, mintTx }) {
  const claim = claims.get(token);
  if (!claim) return null;
  claim.status = 'claimed';
  claim.walletAddress = walletAddress;
  claim.mintTx = mintTx;
  return claim;
}

/** Find the most recent pending claim for a Stripe customer (used by refund handling). */
function findByStripeCustomerId(stripeCustomerId) {
  let found = null;
  for (const [token, claim] of claims) {
    if (claim.stripeCustomerId === stripeCustomerId) {
      if (!found || claim.createdAt > found.claim.createdAt) found = { token, claim };
    }
  }
  return found;
}

module.exports = { createClaim, getClaim, markClaimed, findByStripeCustomerId };
