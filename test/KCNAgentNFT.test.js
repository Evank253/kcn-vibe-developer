const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('KCNAgentNFT', function () {
  let nft, admin, buyer, other, stranger;

  beforeEach(async function () {
    [admin, buyer, other, stranger] = await ethers.getSigners();
    const KCNAgentNFT = await ethers.getContractFactory('KCNAgentNFT');
    nft = await KCNAgentNFT.deploy('KCN Vibe Agent', 'KCNAGENT', admin.address);
    await nft.waitForDeployment();
  });

  it('mints an agent NFT to the buyer with the given tier and metadata URI', async function () {
    const uri = 'ipfs://example-metadata/1';
    await expect(nft.mintAgent(buyer.address, 'lifetime', uri))
      .to.emit(nft, 'AgentMinted')
      .withArgs(buyer.address, 0, 'lifetime');

    expect(await nft.ownerOf(0)).to.equal(buyer.address);
    expect(await nft.tokenURI(0)).to.equal(uri);
    expect(await nft.tierOf(0)).to.equal('lifetime');
  });

  it('rejects minting from a non-minter account', async function () {
    await expect(nft.connect(stranger).mintAgent(buyer.address, '1mo', 'ipfs://x')).to.be.reverted;
  });

  it('is soulbound — the holder cannot transfer it', async function () {
    await nft.mintAgent(buyer.address, '1mo', 'ipfs://x');
    await expect(
      nft.connect(buyer).transferFrom(buyer.address, other.address, 0)
    ).to.be.revertedWith('KCNAgentNFT: soulbound, non-transferable');
  });

  it('is soulbound — even an approved operator cannot transfer it', async function () {
    await nft.mintAgent(buyer.address, '1mo', 'ipfs://x');
    await nft.connect(buyer).approve(other.address, 0);
    await expect(
      nft.connect(other).transferFrom(buyer.address, other.address, 0)
    ).to.be.revertedWith('KCNAgentNFT: soulbound, non-transferable');
  });

  it('allows the minter service to burn on a refund clawback', async function () {
    await nft.mintAgent(buyer.address, '1mo', 'ipfs://x');
    await nft.burn(0);
    await expect(nft.ownerOf(0)).to.be.reverted;
  });
});
