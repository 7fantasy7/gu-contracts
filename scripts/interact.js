const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [user] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs.readdirSync(deploymentsDir).filter(f => f.startsWith(network));
  
  if (files.length === 0) {
    console.log("No deployment found for network:", network);
    return;
  }

  const latestFile = files.sort().reverse()[0];
  const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, latestFile)));

  console.log("Interacting with contracts on", network);
  console.log("User address:", user.address);

  const stakingToken = await hre.ethers.getContractAt("StakingToken", deployment.contracts.StakingToken);
  const rewardToken = await hre.ethers.getContractAt("RewardToken", deployment.contracts.RewardToken);
  const stakingPool = await hre.ethers.getContractAt("StakingPool", deployment.contracts.StakingPool);

  console.log("\n=== Current Status ===");
  console.log("Staking Token Balance:", hre.ethers.formatEther(await stakingToken.balanceOf(user.address)));
  console.log("Reward Token Balance:", hre.ethers.formatEther(await rewardToken.balanceOf(user.address)));
  console.log("Staked Amount:", hre.ethers.formatEther(await stakingPool.stakedBalance(user.address)));
  console.log("Earned Rewards:", hre.ethers.formatEther(await stakingPool.earned(user.address)));
  console.log("Total Staked:", hre.ethers.formatEther(await stakingPool.totalStaked()));
  console.log("Reward Rate:", hre.ethers.formatEther(await stakingPool.rewardRate()), "per second");
  console.log("=====================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
