const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('KCNToken', function () {
  let token, admin, buyer, creator, stranger;
  const MAX_SUPPLY = ethers.parseUnits('1000000', 18);

  beforeEach(async function () {
    [admin, buyer, creator, stranger] = await ethers.getSigners();
    const KCNToken = await ethers.getContractFactory('KCNToken');
    token = await KCNToken.deploy('Ketchum Cognitive Network', 'KCN', MAX_SUPPLY, admin.address);
    await token.waitForDeployment();
  });

  it('mints to buyer and reverse-mints to creator in one call', async function () {
    const buyerAmount = ethers.parseUnits('100', 18);
    const creatorAmount = ethers.parseUnits('20', 18);

    await expect(token.mintWithReverse(buyer.address, creator.address, buyerAmount, creatorAmount))
      .to.emit(token, 'ReverseMint')
      .withArgs(buyer.address, creator.address, buyerAmount, creatorAmount);

    expect(await token.balanceOf(buyer.address)).to.equal(buyerAmount);
    expect(await token.balanceOf(creator.address)).to.equal(creatorAmount);
    expect(await token.totalSupply()).to.equal(buyerAmount + creatorAmount);
  });

  it('rejects mint from a non-minter account', async function () {
    const amount = ethers.parseUnits('1', 18);
    await expect(
      token.connect(stranger).mintWithReverse(buyer.address, creator.address, amount, amount)
    ).to.be.reverted;
  });

  it('enforces the max supply cap across buyer + creator amounts combined', async function () {
    const tooMuch = MAX_SUPPLY / 2n + 1n;
    await expect(
      token.mintWithReverse(buyer.address, creator.address, tooMuch, tooMuch)
    ).to.be.revertedWith('KCNToken: exceeds max supply');
  });

  it('rejects a zero-address buyer or creator', async function () {
    const amount = ethers.parseUnits('1', 18);
    await expect(
      token.mintWithReverse(ethers.ZeroAddress, creator.address, amount, amount)
    ).to.be.revertedWith('KCNToken: buyer is zero address');
    await expect(
      token.mintWithReverse(buyer.address, ethers.ZeroAddress, amount, amount)
    ).to.be.revertedWith('KCNToken: creator is zero address');
  });

  it('lets a holder burn their own tokens (reverse-token / refund path)', async function () {
    const amount = ethers.parseUnits('50', 18);
    await token.mintWithReverse(buyer.address, creator.address, amount, 0);
    await token.connect(buyer).burn(amount);
    expect(await token.balanceOf(buyer.address)).to.equal(0);
  });
});
