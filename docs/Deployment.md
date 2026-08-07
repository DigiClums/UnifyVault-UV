# Deployment Guide & Verification

This document specifies the exact deployment sequence, environment variables, deployment scripts, supported networks, verification processes, and post-deployment validation steps for UnifyVault V2.

---

## 1. Supported Networks

| Network Name | Chain ID | RPC URL Environment Variable | Block Explorer |
| :--- | :--- | :--- | :--- |
| **Base Mainnet** | `8453` | `BASE_MAINNET_RPC_URL` | https://basescan.org |
| **Base Sepolia** | `84532` | `BASE_SEPOLIA_RPC_URL` | https://sepolia.basescan.org |

---

## 2. Deployment Prerequisites & Environment Variables

The following environment variables must be exported prior to running deployment scripts:

```env
# RPC Node Endpoints
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Deployer & Admin Accounts
PRIVATE_KEY=0x... # Deployer private key
NEXT_PUBLIC_ADMIN_ADDRESS=0xd905920c91853039060246Ed5724AA72B91a96DA
GNOSIS_SAFE_ADDRESS=0x... # Multi-sig proposal manager for Timelock

# Etherscan / Basescan Verification API Key
BASESCAN_API_KEY=YI8JH3STSF6...
```

---

## 3. Mandatory Deployment Order

Due to strict dependency validation in contract constructors, contracts must be deployed in the following order:

```mermaid
flowchart TD
    Step1[1. Deploy ProtocolDirectory] --> Step2[2. Deploy OracleManager & ChainlinkOracleProvider]
    Step2 --> Step3[3. Deploy Treasury & FeeManager]
    Step3 --> Step4[4. Deploy CustodyVault & LiquidityManager]
    Step4 --> Step5[5. Deploy UVBTCETHToken]
    Step5 --> Step6[6. Deploy UnifyVaultTimelock 48h Delay]
    Step6 --> Step7[7. Deploy StrategyManager, PortfolioManager, & SwapAdapter]
    Step7 --> Step8[8. Deploy UnifyVaultController]
    Step8 --> Step9[9. Register Module Addresses in ProtocolDirectory]
    Step9 --> Step10[10. Grant Roles to Controller & Transfer Admin to Timelock]
```

---

## 4. Deployment Scripts

Primary deployment scripts are located in `packages/protocol/script/`:

- **`DeployV2.s.sol`**: Complete V2 protocol deployment including test tokens and mock aggregators (for testnet/staging).
- **`DeployMainnet.s.sol`**: Production deployment script for Base Mainnet utilizing real Chainlink oracle feeds and DEX routers.
- **`RegisterAndConfigureV2.s.sol`**: Helper script to register module addresses in `ProtocolDirectory`.
- **`mainnet/GrantAdminRoles.s.sol`**: Assigns `GOVERNANCE_ROLE` and `DEFAULT_ADMIN_ROLE` to `UnifyVaultTimelock`.
- **`mainnet/RenounceOldAdmin.s.sol`**: Revokes deployer permissions after governance transfer.

---

## 5. Execution Commands

### 5.1 Local Simulation (No On-Chain State Change)

```bash
cd packages/protocol
forge script script/DeployV2.s.sol:DeployV2Script
```

### 5.2 Testnet Deployment (Base Sepolia)

```bash
cd packages/protocol
forge script script/DeployV2.s.sol:DeployV2Script \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 5.3 Production Mainnet Deployment (Base Mainnet)

```bash
cd packages/protocol
forge script script/DeployMainnet.s.sol:DeployMainnetScript \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

---

## 6. Verification & Ownership Transfer

After broadcasting deployment transactions:

1. **Verify Contracts on Basescan**:
   If automatic verification failed during `forge script`, run:
   ```bash
   forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
     --chain base-sepolia \
     --watch
   ```
2. **Transfer Governance Control to Timelock**:
   Run `GrantAdminRoles.s.sol` and `RenounceOldAdmin.s.sol` to ensure the deployer account no longer possesses single-signature administrative rights.

---

## 7. Post-Deployment Checklist

- [ ] Every module address (`TREASURY`, `VAULT`, `DEPOSIT_MANAGER`, `ORACLE`, `TOKEN`, `STRATEGY_MANAGER`, `PORTFOLIO_MANAGER`, `SWAP_ADAPTER`, `LIQUIDITY_MANAGER`, `FEE_MANAGER`) registered in `ProtocolDirectory`.
- [ ] Oracles configured with active feeds and non-zero heartbeat limits.
- [ ] `CONTROLLER_ROLE` granted to `UnifyVaultController` on `CustodyVault`, `Treasury`, `UVBTCETHToken`, and `LiquidityManager`.
- [ ] Deployer `CONTROLLER_ROLE` revoked on `UVBTCETHToken`.
- [ ] Initial deposit executed to mint and burn `DEAD_SHARES` (`1000` wei).
- [ ] Frontend environment variables updated with the new `NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA` or `NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET`.
