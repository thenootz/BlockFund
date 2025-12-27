// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISponsorFunding {
    function sponsor(address crowdFundingAddr, uint256 collectedAmount) external returns (bool sponsored, uint256 sponsorAmount);
}
