/* scripts/deploy.js (Hardhat 2 + CommonJS)
 *
 * Deploy order:
 * 1) FixedPriceToken
 * 2) DistributeFunding
 * 3) SponsorFunding
 * 4) CrowdFunding
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function toTokens(amountStr) {
  return hre.ethers.utils.parseUnits(amountStr, 18);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying with:", deployer.address);
  console.log("Network chainId:", chainId);

  // ===== CONFIG (edit if needed) =====
  const INITIAL_SUPPLY = toTokens("1000000");            // 1,000,000 tokens
  const TOKEN_PRICE_WEI = hre.ethers.utils.parseEther("0.0001"); // 0.0001 ETH per token
  const FUNDING_GOAL = toTokens("10000");                // 10,000 tokens goal
  const SPONSOR_BPS = 1000;                              // 10%

  // 1) Token
  const Token = await hre.ethers.getContractFactory("FixedPriceToken");
  const token = await Token.deploy(INITIAL_SUPPLY, TOKEN_PRICE_WEI);
  await token.deployed();
  console.log("FixedPriceToken deployed:", token.address);

  // 2) DistributeFunding
  const Distribute = await hre.ethers.getContractFactory("DistributeFunding");
  const distribute = await Distribute.deploy(token.address);
  await distribute.deployed();
  console.log("DistributeFunding deployed:", distribute.address);

  // 3) SponsorFunding
  const Sponsor = await hre.ethers.getContractFactory("SponsorFunding");
  const sponsor = await Sponsor.deploy(token.address, SPONSOR_BPS);
  await sponsor.deployed();
  console.log("SponsorFunding deployed:", sponsor.address);

  // 4) CrowdFunding
  const Crowd = await hre.ethers.getContractFactory("CrowdFunding");
  const crowd = await Crowd.deploy(token.address, FUNDING_GOAL, sponsor.address, distribute.address);
  await crowd.deployed();
  console.log("CrowdFunding deployed:", crowd.address);

  console.log("\n=== Deployment summary ===");
  console.log("Token:      ", token.address);
  console.log("Sponsor:    ", sponsor.address);
  console.log("Distribute: ", distribute.address);
  console.log("Crowd:      ", crowd.address);

  // (Optional) write frontend deployments file if folder exists
  const out = {
    chainId,
    deployer: deployer.address,
    token: token.address,
    sponsorFunding: sponsor.address,
    distributeFunding: distribute.address,
    crowdFunding: crowd.address,
    config: {
      initialSupply: INITIAL_SUPPLY.toString(),
      tokenPriceWei: TOKEN_PRICE_WEI.toString(),
      fundingGoal: FUNDING_GOAL.toString(),
      sponsorBps: SPONSOR_BPS,
    },
  };

  const outDir = path.join(__dirname, "..", "frontend", "src", "deployments");
  const outFile = path.join(outDir, `${chainId}.json`);

  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
    console.log("\nWrote frontend deployments file:", outFile);
  } catch (e) {
    console.log("\n(Info) frontend folder not found, skipping deployments json.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
