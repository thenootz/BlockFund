// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal2 {
    function balanceOf(address a) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

interface IFixedPriceToken {
    function buyTokens(uint256 tokenAmount) external payable returns (bool);
    function tokenPriceWei() external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract SponsorFunding {
    address public owner;
    IFixedPriceToken public immutable token;
    IERC20Minimal2 public immutable erc20;

    // procent în basis points: 10000 = 100%
    uint256 public immutable sponsorBps;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address tokenAddr, uint256 _sponsorBps) {
        require(tokenAddr != address(0), "token=0");
        require(_sponsorBps <= 10_000, "bps>100%");
        owner = msg.sender;
        token = IFixedPriceToken(tokenAddr);
        erc20 = IERC20Minimal2(tokenAddr);
        sponsorBps = _sponsorBps;
    }

    // cumpără token-uri în contract pentru sponsorizări
    function buyTokensForSponsorship(uint256 tokenAmount) external payable onlyOwner {
        require(tokenAmount > 0, "amount=0");

        // calculăm costul așteptat (aceeași logică ca token)
        uint8 dec = token.decimals();
        uint256 cost = (tokenAmount * token.tokenPriceWei()) / (10 ** dec);
        require(msg.value == cost, "wrong ETH");

        bool ok = token.buyTokens{value: msg.value}(tokenAmount);
        require(ok, "buy failed");
    }

    // apelat de CrowdFunding după ce e prefinantat
    function sponsor(address crowdFundingAddr, uint256 collectedAmount)
        external
        returns (bool sponsored, uint256 sponsorAmount)
    {
        require(crowdFundingAddr != address(0), "crowd=0");
        require(collectedAmount > 0, "collected=0");

        sponsorAmount = (collectedAmount * sponsorBps) / 10_000;
        uint256 bal = erc20.balanceOf(address(this));

        if (bal < sponsorAmount || sponsorAmount == 0) {
            return (false, 0);
        }

        bool ok = erc20.transfer(crowdFundingAddr, sponsorAmount);
        require(ok, "transfer failed");
        return (true, sponsorAmount);
    }

    function withdrawETH(address payable to, uint256 amountWei) external onlyOwner {
        require(address(this).balance >= amountWei, "no ETH");
        
        // to.transfer(amountWei);
        // since transfer is marked as deprecated
        // In Solidity, the transfer function for sending Ether is now discouraged because it imposes a fixed gas stipend (2300 gas), 
        // which can break contracts that require more gas to receive funds. The recommended approach is to use the low-level call method.
        (bool sent, ) = to.call{value: amountWei}("");
        require(sent, "ETH transfer failed");
    }

    receive() external payable {}
}