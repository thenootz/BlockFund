const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockFund - full flow", function () {
  let owner, user, beneficiary;
  let token, sponsor, distribute, crowd;

  it("runs the complete crowdfunding flow", async function () {
    [owner, user, beneficiary] = await ethers.getSigners();

    // 1. Deploy Token
    const Token = await ethers.getContractFactory("FixedPriceToken");

    const initialSupply = ethers.parseUnits("1000000", 18); // rezerva mare
    const tokenPrice = ethers.parseEther("0.01"); // 0.01 ETH / token

    token = await Token.deploy(initialSupply, tokenPrice);
    await token.waitForDeployment();

    // 2. Deploy SponsorFunding (10%)
    const Sponsor = await ethers.getContractFactory("SponsorFunding");
    sponsor = await Sponsor.deploy(await token.getAddress(), 1000);
    await sponsor.waitForDeployment();

    // 3. Deploy DistributeFunding
    const Distribute = await ethers.getContractFactory("DistributeFunding");
    distribute = await Distribute.deploy(await token.getAddress());
    await distribute.waitForDeployment();

    // 4. Deploy CrowdFunding
    const goal = ethers.parseUnits("100", 18);

    const Crowd = await ethers.getContractFactory("CrowdFunding");
    crowd = await Crowd.deploy(
      await token.getAddress(),
      goal,
      await sponsor.getAddress(),
      await distribute.getAddress()
    );
    await crowd.waitForDeployment();

    // allow crowd in sponsor
    await sponsor.setAllowedCrowdFunding(await crowd.getAddress(), true);

    // 5. User buys tokens
    const buyAmount = ethers.parseUnits("100", 18);
    const cost = (buyAmount * tokenPrice) / ethers.parseUnits("1", 18);

    await token.connect(user).buyTokens(buyAmount, { value: cost });

    expect(await token.balanceOf(user.address)).to.equal(buyAmount);

    // 6. Approve + contribute
    await token.connect(user).approve(await crowd.getAddress(), buyAmount);
    await crowd.connect(user).contribute(buyAmount);

    expect(await crowd.fundingState()).to.equal("prefinantat");

    // 7. Owner buys sponsor tokens (10 tokens)
    const sponsorTokens = ethers.parseUnits("10", 18);
    const sponsorCost =
      (sponsorTokens * tokenPrice) / ethers.parseUnits("1", 18);

    await sponsor.buyTokensForSponsorship(sponsorTokens, {
      value: sponsorCost,
    });

    // 8. Sponsorship + finalize
    await crowd.finalizeAndRequestSponsorship();
    expect(await crowd.fundingState()).to.equal("finantat");

    // 9. Transfer to DistributeFunding
    await crowd.transferToDistribute();
    const total = await token.balanceOf(await distribute.getAddress());

    await distribute.depositFromCrowdfunding(total);

    // 10. Add beneficiary + claim
    await distribute.addOrUpdateShareholder(beneficiary.address, 10_000);
    await distribute.connect(beneficiary).claim();

    expect(await token.balanceOf(beneficiary.address)).to.equal(total);
  });
});
