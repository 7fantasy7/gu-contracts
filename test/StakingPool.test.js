const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakingPool", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const StakingToken = await ethers.getContractFactory("StakingToken");
    const stakingToken = await StakingToken.deploy();

    const RewardToken = await ethers.getContractFactory("RewardToken");
    const rewardToken = await RewardToken.deploy();

    const rewardRate = ethers.parseEther("100");
    const StakingPool = await ethers.getContractFactory("StakingPool");
    const stakingPool = await StakingPool.deploy(
      await stakingToken.getAddress(),
      await rewardToken.getAddress(),
      rewardRate
    );

    await stakingToken.transfer(user1.address, ethers.parseEther("1000"));
    await stakingToken.transfer(user2.address, ethers.parseEther("1000"));

    const rewardAmount = ethers.parseEther("100000");
    await rewardToken.transfer(await stakingPool.getAddress(), rewardAmount);

    return { stakingPool, stakingToken, rewardToken, owner, user1, user2, rewardRate, rewardAmount };
  }

  describe("Deployment", function () {
    it("Should set the correct tokens", async function () {
      const { stakingPool, stakingToken, rewardToken } = await loadFixture(deployFixture);

      expect(await stakingPool.stakingToken()).to.equal(await stakingToken.getAddress());
      expect(await stakingPool.rewardToken()).to.equal(await rewardToken.getAddress());
    });

    it("Should set the correct reward rate", async function () {
      const { stakingPool, rewardRate } = await loadFixture(deployFixture);

      expect(await stakingPool.rewardRate()).to.equal(rewardRate);
    });

    it("Should set the correct owner", async function () {
      const { stakingPool, owner } = await loadFixture(deployFixture);

      expect(await stakingPool.owner()).to.equal(owner.address);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const { stakingPool, stakingToken, user1 } = await loadFixture(deployFixture);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      expect(await stakingPool.stakedBalance(user1.address)).to.equal(stakeAmount);
      expect(await stakingPool.totalStaked()).to.equal(stakeAmount);
    });

    it("Should revert when staking 0 tokens", async function () {
      const { stakingPool, user1 } = await loadFixture(deployFixture);

      await expect(stakingPool.connect(user1).stake(0)).to.be.revertedWith("Cannot stake 0");
    });

    it("Should emit Staked event", async function () {
      const { stakingPool, stakingToken, user1 } = await loadFixture(deployFixture);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);

      await expect(stakingPool.connect(user1).stake(stakeAmount))
        .to.emit(stakingPool, "Staked")
        .withArgs(user1.address, stakeAmount);
    });
  });

  describe("Withdrawing", function () {
    it("Should allow users to withdraw staked tokens", async function () {
      const { stakingPool, stakingToken, user1 } = await loadFixture(deployFixture);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      const initialBalance = await stakingToken.balanceOf(user1.address);
      await stakingPool.connect(user1).withdraw(stakeAmount);

      expect(await stakingPool.stakedBalance(user1.address)).to.equal(0);
      expect(await stakingToken.balanceOf(user1.address)).to.equal(initialBalance + stakeAmount);
    });

    it("Should revert when withdrawing more than staked", async function () {
      const { stakingPool, stakingToken, user1 } = await loadFixture(deployFixture);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      await expect(
        stakingPool.connect(user1).withdraw(ethers.parseEther("200"))
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should emit Withdrawn event", async function () {
      const { stakingPool, stakingToken, user1 } = await loadFixture(deployFixture);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      await expect(stakingPool.connect(user1).withdraw(stakeAmount))
        .to.emit(stakingPool, "Withdrawn")
        .withArgs(user1.address, stakeAmount);
    });
  });

  describe("Rewards", function () {
    it("Should calculate rewards correctly", async function () {
      const { stakingPool, stakingToken, owner, user1, rewardAmount } = await loadFixture(deployFixture);

      await stakingPool.connect(owner).notifyRewardAmount(rewardAmount);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      await time.increase(86400);

      const earned = await stakingPool.earned(user1.address);
      expect(earned).to.be.gt(0);
    });

    it("Should allow users to claim rewards", async function () {
      const { stakingPool, stakingToken, rewardToken, owner, user1, rewardAmount } = await loadFixture(deployFixture);

      await stakingPool.connect(owner).notifyRewardAmount(rewardAmount);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      await time.increase(86400);

      const initialBalance = await rewardToken.balanceOf(user1.address);
      await stakingPool.connect(user1).claimReward();
      const finalBalance = await rewardToken.balanceOf(user1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should distribute rewards proportionally to multiple stakers", async function () {
      const { stakingPool, stakingToken, owner, user1, user2, rewardAmount } = await loadFixture(deployFixture);

      await stakingPool.connect(owner).notifyRewardAmount(rewardAmount);

      const stakeAmount1 = ethers.parseEther("100");
      const stakeAmount2 = ethers.parseEther("200");

      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount1);
      await stakingPool.connect(user1).stake(stakeAmount1);

      await stakingToken.connect(user2).approve(await stakingPool.getAddress(), stakeAmount2);
      await stakingPool.connect(user2).stake(stakeAmount2);

      await time.increase(86400);

      const earned1 = await stakingPool.earned(user1.address);
      const earned2 = await stakingPool.earned(user2.address);

      expect(earned2).to.be.approximately(earned1 * 2n, ethers.parseEther("0.1"));
    });
  });

  describe("Exit", function () {
    it("Should allow users to exit (withdraw + claim)", async function () {
      const { stakingPool, stakingToken, rewardToken, owner, user1, rewardAmount } = await loadFixture(deployFixture);

      await stakingPool.connect(owner).notifyRewardAmount(rewardAmount);

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      await stakingPool.connect(user1).stake(stakeAmount);

      await time.increase(86400);

      const initialStakingBalance = await stakingToken.balanceOf(user1.address);
      const initialRewardBalance = await rewardToken.balanceOf(user1.address);

      await stakingPool.connect(user1).exit();

      expect(await stakingPool.stakedBalance(user1.address)).to.equal(0);
      expect(await stakingToken.balanceOf(user1.address)).to.equal(initialStakingBalance + stakeAmount);
      expect(await rewardToken.balanceOf(user1.address)).to.be.gt(initialRewardBalance);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to notify reward amount", async function () {
      const { stakingPool, owner, rewardAmount } = await loadFixture(deployFixture);

      await expect(stakingPool.connect(owner).notifyRewardAmount(rewardAmount))
        .to.emit(stakingPool, "RewardAdded")
        .withArgs(rewardAmount);
    });

    it("Should not allow non-owner to notify reward amount", async function () {
      const { stakingPool, user1, rewardAmount } = await loadFixture(deployFixture);

      await expect(
        stakingPool.connect(user1).notifyRewardAmount(rewardAmount)
      ).to.be.revertedWithCustomError(stakingPool, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to pause and unpause", async function () {
      const { stakingPool, stakingToken, owner, user1 } = await loadFixture(deployFixture);

      await stakingPool.connect(owner).pause();

      const stakeAmount = ethers.parseEther("100");
      await stakingToken.connect(user1).approve(await stakingPool.getAddress(), stakeAmount);
      
      await expect(stakingPool.connect(user1).stake(stakeAmount)).to.be.revertedWithCustomError(
        stakingPool,
        "EnforcedPause"
      );

      await stakingPool.connect(owner).unpause();
      await expect(stakingPool.connect(user1).stake(stakeAmount)).to.not.be.reverted;
    });

    it("Should allow owner to set rewards duration", async function () {
      const { stakingPool, owner, rewardAmount } = await loadFixture(deployFixture);

      await stakingPool.connect(owner).notifyRewardAmount(rewardAmount);
      await time.increase(30 * 86400 + 1);

      const newDuration = 60 * 86400;
      await expect(stakingPool.connect(owner).setRewardsDuration(newDuration))
        .to.emit(stakingPool, "RewardsDurationUpdated")
        .withArgs(newDuration);

      expect(await stakingPool.rewardsDuration()).to.equal(newDuration);
    });
  });
});
