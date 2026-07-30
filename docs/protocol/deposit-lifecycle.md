---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Deposit Lifecycle & Execution Mechanics

This document provides a comprehensive analysis of the live deposit lifecycle in **UnifyVault V2**, detailing every step from user input validation to share minting.

---

## 🔄 1. Deposit Sequence Overview

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Controller as UnifyVaultController
    participant Oracle as OracleManager
    participant Treasury as Treasury
    participant Swap as SwapAdapter
    participant Vault as CustodyVault
    participant Token as UVBTCETHToken

    User->>Controller: deposit(USDC, amount, minSharesOut, receiver)

    note over Controller: Step 1: Pre-Execution Validation
    Controller->>Controller: Check not paused, amount > 0, receiver != address(0)
    Controller->>Oracle: isPriceFresh(USDC) & getAssetPrice(USDC)

    note over Controller: Step 2: Collateral & Fee Routing
    Controller->>Controller: Pull full collateral (amount USDC) from User
    Controller->>Treasury: Collect Deposit Fee (0.25% USDC)

    note over Controller: Step 3: Multi-Asset Strategy Swaps
    Controller->>Swap: Swap USDC -> cbBTC (60% weight)
    Controller->>Swap: Swap USDC -> WETH (40% weight)

    note over Controller: Step 4: Custody & Accounting
    Controller->>Vault: deposit(cbBTC, Controller, amountBTC)
    Controller->>Vault: deposit(WETH, Controller, amountETH)
    Controller->>Token: mint(receiver, sharesToMint)
    Controller->>CBM: recordDeposit(receiver, netDeposit, sharesToMint)

    note over Controller: Step 5: Invariant Check
    Controller->>Controller: Assert IERC20(USDC).balanceOf(Controller) == 0
    Controller-->>User: DepositCompleted & DepositExecuted events
```

---

## 🛡️ 2. Validation & Safety Guards

1. **Price Staleness Verification**: `OracleManager.isPriceFresh(asset)` verifies Chainlink heartbeat timestamps before taking funds.
2. **Single-Pull Transfer Security**: Full collateral is pulled in a single `safeTransferFrom` to prevent double-spend or allowance race conditions.
3. **Slippage Bounds**: Enforces `sharesToMint >= minSharesOut` and individual swap output bounds `minAmountOut`.
4. **Zero-Retained Balance**: Asserts that `UnifyVaultController` balance is exactly 0 at execution end.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
