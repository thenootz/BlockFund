/* scripts/deploy.js
 *
 * Deploy flow:
 * 1) FixedPriceToken (pre-minted supply in token contract address)
 * 2) DistributeFunding
 * 3) SponsorFunding
 * 4) CrowdFunding (wired to sponsor + distribute)
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function toTokens(amountStr) {
  // 18 decimals token
  return hre.ethers.parseUnits(amountStr, 18);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying with:", deployer.address);
  console.log("Network chainId:", chainId);

  // =========================
  // CONFIG (edit these)
  // =========================

  // Total supply minted to token contract itself (for sale)
  // Example: 1,000,000 tokens
  const INITIAL_SUPPLY = toTokens("1000000");

  // Price in wei for 1 token (1.0 token = 1e18 units)
  // Example: 0.0001 ETH per token
  const TOKEN_PRICE_WEI = hre.ethers.parseEther("0.0001");

  // Crowdfunding goal in tokens
  // Example: 10,000 tokens goal
  const FUNDING_GOAL = toTokens("10000");

  // Sponsor percent in basis points (bps): 10000 = 100%
  // Example: 1000 bps = 10%
  const SPONSOR_BPS = 1000;

  // =========================
  // Deploy contracts
  // =========================

  // 1) Token
  const Token = await hre.ethers.getContractFactory("FixedPriceToken");
  const token = await Token.deploy(INITIAL_SUPPLY, TOKEN_PRICE_WEI);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("FixedPriceToken deployed:", tokenAddr);

  // 2) DistributeFunding
  const Distribute = await hre.ethers.getContractFactory("DistributeFunding");
  const distribute = await Distribute.deploy(tokenAddr);
  await distribute.waitForDeployment();
  const distributeAddr = await distribute.getAddress();
  console.log("DistributeFunding deployed:", distributeAddr);

  // 3) SponsorFunding
  const Sponsor = await hre.ethers.getContractFactory("SponsorFunding");
  const sponsor = await Sponsor.deploy(tokenAddr, SPONSOR_BPS);
  await sponsor.waitForDeployment();
  const sponsorAddr = await sponsor.getAddress();
  console.log("SponsorFunding deployed:", sponsorAddr);

  // 4) CrowdFunding (wired)
  const Crowd = await hre.ethers.getContractFactory("CrowdFunding");
  const crowd = await Crowd.deploy(tokenAddr, FUNDING_GOAL, sponsorAddr, distributeAddr);
  await crowd.waitForDeployment();
  const crowdAddr = await crowd.getAddress();
  console.log("CrowdFunding deployed:", crowdAddr);

  // =========================
  // Print quick summary
  // =========================
  console.log("\n=== Deployment summary ===");
  console.log("Token:      ", tokenAddr);
  console.log("Sponsor:    ", sponsorAddr);
  console.log("Distribute: ", distributeAddr);
  console.log("Crowd:      ", crowdAddr);

  console.log("\nConfig used:");
  console.log("- initialSupply:", INITIAL_SUPPLY.toString());
  console.log("- tokenPriceWei:", TOKEN_PRICE_WEI.toString());
  console.log("- fundingGoal:  ", FUNDING_GOAL.toString());
  console.log("- sponsorBps:   ", SPONSOR_BPS);

  // =========================
  // (Optional) write frontend deployments file
  // =========================
  const out = {
    chainId,
    deployer: deployer.address,
    token: tokenAddr,
    sponsorFunding: sponsorAddr,
    distributeFunding: distributeAddr,
    crowdFunding: crowdAddr,
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
    console.log("\n(Info) Could not write frontend deployments file (maybe no frontend folder yet).");
    console.log("      You can create it later or ignore this step.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
