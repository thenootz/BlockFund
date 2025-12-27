// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal3 {
    function balanceOf(address a) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

contract DistributeFunding {
    IERC20Minimal3 public immutable token;
    address public owner;

    // pondere în basis points, 10000 = 100%
    mapping(address => uint256) public sharesBps;
    address[] public shareholders;

    mapping(address => bool) public claimed;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address tokenAddr) {
        require(tokenAddr != address(0), "token=0");
        token = IERC20Minimal3(tokenAddr);
        owner = msg.sender;
    }

    function addOrUpdateShareholder(address a, uint256 bps) external onlyOwner {
        require(a != address(0), "addr=0");
        require(bps <= 10_000, "bps>100%");
        if (sharesBps[a] == 0 && bps > 0) {
            shareholders.push(a);
        }
        sharesBps[a] = bps;
    }

    function shareholderCount() external view returns (uint256) {
        return shareholders.length;
    }

    function totalSharesBps() public view returns (uint256 sum) {
        for (uint256 i = 0; i < shareholders.length; i++) {
            sum += sharesBps[shareholders[i]];
        }
    }

    function pendingIncome(address a) public view returns (uint256) {
        if (claimed[a]) return 0;

        uint256 bps = sharesBps[a];
        if (bps == 0) return 0;

        uint256 pool = token.balanceOf(address(this));
        // Notă: pool se schimbă după retrageri; ca să fie “fix” per campanie,
        // ar trebui o funcție de "lock" / snapshot. Pentru laborator, asta e ok.
        return (pool * bps) / 10_000;
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

        bool ok = token.transfer(msg.sender, amount);
        require(ok, "transfer failed");
    }
}
