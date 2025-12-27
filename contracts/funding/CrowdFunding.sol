// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal {
    function balanceOf(address a) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface ISponsorFunding {
    function sponsor(address crowdFundingAddr, uint256 collectedAmount) external returns (bool sponsored, uint256 sponsorAmount);
}

contract CrowdFunding {
    IERC20Minimal public immutable token;
    address public owner;

    uint256 public fundingGoal;
    uint256 public totalCollected;

    // evidență contribuții per adresă
    mapping(address => uint256) public contributions;

    // "nefinantat" | "prefinantat" | "finantat"
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

    constructor(address tokenAddr, uint256 _fundingGoal, address _sponsorContract, address _distributeContract) {
        require(tokenAddr != address(0), "token=0");
        require(_fundingGoal > 0, "goal=0");
        require(_sponsorContract != address(0), "sponsor=0");
        require(_distributeContract != address(0), "distribute=0");

        token = IERC20Minimal(tokenAddr);
        owner = msg.sender;

        fundingGoal = _fundingGoal;
        sponsorContract = _sponsorContract;
        distributeContract = _distributeContract;

        fundingState = "nefinantat";
    }

    function contribute(uint256 amount) external inState("nefinantat") {
        require(amount > 0, "amount=0");

        // transfer tokens de la contribuitor la contract
        bool ok = token.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

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

        bool ok = token.transfer(msg.sender, amount);
        require(ok, "transfer failed");
    }

    function finalizeAndRequestSponsorship() external onlyOwner inState("prefinantat") {
        uint256 bal = token.balanceOf(address(this));
        // bal ar trebui să fie totalCollected (dacă nu au intrat tokenuri extra)
        (bool sponsored, uint256 sponsorAmount) =
            ISponsorFunding(sponsorContract).sponsor(address(this), bal);

        // indiferent dacă a sponsorizat sau nu, trecem la "finantat"
        // (conform cerinței: "dupa eventuala sponsorizare")
        fundingState = "finantat";

        // actualizăm totalCollected cu suma reală din contract (inclusiv sponsor)
        // dar doar dacă sponsorFunding chiar a trimis
        if (sponsored && sponsorAmount > 0) {
            totalCollected = bal + sponsorAmount;
        } else {
            totalCollected = bal;
        }
    }

    function transferToDistribute() external onlyOwner inState("finantat") {
        uint256 bal = token.balanceOf(address(this));
        require(bal > 0, "nothing to transfer");

        bool ok = token.transfer(distributeContract, bal);
        require(ok, "transfer failed");
    }
}