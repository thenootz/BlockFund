// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../token/FixedPriceToken.sol";

contract SponsorFunding {
    address public owner;
    FixedPriceToken public immutable token;
    uint256 public immutable sponsorBps;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address tokenAddr, uint256 _sponsorBps) {
        require(tokenAddr != address(0), "token=0");
        require(_sponsorBps <= 10_000, "bps>100%");
        owner = msg.sender;
        token = FixedPriceToken(tokenAddr);
        sponsorBps = _sponsorBps;
    }

    function buyTokensForSponsorship(uint256 tokenAmount) external payable onlyOwner {
        require(tokenAmount > 0, "amount=0");

        uint8 dec = token.decimals();
        uint256 cost = (tokenAmount * token.tokenPriceWei()) / (10 ** dec);
        require(msg.value == cost, "wrong ETH");

        require(token.buyTokens{value: msg.value}(tokenAmount), "buy failed");
    }

    function sponsor(address crowdFundingAddr, uint256 collectedAmount)
        external
        returns (bool sponsored, uint256 sponsorAmount)
    {
        require(crowdFundingAddr != address(0), "crowd=0");
        require(collectedAmount > 0, "collected=0");

        sponsorAmount = (collectedAmount * sponsorBps) / 10_000;

        if (sponsorAmount == 0) return (false, 0);
        if (token.balanceOf(address(this)) < sponsorAmount) return (false, 0);

        require(token.transfer(crowdFundingAddr, sponsorAmount), "transfer failed");
        return (true, sponsorAmount);
    }

    receive() external payable {}
}
