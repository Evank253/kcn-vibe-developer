/**
 * First-purchase mint service.
 *
 * Called only after: (1) Stripe confirms payment, and (2) the buyer
 * connects a wallet on the claim page. Never triggered by an unverified
 * client request — see server/routes/claim.js for how this is gated.
 *
 * Requires these env vars to actually submit transactions (see
 * .env.example): RPC_URL, MINTER_PRIVATE_KEY, TOKEN_CONTRACT_ADDRESS,
 * NFT_CONTRACT_ADDRESS, CREATOR_WALLET_ADDRESS.
 */

const { ethers } = require('ethers');
const tokenArtifact = require('../../artifacts/contracts/KCNToken.sol/KCNToken.json');
const nftArtifact = require('../../artifacts/contracts/KCNAgentNFT.sol/KCNAgentNFT.json');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. See .env.example — this must be set before minting can run.`
    );
  }
  return value;
}

function getProvider() {
  return new ethers.JsonRpcProvider(requireEnv('RPC_URL'));
}

function getMinterWallet() {
  return new ethers.Wallet(requireEnv('MINTER_PRIVATE_KEY'), getProvider());
}

function getContracts() {
  const wallet = getMinterWallet();
  const token = new ethers.Contract(requireEnv('TOKEN_CONTRACT_ADDRESS'), tokenArtifact.abi, wallet);
  const nft = new ethers.Contract(requireEnv('NFT_CONTRACT_ADDRESS'), nftArtifact.abi, wallet);
  return { token, nft };
}

/**
 * Mint the buyer's tokens + NFT agent, and reverse-mint the creator's
 * token share, in response to a claimed first purchase.
 *
 * @param {object} params
 * @param {string} params.buyerWallet
 * @param {string} params.tierKey
 * @param {bigint|number} params.tokenAmountBuyer  human units (not wei)
 * @param {bigint|number} params.tokenAmountCreator human units (not wei)
 * @param {string} params.metadataUri NFT metadata URI for this tier
 * @returns {Promise<{tokenTxHash: string, nftTxHash: string, nftTokenId: string}>}
 */
async function mintFirstPurchase({ buyerWallet, tierKey, tokenAmountBuyer, tokenAmountCreator, metadataUri }) {
  if (!ethers.isAddress(buyerWallet)) {
    throw new Error(`Invalid buyer wallet address: ${buyerWallet}`);
  }

  const creatorWallet = requireEnv('CREATOR_WALLET_ADDRESS');
  const { token, nft } = getContracts();

  const decimals = await token.decimals();
  const buyerAmountWei = ethers.parseUnits(String(tokenAmountBuyer), decimals);
  const creatorAmountWei = ethers.parseUnits(String(tokenAmountCreator), decimals);

  const tokenTx = await token.mintWithReverse(buyerWallet, creatorWallet, buyerAmountWei, creatorAmountWei);
  const tokenReceipt = await tokenTx.wait();

  const nftTx = await nft.mintAgent(buyerWallet, tierKey, metadataUri);
  const nftReceipt = await nftTx.wait();

  const mintedEvent = nftReceipt.logs
    .map((log) => {
      try {
        return nft.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === 'AgentMinted');

  return {
    tokenTxHash: tokenReceipt.hash,
    nftTxHash: nftReceipt.hash,
    nftTokenId: mintedEvent ? mintedEvent.args.tokenId.toString() : null,
  };
}

/** Refund clawback: burn the buyer's tokens + NFT for a given claim. Best-effort. */
async function clawbackRefund({ buyerWallet, tokenAmount, nftTokenId }) {
  const { token, nft } = getContracts();
  const decimals = await token.decimals();
  const amountWei = ethers.parseUnits(String(tokenAmount), decimals);

  // Requires the buyer to have approved the minter wallet, OR this should
  // be adapted to your actual refund policy — burning a user's tokens
  // without their approval is not something the minter can do unilaterally
  // with a standard ERC-20 allowance model. Documented here so this isn't
  // silently wrong: decide your refund policy before wiring this live.
  const results = { tokenBurned: false, nftBurned: false };
  try {
    await (await token.burnFrom(buyerWallet, amountWei)).wait();
    results.tokenBurned = true;
  } catch (err) {
    console.error('[clawbackRefund] token burn failed (likely missing allowance):', err.message);
  }

  if (nftTokenId !== null && nftTokenId !== undefined) {
    try {
      await (await nft.burn(nftTokenId)).wait();
      results.nftBurned = true;
    } catch (err) {
      console.error('[clawbackRefund] nft burn failed:', err.message);
    }
  }

  return results;
}

module.exports = { mintFirstPurchase, clawbackRefund };
