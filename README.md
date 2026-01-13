# BLOCKFUND

Decentralized Crowdfunding & Token Distribution using ERC-20 Tokens

## OVERVIEW

BlockFund is a decentralized application built on Ethereum that implements a complete ERC-20 based crowdfunding workflow.

The system allows multiple contributors to fund a campaign using ERC-20 tokens, optionally applies a sponsorship bonus, and distributes the final amount to beneficiaries based on predefined weights.

This project was developed as part of the Blockchain course assignment and strictly follows all mandatory specifications described in the assignment statement.

## FUNCTIONAL REQUIREMENTS COVERAGE

The project fully implements the required functionality:

- ERC-20 token with fixed price
- Token purchase using ETH
- Token-based crowdfunding
- Partial and full withdrawals before reaching the funding goal
- Funding states:
  - nefinantat
  - prefinantat
  - finantat
- Optional sponsorship with percentage bonus
- Secure distribution to beneficiaries
- One-time claim protection
- Owner-restricted administrative actions
- End-to-end tested flow
- Optional frontend DApp (bonus)

## ARCHITECTURE OVERVIEW

The system is composed of four smart contracts that interact with each other through clearly defined interfaces.

Flow:

User
|
v
FixedPriceToken (ERC-20)
| buyTokens()
| approve()
v
CrowdFunding
|
|--> SponsorFunding
|
'--> DistributeFunding

## SMART CONTRACTS

1. FixedPriceToken

ERC-20 token contract used throughout the system.

Responsibilities:

- Pre-mints a fixed total supply to itself
- Sells tokens at a fixed price in ETH
- Transfers purchased tokens to buyers
- Allows owner to update token price
- Allows owner to withdraw collected ETH

2. CrowdFunding

Handles the crowdfunding lifecycle.

Responsibilities:

- Accepts token contributions from users
- Tracks individual contributions
- Allows partial or full withdrawals before the goal is reached
- Maintains funding state:
  - nefinantat (before reaching goal)
  - prefinantat (goal reached, before sponsorship)
  - finantat (after sponsorship and finalization)
- Requests sponsorship from SponsorFunding
- Transfers final funds to DistributeFunding

3. SponsorFunding

Provides an optional sponsorship bonus.

Responsibilities:

- Stores a fixed sponsorship percentage (basis points)
- Holds tokens used for sponsorship
- Allows owner to purchase sponsorship tokens
- Validates allowed crowdfunding campaigns
- Applies sponsorship only if enough tokens exist

4. DistributeFunding

Distributes final funds to beneficiaries.

Responsibilities:

- Stores beneficiaries and their weights (basis points)
- Accepts final deposit exactly once
- Calculates individual payouts
- Allows each beneficiary to claim exactly once
- Prevents double claims

## SECURITY AND DESIGN CONSIDERATIONS

- Administrative functions protected by onlyOwner
- State-based access control enforced using require
- ERC-20 allowance pattern respected
- No hardcoded addresses
- Double-claim protection
- Deterministic and auditable execution flow
- Solidity ^0.8.x used (safe arithmetic by default)

## TECH STACK

Smart Contracts:

- Solidity ^0.8.20
- OpenZeppelin ERC-20
- Hardhat

Frontend (Bonus):

- React
- ethers.js v6
- TailwindCSS
- MetaMask

## PROJECT STRUCTURE

BlockFund/
|
|-- contracts/
| |-- FixedPriceToken.sol
| |-- CrowdFunding.sol
| |-- SponsorFunding.sol
| '-- DistributeFunding.sol
|
|-- scripts/
| '-- deploy.js
|
|-- frontend/
| |-- src/
| | |-- App.jsx
| | |-- deployments/
| | | '-- 31337.json
| | '-- assets/
| |-- package.json
| '-- vite.config.js
|
|-- hardhat.config.js
|-- package.json
'-- README.txt

## INSTALLATION AND SETUP (FROM ZERO)

PREREQUISITES

Make sure the following are installed:

- Node.js version 18 or higher
- npm
- MetaMask browser extension

STEP 1 – CLONE REPOSITORY

git clone https://github.com/<your-username>/BlockFund.git
cd BlockFund

STEP 2 – INSTALL BACKEND DEPENDENCIES

npm install

STEP 3 – START LOCAL BLOCKCHAIN (HARDHAT)

npx hardhat node

This starts a local Ethereum network at:
http://127.0.0.1:8545

The command also prints 20 test accounts, each funded with 10,000 ETH.

STEP 4 – DEPLOY SMART CONTRACTS

Open a NEW terminal (leave Hardhat node running):

npx hardhat run scripts/deploy.js --network localhost

After deployment:

- All contract addresses are printed in the console
- A deployment file is automatically generated at:

frontend/src/deployments/31337.json

This file is required by the frontend to connect to the deployed contracts.

## METAMASK CONFIGURATION

STEP 5 – ADD LOCAL NETWORK

Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH

STEP 6 – IMPORT TEST ACCOUNT

Import one of the private keys printed by:
npx hardhat node

This account will act as:

- Contract deployer
- Crowdfunding owner
- Sponsor owner

## FRONTEND SETUP (BONUS)

STEP 7 – INSTALL FRONTEND DEPENDENCIES

cd frontend
npm install

STEP 8 – START FRONTEND APPLICATION

npm run dev

The frontend will be available at:
http://localhost:5173

## HOW TO TEST THE COMPLETE FLOW

STEP 1 – CONNECT WALLET

- Open the frontend
- Click "Connect MetaMask"
- Ensure MetaMask is connected to the Hardhat Local network

STEP 2 – BUY TOKENS

- Enter a token amount
- Confirm the MetaMask transaction
- Token balance updates in the UI

STEP 3 – CONTRIBUTE TO CROWDFUNDING

- Enter a contribution amount
- Approve token transfer
- Confirm contribution
- Total collected amount updates

STEP 4 – WITHDRAW (BEFORE GOAL)

- Withdraw partial or full amount
- Allowed only while funding state is "nefinantat"

STEP 5 – REACH FUNDING GOAL

- Once the funding goal is reached:
  - Contributions are locked
  - State becomes "prefinantat"

STEP 6 – SPONSORSHIP (OWNER ONLY)

- Owner approves crowdfunding campaign in SponsorFunding
- Owner requests sponsorship
- Sponsorship is applied only if sufficient tokens exist

STEP 7 – FINALIZE FUNDING

- Owner finalizes the campaign
- Funds are transferred to DistributeFunding
- State becomes "finantat"

STEP 8 – DISTRIBUTION

- Beneficiaries call claim()
- Each beneficiary can claim exactly once
- Distribution is proportional to assigned weights

## DEMO CHECKLIST (LIVE EVALUATION)

- Deploy contracts
- Buy tokens
- Contribute to crowdfunding
- Withdraw before goal
- Reach funding goal
- Apply sponsorship
- Finalize funding
- Claim distribution

## COMMON ISSUES AND NOTES

- Contracts must be redeployed after restarting Hardhat node
- MetaMask must always be connected to chainId 31337
- Frontend reads contract addresses from 31337.json
- If issues occur, redeploy contracts and refresh frontend

## EVALUATION NOTES

- All mandatory features are implemented
- End-to-end flow validated on local blockchain
- Bonus frontend included
- Project is ready for live demo and Q&A

## LICENSE

Educational use only.
Blockchain course assignment.
