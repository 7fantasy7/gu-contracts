const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs.readdirSync(deploymentsDir).filter(f => f.startsWith(network));
  
  if (files.length === 0) {
    console.log("No deployment found for network:", network);
    return;
  }

  const latestFile = files.sort().reverse()[0];
  const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, latestFile)));

  console.log("Verifying contracts on", network);
  console.log("Using deployment:", latestFile);

  try {
    console.log("\n1. Verifying StakingToken...");
    await hre.run("verify:verify", {
      address: deployment.contracts.StakingToken,
      constructorArguments: [],
    });
    console.log("StakingToken verified");
  } catch (error) {
    console.log("StakingToken verification failed:", error.message);
  }

  try {
    console.log("\n2. Verifying RewardToken...");
    await hre.run("verify:verify", {
      address: deployment.contracts.RewardToken,
      constructorArguments: [],
    });
    console.log("RewardToken verified");
  } catch (error) {
    console.log("RewardToken verification failed:", error.message);
  }

  try {
    console.log("\n3. Verifying StakingPool...");
    await hre.run("verify:verify", {
      address: deployment.contracts.StakingPool,
      constructorArguments: [
        deployment.contracts.StakingToken,
        deployment.contracts.RewardToken,
        deployment.parameters.rewardRate,
      ],
    });
    console.log("StakingPool verified");
  } catch (error) {
    console.log("StakingPool verification failed:", error.message);
  }

  console.log("\nVerification complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
