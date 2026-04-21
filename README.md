# BountyChain

BountyChain is a decentralized bounty platform built on Stellar Soroban.

Users create bounties with token rewards, workers accept and complete them, and the bounty contract pays the reward automatically through an inter-contract call into the token contract.

## Architecture

### Contracts

- `contracts/token_contract` - custom BOUNTY token contract
- `contracts/bounty_contract` - bounty lifecycle and payout logic

### Core flow

`bounty_contract` calls `token_contract` through the generated Soroban client interface.

### Features

- Custom token balances and minting
- Inter-contract calls
- Event publishing for bounty activity
- Next.js frontend scaffold
- Responsive Tailwind UI structure

## Build order

1. Build and test `token_contract`
2. Build and test `bounty_contract`
3. Connect the frontend
4. Add CI/CD

