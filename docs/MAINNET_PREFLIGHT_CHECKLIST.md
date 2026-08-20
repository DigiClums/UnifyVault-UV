# UNIFYVAULT V2 — MAINNET PRE-FLIGHT CHECKLIST

**Network**: Base Mainnet (`Chain ID: 8453`)  
**Status**: Pre-Flight Preparation & Audit Phase

---

## 1. Network & Blockchain Infrastructure

- [ ] **Mainnet RPC Configured**: High-availability dedicated RPC endpoint (Alchemy / Infura / QuickNode) configured in production environment.
- [ ] **Mainnet Chain ID Verified**: Confirmed `chainId === 8453`.
- [ ] **Mainnet Token Addresses Verified**:
  - `USDC`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (6 decimals)
  - `cbBTC`: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` (8 decimals)
  - `WETH`: `0x4200000000000000000000000000000000000006` (18 decimals)
- [ ] **Mainnet Chainlink Feeds Verified**:
  - `USDC/USD`: `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B`
  - `cbBTC/USD`: `0x8C74B2811D2F1aD65517ADB5C65773c1E520ed2f`
  - `ETH/USD`: `0xe6eb5B9b85cFF2C84Df3De6e7855bC9E76f034d5`
- [ ] **Mainnet Deployer Wallet Secured**: Cold hardware wallet or multisig deployer with sufficient initial ETH for deployment gas.

---

## 2. Governance & Administration Policy

- [ ] **Production Governance Decision Finalized**: Explicit decision recorded for launch governance mode:
  - **Option A**: Launch with Single Admin EOA (direct operational efficiency, migrate to Safe later).
  - **Option B**: Launch directly with Gnosis Safe multi-sig.
- [ ] **Timelock Delay Verified**: Minimum delay set to `172,800 seconds` (48 hours) for queued governance proposals.
- [ ] **Timelock Proposer/Canceller Designated**: Proposer role assigned to authorized EOA or Safe address (replacing testnet placeholder).
- [ ] **Emergency Pause Procedure Documented**: Runbook established for Guardian role holders to execute emergency pause on `Treasury`, `CustodyVault`, `Controller`, and `P2PEscrow`.
- [ ] **Governance Recovery Procedure Documented**: Step-by-step role restoration procedure established.

---

## 3. Account Abstraction & Paymaster Security

- [ ] **Production Relayer Configured**: Dedicated Pimlico / Alchemy bundler URL configured for Base Mainnet.
- [ ] **Cloud KMS / HSM Signer Configured**: Paymaster verifying signer integrated with AWS KMS / GCP Cloud HSM (zero plaintext keys on server).
- [ ] **Paymaster Gas Limits Configured**: `maxCostPerUserOp` and `maxFeePerGasCap` calibrated for Base Mainnet gas conditions.
- [ ] **Gas Treasury Reserves Configured**: `maxRefillPerTx` (e.g. 0.5 ETH) and `dailyRefillLimit` (e.g. 2.0 ETH) configured and initial reserve funded.
- [ ] **Monitoring & Real-Time Alerting Configured**: Slack/Discord/PagerDuty webhooks configured for low EntryPoint deposit and low Gas Treasury reserve.

---

## 4. Smart Contract Deployment & Verification

- [ ] **Deployment Addresses Recorded**: All 22 contract addresses recorded into `constants/index.ts` under `DEPLOYED_CONTRACTS_MAINNET`.
- [ ] **Contract Source Verification on BaseScan**: All deployed contracts verified with standard Solidity compiler settings (`v0.8.24`, `via-ir: false`, `optimizer runs: 200`).
- [ ] **UUPS Controller Implementation Initialized**: Proxy implementation contract deployed and initialized with `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE`.
- [ ] **Protocol Directory Module Registry Synced**: All core modules registered and directory frozen or governed.

---

## 5. Frontend & Security Pre-Flight Validation

- [ ] **Frontend Production Build Verified**: `pnpm --filter @unifyvault/web-v2 build` compiles 46/46 pages with zero errors.
- [ ] **TypeScript Typecheck Green**: `pnpm --filter @unifyvault/web-v2 typecheck` exits with 0 errors.
- [ ] **Frontend Vitest Suite Green**: `pnpm --filter @unifyvault/web-v2 test` passes 100% of tests.
- [ ] **Foundry Protocol Suite Green**: `forge test` passes 100% of test suites.
- [ ] **Zero Hardcoded Secrets Verified**: Confirmed zero private keys, mnemonics, or testnet secrets committed in repository.
- [ ] **Final Security Review Complete**: Protocol invariants, circuit breakers, and fee boundaries verified by core security team.
