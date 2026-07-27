# UnifyVault v2.2.0 Production Deployment Guide

> [!IMPORTANT]
> This guide outlines the exact, step-by-step procedure for deploying the UnifyVault v2.2.0 smart contract suite and web application to Base Mainnet (Chain ID 8453) or Base Sepolia Testnet (Chain ID 84532).

---

## 1. Prerequisites

### 1.1 Tooling & Environment

- **Solidity Framework**: Foundry / Forge (`>=0.2.0`)
- **Node.js**: `v18.x` or `v20.x` LTS
- **Package Manager**: `pnpm >= 9.0.0`
- **RPC Endpoints**: Base Mainnet RPC (`https://mainnet.base.org` or Alchemy/Infura node)
- **Explorer API**: Basescan API Key for contract verification

### 1.2 Required Keyring & Wallets

- `DEPLOYER_PRIVATE_KEY`: Key with Base ETH for contract deployment & initialization.
- `PROTOCOL_TIMELOCK` / `GOVERNANCE_MULTISIG`: Multisig address (e.g. Safe 3-of-5) receiving Ownership & Admin roles.
- `FEE_TREASURY`: Multisig address designated to receive protocol fees and performance fee settlements.

---

## 2. Smart Contract Deployment Order

Deploy contracts sequentially using Forge scripts in `script/DeployV2.s.sol`:

```bash
# 1. Simulate Deployment
forge script script/DeployV2.s.sol:DeployV2Script \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### Deployment Sequence

1. **`ProtocolDirectory`**: Central registry for resolving system contract addresses.
2. **`VaultStorage` & `UnifyVault` (ERC-20 Shares)**: Index share minting/burning contract (`UVBTCETH`).
3. **`CostBasisManager`**: Tracking user cost basis & entry NAV.
4. **`HighWaterMarkManager`**: Tracking historical High-Water Marks per user for performance fee calculation.
5. **`FeeManager`**: Handling 0.25% deposit/redeem protocol fees and 5.0% performance fees above HWM (`UVIP-001`).
6. **`OracleManager`**: Aggregating Chainlink price feeds (`BTC/USD`, `ETH/USD`, `USDC/USD`).
7. **`SwapAdapter` & `LiquidityManager`**: Decentralized exchange router integration and liquidity buffer management.
8. **`StrategyManager`**: Managing target strategy weights (50% cbBTC / 50% WETH).
9. **`UnifyControllerV2`**: Core execution engine governing deposit, redeem, rebalance, and fee settlement flows.
10. **Directory Registration**: Register all contract address hashes into `ProtocolDirectory`.
11. **Ownership Transfer**: Transfer `owner` role of all managers to `GOVERNANCE_MULTISIG`.

---

## 3. Contract Verification

Verify all deployed bytecode on Basescan:

```bash
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.24 \
  <DEPLOYED_ADDRESS> \
  src/<CONTRACT_NAME>.sol:<CONTRACT_NAME> \
  --etherscan-api-key $BASESCAN_API_KEY
```

---

## 4. Web Application Deployment (Next.js)

### 4.1 Environment Configuration

Configure production environment variables in host provider (Vercel, Netlify, or Cloudflare Pages):

```env
NEXT_PUBLIC_ACTIVE_CHAIN=base-mainnet
NEXT_PUBLIC_RPC_URL_BASE_MAINNET=https://mainnet.base.org
NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET=<DEPLOYED_PROTOCOL_DIRECTORY_ADDRESS>
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<YOUR_WALLET_CONNECT_PROJECT_ID>
NEXT_PUBLIC_BASESCAN_API_KEY=<YOUR_BASESCAN_API_KEY>
```

### 4.2 Build & Deployment Command

```bash
# Clean install & production build
pnpm install --frozen-lockfile
pnpm --filter @unifyvault/web build
```

---

## 5. Post-Deployment Verification & Smoke Tests

Execute initial on-chain smoke tests:

1. **Oracle Read Test**: Verify `OracleManager.getLatestPrices()` returns valid, non-zero prices for BTC/USD and ETH/USD.
2. **Directory Resolution**: Verify `ProtocolDirectory.getContractAddress(hash)` returns correct addresses for all 10 modules.
3. **Small Test Deposit**: Execute a 10 USDC test deposit through `UnifyControllerV2.deposit()`. Verify shares minted and cost basis recorded.
4. **Small Test Redeem**: Execute a test redemption through `UnifyControllerV2.redeem()`. Verify USDC returned and fees accounted for.

---

## 6. Emergency & Rollback Procedures

If an anomaly is detected post-launch:

### 6.1 Pause Deposits & Redemptions

The Emergency Sentinel or Governance Multisig can instantly pause the protocol:

```bash
cast send <CONTROLLER_ADDRESS> "pause()" --private-key $SENTINEL_PRIVATE_KEY --rpc-url $BASE_MAINNET_RPC
```

### 6.2 Emergency Withdrawal

In extreme emergency scenarios, users can redeem collateral directly via `VaultStorage.emergencyWithdraw()` bypassing strategy swaps.
