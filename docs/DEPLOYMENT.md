# UnifyVault V2 — Protocol Deployment & Verification Guide

> **Protocol Version**: 2.0.0-RC2  
> **Status**: APPROVED (RC2 Deliverable #7)  
> **Target Network**: Base Sepolia (Testnet) / Base Mainnet (Production)  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## 1. Environment & Infrastructure Prerequisites

### 1.1 Deployment Preconditions Checklist

- [x] **Target Chain ID**: Verified (`84532` for Base Sepolia, `8453` for Base Mainnet).
- [x] **RPC Endpoint Health**: Checked (`eth_blockNumber` returning live blocks).
- [x] **Signer Wallet**: Dedicated SafePal Hardware Wallet connected (`0xd905...96DA`).
- [x] **Gas Balance**: Minimum 0.2 ETH gas reserve available in deployer account.
- [x] **Environment Variables**: Verified in `.env`.
- [x] **No Active Pause**: Verified `paused() == false` on existing deployment.

### 1.2 Required Environment Variables (`.env`)

```bash
# Network RPC Endpoints
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Deployer & Governance Credentials
DEPLOYER_PRIVATE_KEY=0x...
GOVERNANCE_ADMIN_ADDRESS=0xd905920c91853039060246Ed5724AA72B91a96DA

# Verification & Explorer API Keys
BASESCAN_API_KEY=...
```

---

## 2. Deterministic Deployment Sequence

The protocol MUST be deployed in exact sequential order using Foundry scripts (`packages/protocol/script/`):

```
+-----------------------------------------------------------------------+
| 1. DEPLOY PROTOCOL DIRECTORY                                          |
|    - Deploy ProtocolDirectory.sol                                     |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 2. DEPLOY CORE INFRASTRUCTURE MODULES                                 |
|    - Deploy CustodyVault.sol                                          |
|    - Deploy UVBTCETHToken.sol ($uvBTCETH)                             |
|    - Deploy Treasury.sol                                              |
|    - Deploy OracleManager.sol                                         |
|    - Deploy StrategyManager.sol                                       |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 3. DEPLOY UNIFYVAULT CONTROLLER                                       |
|    - Deploy UnifyVaultController.sol                                  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 4. DIRECTORY REGISTRATION & RBAC ROLE GATING                          |
|    - Register module addresses in ProtocolDirectory.sol               |
|    - Grant CONTROLLER_ROLE to UnifyVaultController on CustodyVault    |
|    - Grant CONTROLLER_ROLE to UnifyVaultController on Token           |
|    - Grant GOVERNANCE_ROLE & GUARDIAN_ROLE to SafePal/Multi-Sig       |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 5. ORACLE & STRATEGY INITIALIZATION                                   |
|    - OracleManager.configureAsset(WBTC, primaryProvider, 86400)       |
|    - OracleManager.configureAsset(WETH, primaryProvider, 86400)       |
|    - StrategyManager.setTargetWeights([WBTC, WETH], [5000, 5000])     |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 6. CONTRACT VERIFICATION & SMOKE TESTS                                |
|    - Verify contracts on BaseScan via forge verify-contract           |
|    - Execute initial configurable 10 USDC smoke deposit & redeem      |
+-----------------------------------------------------------------------+
```

---

## 3. Active Deployment Registry Table

### Base Sepolia Testnet Contracts (Active)

| Contract Module            | Deployed Address                                                                                                                | Contract Verification Status |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :--------------------------: |
| **`ProtocolDirectory`**    | [`0xB5dd6d766867cB4c299AD2711068455C718EDDbc`](https://sepolia.basescan.org/address/0xB5dd6d766867cB4c299AD2711068455C718EDDbc) |         **VERIFIED**         |
| **`UnifyVaultController`** | [`0x7EF5D93f83995228efFc63dbe513367a719f0633`](https://sepolia.basescan.org/address/0x7EF5D93f83995228efFc63dbe513367a719f0633) |         **VERIFIED**         |
| **`CustodyVault`**         | [`0x54696d5d00b58F27F9d8C358560ff2a7d10d409e`](https://sepolia.basescan.org/address/0x54696d5d00b58F27F9d8C358560ff2a7d10d409e) |         **VERIFIED**         |
| **`Treasury`**             | [`0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D`](https://sepolia.basescan.org/address/0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D) |         **VERIFIED**         |
| **`OracleManager`**        | [`0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635`](https://sepolia.basescan.org/address/0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635) |         **VERIFIED**         |
| **`UVBTCETHToken`**        | [`0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4`](https://sepolia.basescan.org/address/0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4) |         **VERIFIED**         |
| **`StrategyManager`**      | [`0x36b02ef54B06527c2fE6028C51A3DF7e4EF7b9b0`](https://sepolia.basescan.org/address/0x36b02ef54B06527c2fE6028C51A3DF7e4EF7b9b0) |         **VERIFIED**         |

_Note: Base Mainnet contracts are pending post-audit launch._

---

## 4. Post-Deployment Validation & Acceptance Criteria

| Validation Check      | Execution Command                                          | Acceptance Criterion            |  Result  |
| :-------------------- | :--------------------------------------------------------- | :------------------------------ | :------: |
| **Role Verification** | `cast call 0x54696d5d... "hasRole(bytes32,address)(bool)"` | Returns `true` for Controller   | **PASS** |
| **Oracle Freshness**  | `cast call 0xB636DD8F... "isPriceFresh(address)(bool)"`    | Returns `true` for all assets   | **PASS** |
| **Smoke Deposit**     | Configurable 10 USDC Deposit transaction                   | Mints `$uvBTCETH` shares        | **PASS** |
| **Smoke Redeem**      | Pro-rata Share Redeem transaction                          | Releases exact USDC collateral  | **PASS** |
| **Rebalance Check**   | `cast call 0x36b02ef5... "checkRebalanceNeeded()(bool)"`   | Returns `false` when drift < 5% | **PASS** |

---

## 5. Verification Commands

```bash
# 1. Verify UnifyVaultController on BaseScan
forge verify-contract 0x7EF5D93f83995228efFc63dbe513367a719f0633 \
  src/controller/UnifyVaultController.sol:UnifyVaultController \
  --chain-id 84532 --etherscan-api-key $BASESCAN_API_KEY

# 2. Check Controller Role on CustodyVault
cast call 0x54696d5d00b58F27F9d8C358560ff2a7d10d409e \
  "hasRole(bytes32,address)(bool)" 0x636f6e74726f6c6c65725f726f6c650000000000000000000000000000000000 \
  0x7EF5D93f83995228efFc63dbe513367a719f0633 --rpc-url $BASE_SEPOLIA_RPC_URL

# 3. Check Oracle Price Freshness
cast call 0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635 \
  "isPriceFresh(address)(bool)" 0x4200000000000000000000000000000000000006 \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## 6. Deployment Rollback & Disaster Recovery Reference

- **Deployment Step Failure**: If any deployment step fails, execution halts immediately. Un-registered contracts are safe because they lack `CONTROLLER_ROLE` permissions.
- **Disaster Recovery**: Severe operational incidents post-deployment are handled according to [`docs/INCIDENT_RESPONSE.md`](file:///var/www/UnifyVault-UV/docs/INCIDENT_RESPONSE.md).
