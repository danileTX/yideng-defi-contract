const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("DefiDeposit", function () {
  let DefiDepositFactory;
  let defiDeposit;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    console.log(owner);
    console.log(owner.address, "zztest");

    DefiDepositFactory = await ethers.getContractFactory("DefiDeposit");
    defiDeposit = await DefiDepositFactory.deploy();
    console.log("zz-1");
    // await defiDeposit.deployed(); // ethers 6.x 不需要这个方法了。
    // await defiDeposit.deployTransaction.wait()
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await defiDeposit.owner()).to.equal(owner.address);
    });
  });

  describe("Deposits", function () {
    it("Should allow deposits and emit Deposited event", async function () {
      const depositAmount = ethers.parseUnits("1.0", "ether");

      await expect(defiDeposit.connect(user1).deposit({ value: depositAmount }))
        .to.emit(defiDeposit, "Deposited")
        .withArgs(user1.address, depositAmount, await getBlockTimestamp());
    });

    it("Should fail when deposit amount is 0", async function () {
      await expect(
        defiDeposit.connect(user1).deposit({ value: 0 })
      ).to.be.revertedWith("deposit amount must be greater than 0");
    });

    it("Should accumulate multiple deposits", async function () {
      const depositAmount1 = ethers.parseUnits("1.0", "ether");
      const depositAmount2 = ethers.parseUnits("2.0", "ether");

      await defiDeposit.connect(user1).deposit({ value: depositAmount1 });
      await defiDeposit.connect(user1).deposit({ value: depositAmount2 });

      const info = await defiDeposit.deposits(user1.address);
      const totalDeposit = BigInt(depositAmount1) + BigInt(depositAmount2);
      expect(info.amount).to.equal(totalDeposit);
    });
  });

  describe("Interest Calculation", function () {
    it("Should calculate interest correctly", async function () {
      const depositAmount = ethers.parseUnits("1.0", "ether");

      await defiDeposit.connect(user1).deposit({ value: depositAmount });

      // Advance time by 1 year
      await network.provider.send("evm_increaseTime", [31536000]);
      await network.provider.send("evm_mine");

      const interest = await defiDeposit.calculateInterest(user1.address);
      // Expected 5% annual interest
      const depositAmountBigInt = BigInt(depositAmount);
      const expectedInterest =
        (depositAmountBigInt * BigInt(500)) / BigInt(10000);

      expect(interest).to.equal(expectedInterest);
    });

    it("Should return 0 interest for accounts with no deposit", async function () {
      const interest = await defiDeposit.calculateInterest(user2.address);
      expect(interest).to.equal(0);
    });

    it("Should add interest to balance on new deposit", async function () {
      const depositAmount = ethers.parseUnits("1.0", "ether");
      await defiDeposit.connect(user1).deposit({ value: depositAmount });

      // Advance time by 1 year
      await network.provider.send("evm_increaseTime", [31536000]);
      await network.provider.send("evm_mine");

      // Make another deposit
      await defiDeposit.connect(user1).deposit({ value: depositAmount });

      const info = await defiDeposit.deposits(user1.address);
      const depositAmountBigInt = BigInt(depositAmount);
      const expectedInterest =
        (depositAmountBigInt * BigInt(500)) / BigInt(10000);
      const expectedAmount = depositAmountBigInt * BigInt(2) + expectedInterest;

      expect(info.amount).to.equal(expectedAmount);
    });
  });

  describe("Withdrawals", function () {
    it("Should allow withdrawal within limits", async function () {
      const depositAmount = ethers.parseUnits("1.0", "ether");
      // 进行存款
      await defiDeposit.connect(user1).deposit({ value: depositAmount });

      // 计算提款金额 (60%)
      const withdrawAmount = (depositAmount * 60n) / 100n;

      // 获取提款前的余额
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      // 执行提款操作
      const tx = await defiDeposit.connect(user1).withDraw(withdrawAmount);
      const receipt = await tx.wait();

      // 计算gas费用 - ethers v6中的变化
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // 获取提款后的余额
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // 验证余额变化：新余额 + gas费用 - 旧余额 = 提款金额
      expect(balanceAfter + gasUsed - balanceBefore).to.equal(withdrawAmount);
    });

    it("Should fail when withdrawal exceeds limit", async function () {
      const depositAmount = ethers.parseUnits("1.0", "ether");
      await defiDeposit.connect(user1).deposit({ value: depositAmount });

      const depositAmountBigInt = BigInt(depositAmount.toString());
      const withdrawAmount = (depositAmountBigInt * BigInt(61)) / BigInt(100); // 61% withdrawal
      await expect(
        defiDeposit.connect(user1).withDraw(withdrawAmount)
      ).to.be.revertedWith("Exceeds maxium withdrawal limit");
    });

    it("Should fail when withdrawal amount is 0", async function () {
      await expect(defiDeposit.connect(user1).withDraw(0)).to.be.revertedWith(
        "withdraw amount must greater than 0"
      );
    });

    it("Should fail when insufficient balance", async function () {
      const withdrawAmount = ethers.parseUnits("1.0", "ether");
      await expect(
        defiDeposit.connect(user1).withDraw(withdrawAmount)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Owner Withdrawal", function () {
    it("Should not allow owner withdrawal", async function () {
      await expect(
        defiDeposit.connect(owner).ownerWithdraw()
      ).to.be.revertedWith("Function disabled to prevent bank run");
    });
  });

  describe("Fallback and Receive", function () {
    it("Should accept ETH via receive function", async function () {
      const amount = ethers.parseUnits("1.0", "ether");
      expect(defiDeposit.target).to.not.be.undefined;

      // 获取初始余额
      const initialBalance = await ethers.provider.getBalance(
        defiDeposit.target
      );

      // 发送ETH到合约
      const tx = await owner.sendTransaction({
        to: defiDeposit.target,
        value: amount,
      });
      // 等待交易确认
      await tx.wait();

      // 获取最终余额并验证增加了正确的金额
      const finalBalance = await ethers.provider.getBalance(defiDeposit.target);
      expect(finalBalance - initialBalance).to.equal(amount);
    });
  });
});

async function getBlockTimestamp() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp;
}
