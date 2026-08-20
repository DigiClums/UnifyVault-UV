# Deployment Guide & Verification

This document specifies the deployment sequence, environment variables, deployment scripts, supported networks, verification processes, and post-deployment validation steps for UnifyVault V2.

---

## 1. Supported Networks

| Network Name     | Chain ID | RPC URL Environment Variable | Block Explorer               |
| :--------------- | :------- | :--------------------------- | :--------------------------- |
| **Base Mainnet** | `8453`   | `BASE_MAINNET_RPC_URL`       | https://basescan.org         |
| **Base Sepolia** | `84532`  | `BASE_SEPOLIA_RPC_URL`       | https://sepolia.basescan.org |

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
GNOSIS_SAFE_ADDRESS=0x1111111111111111111111111111111111111111 # Multi-sig proposal manager for Timelock

# Etherscan / Basescan Verification API Key
BASESCAN_API_KEY=your_basescan_api_key
```

---

## 3. Mandatory Deployment Sequence

```mermaid
flowchart TD
    Step1[1. Deploy ProtocolDirectory] --> Step2[2. Deploy OracleManager & ChainlinkOracleProvider]
    Step2 --> Step3[3. Deploy Treasury & FeeManager]
    Step3 --> Step4[4. Deploy CustodyVault & LiquidityManager]
    Step4 --> Step5[5. Deploy CostBasisManagerV2 & PerformanceManager]
    Step5 --> Step6[6. Deploy UVBEV2 Token & Attach CostBasisManager Hook]
    Step6 --> Step7[7. Deploy UnifyVaultTimelock 48h Delay]
    Step7 --> Step8[8. Deploy StrategyManager, PortfolioManager, & SwapAdapter]
    Step8 --> Step9[9. Deploy UnifyVaultController]
    Step9 --> Step10[10. Deploy P2PEscrowV2 & Marketplace]
    Step10 --> Step11[11. Register Modules in ProtocolDirectory & Set Escrow Status]
    Step11 --> Step12[12. Grant Controller Roles & Transfer Admin to Timelock]
```

---

## 4. Deployment Scripts

Primary deployment scripts are located in `packages/protocol/script/`:

- **`DeployV2Production.s.sol`**: Complete V2 production deployment including `CostBasisManagerV2`, `UVBEV2`, `P2PEscrowV2`, and `Marketplace`.
- **`DeployMainnet.s.sol`**: Production deployment script for Base Mainnet utilizing real Chainlink oracle feeds and DEX routers.
- **`ReconcileBaseSepoliaState.s.sol`**: State reconciliation and configuration script for Base Sepolia testnet.
- **`mainnet/GrantAdminRoles.s.sol`**: Assigns `GOVERNANCE_ROLE` and `DEFAULT_ADMIN_ROLE` to `UnifyVaultTimelock`.
- **`mainnet/RenounceOldAdmin.s.sol`**: Revokes deployer permissions after governance transfer.

---

## 5. Execution Commands

### 5.1 Local Simulation (No On-Chain State Change)

```bash
cd packages/protocol
forge script script/DeployV2Production.s.sol:DeployV2ProductionScript
```

### 5.2 Testnet Deployment (Base Sepolia)

```bash
cd packages/protocol
forge script script/DeployV2Production.s.sol:DeployV2ProductionScript \
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

## 6. Canonical Deployment Addresses (Base Sepolia Testnet - Chain ID 84532)

| Contract Module             | Canonical Address                            |
| :-------------------------- | :------------------------------------------- |
| **ProtocolDirectory**       | `0xD2715141a0F5998B707BaA963990bFC2E94cF145` |
| **Treasury**                | `0x66182F56BD5E523c655f6890290aB519f528e83f` |
| **FeeManager**              | `0x0721465B01b586B7AAdF957A4a884acE46CfbEc9` |
| **CustodyVault**            | `0x27B5C6DEA90678B78856b0B10DBA37A789fDe97e` |
| **OracleManager**           | `0x5B6067982C6ccE2DC760EB4731c1b40136776D4A` |
| **ChainlinkOracleProvider** | `0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a` |
| **LiquidityManager**        | `0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329` |
| **UVBEV2 (UVBEToken)**      | `0xA3Db7c3DeE9A50D966A06e19b5DF4FCDee615BdE` |
| **UnifyVaultController**    | `0x07f3D3432B64DBF67c5b061AF2bC8Aef70221Cea` |
| **StrategyManager**         | `0x14058459198a2CfFc8cE89C364334a80Da82D6a3` |
| **PortfolioManager**        | `0x1C65B1667c8cC03138b8e57cDd40b0Bf28a4cDc4` |
| **SwapAdapter**             | `0xCb1a434c5ebe2F2F8672Ca507Ee819C6888ae634` |
| **CostBasisManagerV2**      | `0xF71706A2Fd8692e3C739855B2A33C0E679b4c382` |
| **PerformanceManager**      | `0x133fD024EA635694A223e66B936c2afAB4F2DB78` |
| **P2PEscrowV2**             | `0xbAc9C1b440adf74688abBD5be950ABd2766E5B7b` |
| **TimelockController**      | `0x9094145Cd2AEA2f309eDf14237444a07edF98d02` |

---

## 7. Post-Deployment Checklist

- [x] Every module address registered in `ProtocolDirectory`.
- [x] Oracles configured with active feeds and non-zero heartbeat limits.
- [x] `CONTROLLER_ROLE` granted to `UnifyVaultController` on `CustodyVault`, `Treasury`, `UVBEV2`, and `CostBasisManagerV2`.
- [x] `CostBasisManagerV2.setEscrowStatus(P2PEscrowAddress, true)` executed to isolate P2P transfers.
- [x] Initial deposit executed to mint and burn `DEAD_SHARES` (`1000` wei).
- [x] Frontend environment variables updated with canonical contract addresses.
