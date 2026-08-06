# Architecture Freeze Signoff — UnifyVault V2

> **Phase**: Phase 2 — Mainnet Readiness & Deployment Validation  
> **Status**: APPROVED & FROZEN  
> **Solidity Compiler**: `0.8.24`  
> **EVM Version**: `cancun`  
> **Optimization**: `200 runs` (`via_ir = true`)

---

## 1. Executive Summary

This document formalizes the architectural freeze for UnifyVault V2 prior to production deployment on Base Mainnet. No new features, interface modifications, or storage layout changes will be accepted following this signoff.

---

## 2. Immutable Contract Architecture

UnifyVault V2 strictly enforces an **immutable non-proxy design pattern**.

- **Zero Upgradeability Proxies**: Core protocol logic is executed directly via deployed bytecode without ERC-1967, UUPS, Transparent, or Beacon proxy layers.
- **Permanent Logic Lock**: Contract behavior cannot be mutated or upgraded. Any protocol enhancement requires deploying a new instance and initiating an explicit governance migration.
- **Directory-Based Modularity**: Inter-module interaction is routed via `ProtocolDirectory` using immutable key lookups.

---

## 3. ProtocolDirectory Module Identifier Mapping (`ModuleIds.sol`)

All module identifiers are hardcoded as constant `bytes32` hashes:

| Module Identifier               | Constant Name                 | Byte32 Keccak-256 Hash                                               | Target Contract        |
| :------------------------------ | :---------------------------- | :------------------------------------------------------------------- | :--------------------- |
| `keccak256("OracleManager")`    | `ModuleIds.ORACLE`            | `0x07f152d80bc7754d92a0d1d6a69efae353ab20ef57cb34a747b0e1b6fce3b821` | `OracleManager`        |
| `keccak256("CustodyVault")`     | `ModuleIds.VAULT`             | `0xb8b4b1a45749f7b14dd1aa9670f5e1adbf5499a0937a5f36e520ebdfce92c5bd` | `CustodyVault`         |
| `keccak256("Treasury")`         | `ModuleIds.TREASURY`          | `0xcbeb161e8ea96a5873162a0fd518199fd93272f2444a6f7191d748e55e94acc6` | `Treasury`             |
| `keccak256("IndexToken")`       | `ModuleIds.TOKEN`             | `0x89bf59bb46fa270cecaaa8ca149ec60424558564a2f8c5b8b9b4f91030e8c757` | `UVBTCETHToken`        |
| `keccak256("Governance")`       | `ModuleIds.GOVERNANCE`        | `0xbe19001b63dd100e4e5e4fb06fa48f869151e2b58e658097b66723223be7fb69` | `UnifyVaultTimelock`   |
| `keccak256("DepositManager")`   | `ModuleIds.DEPOSIT_MANAGER`   | `0x51c5dc328328c68ff84fa93437190d6350f49a4f6a964e5264b3ef1d5ff7a9aa` | `UnifyVaultController` |
| `keccak256("RedeemManager")`    | `ModuleIds.REDEEM_MANAGER`    | `0xa1fbcbcbc6e969d7b4202353724c3df7ef0b19d45366bd211eef2a875a6c3dd8` | `UnifyVaultController` |
| `keccak256("StrategyManager")`  | `ModuleIds.STRATEGY_MANAGER`  | `0xe84ef1db81f6925ea45187e1a3bc8c3e8a4a7536aa7d3fbcf4e2f9d6c2ef50f4` | `StrategyManager`      |
| `keccak256("PortfolioManager")` | `ModuleIds.PORTFOLIO_MANAGER` | `0x550d5366c888e2c244c062ca19fa10705a6104dbe82bf0629a43a0d13543dcd7` | `PortfolioManager`     |
| `keccak256("SwapAdapter")`      | `ModuleIds.SWAP_ADAPTER`      | `0x64e0ee741ad7ed9ff7728ef23e20eecbf4529db8ef421b0dc5faecf8d9b15809` | `SwapAdapter`          |
| `keccak256("LiquidityManager")` | `ModuleIds.LIQUIDITY_MANAGER` | `0x0f2b3ec2a8c3d9ef9602f37cbb1f6f8bb151e4bb252ae8cf36e2f1db12e9b08f` | `LiquidityManager`     |
| `keccak256("FeeManager")`       | `ModuleIds.FEE_MANAGER`       | `0x4bc8d7b3ad295328bd56f2d2424cfceefb6b060d4b9ddbdcfb3b9b4f98108422` | `FeeManager`           |

---

## 4. Role Hierarchy Freeze (`AccessRoles.sol`)

Role-Based Access Control (RBAC) enforces strict authorization boundaries across all modules:

```
                  ┌──────────────────────────────┐
                  │      Safe Multisig (4/7)     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │     UnifyVaultTimelock       │
                  │   (Min Delay: 48 Hours)      │
                  └──────────────┬───────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│DEFAULT_ADMIN │         │GUARDIAN_ROLE │         │PAUSER_ROLE   │
│  (Timelock)  │         │ (Multisig)   │         │ (Guardian)   │
└───────┬──────┘         └──────────────┘         └──────────────┘
        │
        ├────────────────────────┬────────────────────────┐
        ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│CONTROLLER_   │         │STRATEGIST_   │         │BOT_ROLE      │
│ROLE          │         │ROLE          │         │(Keeper Bot)  │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Role Definitions

1. `DEFAULT_ADMIN_ROLE` (`0x00`): Granted exclusively to `UnifyVaultTimelock`. Controls role assignments and administrative parameter updates.
2. `GOVERNANCE_ROLE` (`keccak256("GOVERNANCE_ROLE")`): Managed via Timelock. Can update `ProtocolDirectory` records.
3. `GUARDIAN_ROLE` (`keccak256("GUARDIAN_ROLE")`): Granted to Security Multisig. Can trigger immediate emergency pause.
4. `PAUSER_ROLE` (`keccak256("PAUSER_ROLE")`): Assigned to automated circuit breakers and Guardians to pause operations.
5. `CONTROLLER_ROLE` (`keccak256("CONTROLLER_ROLE")`): Held by `UnifyVaultController` to mint shares, withdraw assets, and collect fees.
6. `STRATEGIST_ROLE` (`keccak256("STRATEGIST_ROLE")`): Held by Strategy Multisig to execute rebalances.
7. `BOT_ROLE` (`keccak256("BOT_ROLE")`): Held by Keeper bots for routine maintenance tasks.

---

## 5. Verification Signoff

- [x] Solidity ABI Locked
- [x] Storage Layout Sealed
- [x] ProtocolDirectory Module IDs Frozen
- [x] Role Hierarchy Confirmed
