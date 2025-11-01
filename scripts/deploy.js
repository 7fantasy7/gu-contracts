const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  console.log("\n1. Deploying StakingToken...");
  const StakingToken = await hre.ethers.getContractFactory("StakingToken");
  const stakingToken = await StakingToken.deploy();
  await stakingToken.waitForDeployment();
  const stakingTokenAddress = await stakingToken.getAddress();
  console.log("StakingToken deployed to:", stakingTokenAddress);

  console.log("\n2. Deploying RewardToken...");
  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("RewardToken deployed to:", rewardTokenAddress);

  console.log("\n3. Deploying StakingPool...");
  const rewardRate = hre.ethers.parseEther("100");
  const StakingPool = await hre.ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(
    stakingTokenAddress,
    rewardTokenAddress,
    rewardRate
  );
  await stakingPool.waitForDeployment();
  const stakingPoolAddress = await stakingPool.getAddress();
  console.log("StakingPool deployed to:", stakingPoolAddress);

  console.log("\n4. Transferring reward tokens to StakingPool...");
  const rewardAmount = hre.ethers.parseEther("10000000");
  const tx = await rewardToken.transfer(stakingPoolAddress, rewardAmount);
  await tx.wait();
  console.log("Transferred", hre.ethers.formatEther(rewardAmount), "RWD tokens to StakingPool");

  console.log("\n5. Initializing reward distribution...");
  const initialReward = hre.ethers.parseEther("100000");
  const initTx = await stakingPool.notifyRewardAmount(initialReward);
  await initTx.wait();
  console.log("Reward distribution initialized with", hre.ethers.formatEther(initialReward), "RWD");

  const deployment = {
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      StakingToken: stakingTokenAddress,
      RewardToken: rewardTokenAddress,
      StakingPool: stakingPoolAddress,
    },
    parameters: {
      rewardRate: rewardRate.toString(),
      initialReward: initialReward.toString(),
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = path.join(deploymentsDir, `${network}-${Date.now()}.json`);
  fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to:", filename);

  console.log("\n=== Deployment Summary ===");
  console.log("StakingToken:", stakingTokenAddress);
  console.log("RewardToken:", rewardTokenAddress);
  console.log("StakingPool:", stakingPoolAddress);
  console.log("==========================\n");

  if (network !== "hardhat" && network !== "localhost") {
    console.log("Waiting for block confirmations...");
    await stakingToken.deploymentTransaction().wait(5);
    await rewardToken.deploymentTransaction().wait(5);
    await stakingPool.deploymentTransaction().wait(5);
    console.log("Verified on blockchain");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
