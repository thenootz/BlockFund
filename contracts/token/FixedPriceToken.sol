// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";

contract FixedPriceToken is IERC20 {
    string public name = "Lab10 Token";
    string public symbol = "L10";
    uint8 public decimals = 18;

    uint256 private _totalSupply;
    address public owner;

    uint256 public tokenPriceWei;

    mapping(address => uint256) private _bal;
    mapping(address => mapping(address => uint256)) private _allow;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(uint256 initialSupply, uint256 _tokenPriceWei) {
        owner = msg.sender;
        tokenPriceWei = _tokenPriceWei;
        _mint(address(this), initialSupply); // rezerva pentru vânzare
    }

    function setTokenPriceWei(uint256 newPriceWei) external onlyOwner {
        require(newPriceWei > 0, "price=0");
        tokenPriceWei = newPriceWei;
    }

    function withdrawETH(address payable to, uint256 amountWei) external onlyOwner {
        require(to != address(0), "to=0");
        require(address(this).balance >= amountWei, "insufficient ETH");
        to.transfer(amountWei);
    }

    function buyTokens(uint256 tokenAmount) external payable returns (bool) {
        require(tokenAmount > 0, "amount=0");

        uint256 cost = (tokenAmount * tokenPriceWei) / (10 ** decimals);
        require(msg.value == cost, "wrong ETH sent");

        require(_bal[address(this)] >= tokenAmount, "not enough tokens for sale");
        _transfer(address(this), msg.sender, tokenAmount);
        return true;
    }

    // --- IERC20 ---
    function totalSupply() external view returns (uint256) { return _totalSupply; }
    function balanceOf(address a) external view returns (uint256) { return _bal[a]; }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address o, address s) external view returns (uint256) {
        return _allow[o][s];
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _allow[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 a = _allow[from][msg.sender];
        require(a >= value, "allowance");
        _allow[from][msg.sender] = a - value;
        emit Approval(from, msg.sender, _allow[from][msg.sender]);
        _transfer(from, to, value);
        return true;
    }

    // --- internals ---
    function _mint(address to, uint256 value) internal {
        require(to != address(0), "to=0");
        _totalSupply += value;
        _bal[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "to=0");
        require(_bal[from] >= value, "balance");
        _bal[from] -= value;
        _bal[to] += value;
        emit Transfer(from, to, value);
    }

    receive() external payable {}
}
