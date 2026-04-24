# BountyChain

BountyChain is a decentralized bounty platform built on Stellar Soroban.

Users create bounties with XLM rewards, workers accept and complete them, and the bounty contract pays the reward automatically through an inter-contract call into the native asset contract.

## Architecture

### Contracts

- `contracts/bounty_contract` - bounty lifecycle and payout logic

### Core flow

`bounty_contract` calls the native asset contract through the generated Soroban token client interface.

### Features

- Native XLM funding through Friendbot for demo wallets
- Inter-contract calls
- Event publishing for bounty activity
- Next.js frontend scaffold
- Responsive Tailwind UI structure

## Build order

1. Build and test `bounty_contract`
2. Connect the frontend
3. Add CI/CD

bounty contract deployed on - CDYAO7KYUBMTCBZSSVT5ZHPFYNJ7GYTX4HTSD44CKCAYWW25BSPYGVVU

## Frontend setup

The frontend is wired to the deployed testnet contracts by default, so you can open it and test the full flow with Freighter immediately.

If you want to override the contract IDs or RPC URL, create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_BOUNTY_CONTRACT_ID=CDYAO7KYUBMTCBZSSVT5ZHPFYNJ7GYTX4HTSD44CKCAYWW25BSPYGVVU
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### What the app can do now

- Connect Freighter
- Show wallet address and XLM balance
- Copy the native XLM asset ID
- Create bounties
- Load bounty details
- Accept, submit, and approve bounties from the UI

### Funding wallets

For demo and testnet usage, a third user can be funded directly on Stellar testnet with Friendbot or any testnet-funding method you prefer.

The recipient can then use that XLM to create or work on bounties.
