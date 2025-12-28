// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../token/FixedPriceToken.sol";

interface ISponsorFunding {
    function sponsor(address crowdFundingAddr, uint256 collectedAmount)
        external
        returns (bool sponsored, uint256 sponsorAmount);
}

contract CrowdFunding {
    FixedPriceToken public immutable token;
    address public owner;

    uint256 public fundingGoal;
    uint256 public totalCollected;

    mapping(address => uint256) public contributions;
    string public fundingState;

    address public sponsorContract;
    address public distributeContract;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier inState(string memory s) {
        require(keccak256(bytes(fundingState)) == keccak256(bytes(s)), "bad state");
        _;
    }

    constructor(
        address tokenAddr,
        uint256 _fundingGoal,
        address _sponsorContract,
        address _distributeContract
    ) {
        require(tokenAddr != address(0), "token=0");
        require(_fundingGoal > 0, "goal=0");
        require(_sponsorContract != address(0), "sponsor=0");
        require(_distributeContract != address(0), "distribute=0");

        token = FixedPriceToken(tokenAddr);
        owner = msg.sender;

        fundingGoal = _fundingGoal;
        sponsorContract = _sponsorContract;
        distributeContract = _distributeContract;

        fundingState = "nefinantat";
    }

    function contribute(uint256 amount) external inState("nefinantat") {
        require(amount > 0, "amount=0");
        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");

        contributions[msg.sender] += amount;
        totalCollected += amount;

        if (totalCollected >= fundingGoal) {
            fundingState = "prefinantat";
        }
    }

    function withdraw(uint256 amount) external inState("nefinantat") {
        require(amount > 0, "amount=0");
        uint256 c = contributions[msg.sender];
        require(c >= amount, "too much");

        contributions[msg.sender] = c - amount;
        totalCollected -= amount;

        require(token.transfer(msg.sender, amount), "transfer failed");
    }

    function finalizeAndRequestSponsorship() external onlyOwner inState("prefinantat") {
        uint256 bal = token.balanceOf(address(this));
        (bool sponsored, uint256 sponsorAmount) =
            ISponsorFunding(sponsorContract).sponsor(address(this), bal);

        fundingState = "finantat";

        if (sponsored && sponsorAmount > 0) totalCollected = bal + sponsorAmount;
        else totalCollected = bal;
    }

    function transferToDistribute() external onlyOwner inState("finantat") {
        uint256 bal = token.balanceOf(address(this));
        require(bal > 0, "nothing to transfer");
        require(token.transfer(distributeContract, bal), "transfer failed");
    }
}
