/**
 * Deploys KCNToken + KCNAgentNFT and grants MINTER_ROLE to the deployer
 * (the same wallet the server uses to mint via server/mint/firstPurchaseMint.js).
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network baseSepolia
 *   npx hardhat run scripts/deploy.js --network base
 */

const hre = require('hardhat');

const TOKEN_NAME = 'Ketchum Cognitive Network';
const TOKEN_SYMBOL = 'KCN';
// 1,000,000 KCN cap — placeholder, see docs/ECONOMY.md before locking this.
const MAX_SUPPLY = hre.ethers.parseUnits('1000000', 18);

const NFT_NAME = 'KCN Vibe Agent';
const NFT_SYMBOL = 'KCNAGENT';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const KCNToken = await hre.ethers.getContractFactory('KCNToken');
  const token = await KCNToken.deploy(TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY, deployer.address);
  await token.waitForDeployment();
  console.log('KCNToken deployed to:', await token.getAddress());

  const KCNAgentNFT = await hre.ethers.getContractFactory('KCNAgentNFT');
  const nft = await KCNAgentNFT.deploy(NFT_NAME, NFT_SYMBOL, deployer.address);
  await nft.waitForDeployment();
  console.log('KCNAgentNFT deployed to:', await nft.getAddress());

  console.log('\nAdd these to your .env:');
  console.log(`TOKEN_CONTRACT_ADDRESS=${await token.getAddress()}`);
  console.log(`NFT_CONTRACT_ADDRESS=${await nft.getAddress()}`);
  console.log(
    '\nThe deployer address above already holds MINTER_ROLE on both contracts (granted in the constructor). Set MINTER_PRIVATE_KEY to this same wallet\'s key so the server can call mintWithReverse() / mintAgent().'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
