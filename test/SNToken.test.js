const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SNToken", function () {
  let SNToken;
  let snToken;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    SNToken = await ethers.getContractFactory("SNToken");
    snToken = await SNToken.deploy();
    await snToken.waitForDeployment();
  });

  it("Should have correct name and symbol", async function () {
    expect(await snToken.name()).to.equal("senmuERC20Token");
    expect(await snToken.symbol()).to.equal("SN");
  });

  it("Should assign the total supply of tokens to the owner", async function () {
    const ownerBalance = await snToken.balanceOf(owner.address);
    const totalSupply = await snToken.totalSupply();
    expect(ownerBalance).to.equal(totalSupply);
  });

  it("Should transfer tokens between accounts", async function () {
    const transferAmount = 50n;
    await snToken.transfer(addr1.address, transferAmount);
    const addr1Balance = await snToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount);
  });

  it("Should fail when trying to transfer more tokens than available", async function () {
    const ownerBalance = await snToken.balanceOf(owner.address);
    await expect(
      snToken.transfer(addr1.address, ownerBalance + 1n)
    ).to.be.revertedWithCustomError(snToken, "ERC20InsufficientBalance");
  });
}); 