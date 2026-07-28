# UnifyVault v2.2.0 Production Deployment Guide

> [!IMPORTANT]
> This guide outlines the institutional procedure for deploying the UnifyVault v2.2.0 smart contract suite to Base Mainnet (Chain ID 8453) or Base Sepolia Testnet (Chain ID 84532) using **encrypted keystores or hardware wallets**. Raw plaintext private keys are prohibited for production operations.

---

## 1. Prerequisites & Secure Key Management

### 1.1 Tooling & Environment

- **Solidity Framework**: Foundry / Forge (`>=0.2.0`)
- **Node.js**: `v18.x` or `v20.x` LTS
- **Package Manager**: `pnpm >= 9.0.0`
- **RPC Endpoints**: Base Mainnet RPC (`https://mainnet.base.org` or Alchemy/Infura node)
- **Explorer API**: Basescan API Key for contract verification

### 1.2 Encrypted Keystore & Hardware Wallet Setup

For security hardening, NEVER store plaintext private keys in `.env` files. Use one of the two institutional setups below:

#### Option A: Encrypted Cast Keystore (Recommended for CLI scripts)

Import your deployer key into an encrypted local keystore once:

```bash
# Import private key into encrypted keystore named 'unify-deployer':
cast wallet import unify-deployer --private-key <YOUR_PRIVATE_KEY>
```

#### Option B: Hardware Wallet (Ledger / Trezor)

Connect your Ledger device via USB and unlock the Ethereum application.

---

## 2. Secure Smart Contract Deployment

Deploy contracts using Forge scripts with encrypted account or hardware wallet:

```bash
# Deployment using Encrypted Keystore (prompts securely for password):
forge script script/DeployV2.s.sol:DeployV2Script \
  --rpc-url $BASE_MAINNET_RPC \
  --account unify-deployer \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv

# OR Deployment using Ledger Hardware Wallet:
forge script script/DeployV2.s.sol:DeployV2Script \
  --rpc-url $BASE_MAINNET_RPC \
  --ledger \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### Deployment Sequence

1. **`ProtocolDirectory`**: Central registry for resolving system contract addresses.
2. **`CustodyVault` & `UVBTCETHToken`**: Index share minting/burning contract (`UVBTCETH`).
3. **`CostBasisManager`**: Tracking user cost basis & entry NAV.
4. **`Treasury`**: Protocol-owned fee revenue safeguard contract.
5. **`OracleManager`**: Aggregating Chainlink price feeds (`BTC/USD`, `ETH/USD`, `USDC/USD`).
6. **`SwapAdapter` & `LiquidityManager`**: Decentralized exchange router integration and liquidity buffer management.
7. **`StrategyManager`**: Managing target strategy weights (50% cbBTC / 50% WETH).
8. **`UnifyVaultController`**: Core execution engine governing deposit, redeem, and rebalance flows.
9. **Directory Registration**: Register all contract address hashes into `ProtocolDirectory`.
10. **Governance Transfer**: Transfer `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` to the Safe Multisig address.

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

---

## 5. Governance Migration Execution (Grant, Verify, Renounce)

After deploying all contracts, execute the governance role transfer to the institutional Safe multisig using the Foundry scripts in `packages/protocol/script/mainnet/`.

### 5.1 Step 1: Grant Admin Roles

Broadcast transactions to grant `DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, and `GUARDIAN_ROLE` to the new Safe multisig and sentinel addresses:

```bash
cd packages/protocol

CONFIG_PATH="script/mainnet/config/base_sepolia.json" \
forge script script/mainnet/GrantAdminRoles.s.sol:GrantAdminRolesScript \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

For Base Mainnet, set `CONFIG_PATH="script/mainnet/config/base_mainnet.json"`.

### 5.2 Step 2: Read-Only Governance Verification

Perform read-only verification of role assignments on-chain across every contract. This step exits with a failure code if any expected role is missing:

```bash
cd packages/protocol

CONFIG_PATH="script/mainnet/config/base_sepolia.json" \
forge script script/mainnet/VerifyGovernance.s.sol:VerifyGovernanceScript \
  --rpc-url $BASE_SEPOLIA_RPC
```

### 5.3 Step 3: Renounce Old Admin Privileges

After verifying that the new Safe multisig has verified role access on-chain, renounce all privileged roles from the old deployer key:

```bash
cd packages/protocol

CONFIRM_RENOUNCE=true \
CONFIG_PATH="script/mainnet/config/base_sepolia.json" \
forge script script/mainnet/RenounceOldAdmin.s.sol:RenounceOldAdminScript \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## 6. Web Application Deployment (Next.js)

### 6.1 Environment Configuration

Configure production environment variables in host provider (Vercel, Netlify, or PM2):

```env
NEXT_PUBLIC_ACTIVE_CHAIN=base-mainnet
NEXT_PUBLIC_RPC_URL_BASE_MAINNET=https://mainnet.base.org
NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET=<DEPLOYED_PROTOCOL_DIRECTORY_ADDRESS>
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<YOUR_WALLET_CONNECT_PROJECT_ID>
```

---

## 7. Emergency Actions via Ledger / Keystore

If emergency pausing is required:

```bash
# Emergency Pause using Encrypted Keystore:
cast send <CONTROLLER_ADDRESS> "pause()" \
  --rpc-url $BASE_MAINNET_RPC \
  --account unify-sentinel

# Emergency Pause using Ledger Hardware Wallet:
cast send <CONTROLLER_ADDRESS> "pause()" \
  --rpc-url $BASE_MAINNET_RPC \
  --ledger
```
