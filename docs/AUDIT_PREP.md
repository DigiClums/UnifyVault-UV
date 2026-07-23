# UnifyVault V2 Security Audit Preparation Guide

## Overview

This guide is prepared specifically for independent security auditors reviewing UnifyVault V2. It provides a complete map of contract scopes, privileged roles, architectural assumptions, known design choices, and high-priority review targets.

---

## 1. Scope of Audit

| Contract               | Source Path                               | Compiler | Description                                 |
| :--------------------- | :---------------------------------------- | :------- | :------------------------------------------ |
| `ProtocolDirectory`    | `src/ProtocolDirectory.sol`               | `0.8.24` | Module address registry                     |
| `UnifyVaultController` | `src/controller/UnifyVaultController.sol` | `0.8.24` | Primary deposit/redeem entry point          |
| `CustodyVault`         | `src/vault/CustodyVault.sol`              | `0.8.24` | Passive custody asset vault                 |
| `LiquidityManager`     | `src/vault/LiquidityManager.sol`          | `0.8.24` | Operational/reserve liquidity accounting    |
| `Treasury`             | `src/vault/Treasury.sol`                  | `0.8.24` | Protocol fee vault                          |
| `PortfolioManager`     | `src/strategy/PortfolioManager.sol`       | `0.8.24` | Valuation & NAV calculation engine          |
| `StrategyManager`      | `src/strategy/StrategyManager.sol`        | `0.8.24` | Allocation target weights (10,000 BPS)      |
| `SwapAdapter`          | `src/swap/SwapAdapter.sol`                | `0.8.24` | DEX router adapter                          |
| `OracleManager`        | `src/oracle/OracleManager.sol`            | `0.8.24` | Price feed aggregator & heartbeat validator |
| `UVBTCETHToken`        | `src/token/UVBTCETHToken.sol`             | `0.8.24` | ERC20 vault index token                     |

---

## 2. Privilege & Access Map

- **`DEFAULT_ADMIN_ROLE`**: Admin role management.
- **`GOVERNANCE_ROLE`**: Updates strategy weights, configures oracles, executes treasury withdrawals, unpauses protocol.
- **`GUARDIAN_ROLE`**: Triggers emergency pause (`emergencyPause()`).
- **`CONTROLLER_ROLE`**: Granted to `UnifyVaultController` for calling `CustodyVault.deposit/withdraw`, `Treasury.collectFee`, and `UVBTCETHToken.mint/burn`.

---

## 3. Key Design Assumptions & Intentional Constraints

1. **No Automatic Transfers in LiquidityManager**: `LiquidityManager` tracks operational vs. reserve accounting balances and emits event signals (`RefillRequired`, `ReserveSweepRequired`). It does NOT transfer underlying funds automatically. Balance adjustments are executed via governance functions (`refillOperationalLiquidity`, `sweepReserveLiquidity`).
2. **Surplus Assets Separation**: Direct ERC20 transfers into `CustodyVault` accumulate in `surplusAssets` and are excluded from `totalAssets` to prevent donation attacks on NAV.
3. **No HotVault or ColdTreasury**: Operates entirely within `CustodyVault` and `Treasury` architecture.

---

## 4. Priority Areas for Auditor Review

1. **NAV Calculation Integrity**: Verify precision scaling and share pricing rounding in `PortfolioManager.calculateNAV()`.
2. **Zero Residual Balance Invariant**: Verify that `UnifyVaultController` cannot be left holding user or strategy funds after execution.
3. **Slippage & MEV Bounds**: Verify `minSharesOut` and `minAssetsOut` bounds in `UnifyVaultController`.
4. **Access Control Enforceability**: Verify that no unauthorized account can call `CustodyVault.withdraw()` or `UVBTCETHToken.mint()`.
