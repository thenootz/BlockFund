// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../token/FixedPriceToken.sol";

contract DistributeFunding {
    FixedPriceToken public immutable token;
    address public owner;

    mapping(address => uint256) public sharesBps;
    address[] public shareholders;
    mapping(address => bool) public claimed;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address tokenAddr) {
        require(tokenAddr != address(0), "token=0");
        token = FixedPriceToken(tokenAddr);
        owner = msg.sender;
    }

    function addOrUpdateShareholder(address a, uint256 bps) external onlyOwner {
        require(a != address(0), "addr=0");
        require(bps <= 10_000, "bps>100%");
        if (sharesBps[a] == 0 && bps > 0) shareholders.push(a);
        sharesBps[a] = bps;
    }

    function claim() external {
        require(!claimed[msg.sender], "already claimed");
        uint256 bps = sharesBps[msg.sender];
        require(bps > 0, "not shareholder");

        uint256 pool = token.balanceOf(address(this));
        require(pool > 0, "no funds");

        uint256 amount = (pool * bps) / 10_000;
        require(amount > 0, "amount=0");

        claimed[msg.sender] = true;
        require(token.transfer(msg.sender, amount), "transfer failed");
    }
}
