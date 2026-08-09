/**
 * Pricing + token/NFT tier configuration.
 *
 * Prices below are the ones you locked in the planning conversation.
 * Token amounts are NOT locked yet — you only confirmed the token name
 * (KCN / Ketchum Cognitive Network), not per-tier amounts. The numbers
 * here are placeholders (100 KCN per dollar spent, 10% reverse-mint to
 * creator) so the system is fully wired end-to-end — change TOKENS_PER_USD
 * and CREATOR_REVERSE_MINT_PCT below, or override per-tier, before any
 * real purchase can mint anything.
 */

const TOKENS_PER_USD = Number(process.env.TOKENS_PER_USD || 100);
const CREATOR_REVERSE_MINT_PCT = Number(process.env.CREATOR_REVERSE_MINT_PCT || 0.10);

function tokensForPrice(usd) {
  const buyerAmount = usd * TOKENS_PER_USD;
  const creatorAmount = buyerAmount * CREATOR_REVERSE_MINT_PCT;
  return { buyerAmount, creatorAmount };
}

const TIERS = {
  trial: { label: '2-day free trial', priceUsd: 0, nftTier: 'trial' },
  '1mo': { label: '1 Month', priceUsd: 39, nftTier: '1mo' },
  '3mo': { label: '3 Months', priceUsd: 99, nftTier: '3mo' },
  '6mo': { label: '6 Months', priceUsd: 179, nftTier: '6mo' },
  '1yr': { label: '1 Year', priceUsd: 299, nftTier: '1yr' },
  lifetime: { label: 'Lifetime', priceUsd: 699, nftTier: 'lifetime' },
};

/** Map a Stripe Price ID (from your Stripe dashboard) to a tier key. Fill these in. */
const STRIPE_PRICE_ID_TO_TIER = {
  // 'price_XXXXXXXXXXXXXX': '1mo',
  // 'price_XXXXXXXXXXXXXX': '3mo',
  // 'price_XXXXXXXXXXXXXX': '6mo',
  // 'price_XXXXXXXXXXXXXX': '1yr',
  // 'price_XXXXXXXXXXXXXX': 'lifetime',
};

function tierForStripePriceId(priceId) {
  return STRIPE_PRICE_ID_TO_TIER[priceId] || null;
}

function getTier(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) return null;
  const { buyerAmount, creatorAmount } = tokensForPrice(tier.priceUsd);
  return { ...tier, key: tierKey, tokenAmountBuyer: buyerAmount, tokenAmountCreator: creatorAmount };
}

module.exports = { TIERS, getTier, tierForStripePriceId, tokensForPrice };
