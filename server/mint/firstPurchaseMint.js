/**
 * KCN Vibe — First Purchase Mint + Reverse Token
 *
 * Triggered by Stripe webhook on successful payment.
 * - Mints utility tokens to buyer
 * - Mints NFT agent(s) to buyer
 * - Reverse-mints tokens to creator
 */

const { ethers } = require("ethers"); // or viem — adjust to stack

// TODO: replace with real ABIs + addresses after deploy
const TOKEN_ABI = [];
const NFT_AGENT_ABI = [];

const CREATOR_WALLET = process.env.CREATOR_WALLET; // Evan / KCN treasury
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const NFT_AGENT_ADDRESS = process.env.NFT_AGENT_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY; // controlled minter key

async function isFirstPurchase(customerIdOrWallet) {
  // TODO: check your DB / ledger whether this buyer already received the first-purchase mint
  return true; // placeholder
}

async function mintOnFirstPurchase({
  buyerWallet,
  customerId,
  tier, // "monthly" | "3mo" | "6mo" | "yearly" | "lifetime"
  stripePaymentId,
}) {
  if (!buyerWallet) {
    throw new Error("Buyer wallet required for minting");
  }

  const first = await isFirstPurchase(customerId || buyerWallet);
  if (!first) {
    console.log("Not a first purchase — skipping mint");
    return { skipped: true };
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);

  const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);
  const nft = new ethers.Contract(NFT_AGENT_ADDRESS, NFT_AGENT_ABI, wallet);

  // --- amounts (replace with final numbers) ---
  const BUYER_TOKEN_AMOUNT = ethers.parseUnits("1000", 18); // placeholder
  const CREATOR_REVERSE_AMOUNT = ethers.parseUnits("500", 18); // placeholder reverse mint

  // 1. Mint tokens to buyer
  const tx1 = await token.mint(buyerWallet, BUYER_TOKEN_AMOUNT);
  await tx1.wait();

  // 2. Mint NFT agent(s) to buyer
  // metadata can include tier, timestamp, stripePaymentId, etc.
  const tx2 = await nft.mintAgent(buyerWallet, tier, stripePaymentId);
  await tx2.wait();

  // 3. Reverse mint to creator
  const tx3 = await token.mint(CREATOR_WALLET, CREATOR_REVERSE_AMOUNT);
  await tx3.wait();

  // TODO: write to your internal ledger so this wallet/customer is marked as minted

  return {
    success: true,
    buyerTokens: BUYER_TOKEN_AMOUNT.toString(),
    creatorReverseTokens: CREATOR_REVERSE_AMOUNT.toString(),
    nftMinted: true,
    txs: [tx1.hash, tx2.hash, tx3.hash],
  };
}

module.exports = { mintOnFirstPurchase, isFirstPurchase };
