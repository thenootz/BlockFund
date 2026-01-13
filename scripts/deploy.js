/* scripts/deploy.js
 *
 * Compatible with:
 * - Hardhat >= 2.19
 * - ethers v6
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

// Helper: convert token amounts (18 decimals)
function toTokens(amountStr) {
  return hre.ethers.parseUnits(amountStr, 18);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying with:", deployer.address);
  console.log("Network chainId:", chainId);

  // ===== CONFIG =====
  const INITIAL_SUPPLY = toTokens("1000000"); // 1,000,000 tokens
  const TOKEN_PRICE_WEI = hre.ethers.parseEther("0.0001"); // 0.0001 ETH / token
  const FUNDING_GOAL = toTokens("10000"); // 10,000 tokens
  const SPONSOR_BPS = 1000; // 10% (basis points)

  // ============================================================
  // 1) FixedPriceToken
  // ============================================================
  const Token = await hre.ethers.getContractFactory("FixedPriceToken");
  const token = await Token.deploy(INITIAL_SUPPLY, TOKEN_PRICE_WEI);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("FixedPriceToken deployed:", tokenAddress);

  // ============================================================
  // 2) DistributeFunding
  // ============================================================
  const Distribute = await hre.ethers.getContractFactory("DistributeFunding");
  const distribute = await Distribute.deploy(tokenAddress);
  await distribute.waitForDeployment();
  const distributeAddress = await distribute.getAddress();

  console.log("DistributeFunding deployed:", distributeAddress);

  // ============================================================
  // 3) SponsorFunding
  // ============================================================
  const Sponsor = await hre.ethers.getContractFactory("SponsorFunding");
  const sponsor = await Sponsor.deploy(tokenAddress, SPONSOR_BPS);
  await sponsor.waitForDeployment();
  const sponsorAddress = await sponsor.getAddress();

  console.log("SponsorFunding deployed:", sponsorAddress);

  // ============================================================
  // 4) CrowdFunding
  // ============================================================
  const Crowd = await hre.ethers.getContractFactory("CrowdFunding");
  const crowd = await Crowd.deploy(
    tokenAddress,
    FUNDING_GOAL,
    sponsorAddress,
    distributeAddress
  );
  await crowd.waitForDeployment();
  const crowdAddress = await crowd.getAddress();

  console.log("CrowdFunding deployed:", crowdAddress);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n=== Deployment summary ===");
  console.log("Token:      ", tokenAddress);
  console.log("Sponsor:    ", sponsorAddress);
  console.log("Distribute: ", distributeAddress);
  console.log("Crowd:      ", crowdAddress);

  // ============================================================
  // Write frontend deployment file (optional)
  // frontend/src/deployments/31337.json
  // ============================================================
  const out = {
    chainId,
    deployer: deployer.address,
    token: tokenAddress,
    sponsorFunding: sponsorAddress,
    distributeFunding: distributeAddress,
    crowdFunding: crowdAddress,
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
    console.log(
      "\n(Info) frontend folder not found, skipping deployments json."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
