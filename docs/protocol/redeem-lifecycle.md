---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Redeem Lifecycle & Execution Mechanics

This document details the live redemption flow, asset release, DEX swap back to USDC, and performance fee settlement in **UnifyVault V2**.

---

## 🔄 1. Redemption Sequence Overview

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Controller as UnifyVaultController
    participant Vault as CustodyVault
    participant Swap as SwapAdapter
    participant Treasury as Treasury
    participant Token as UVBTCETHToken

    User->>Controller: redeem(USDC, shares, minAssetsOut, receiver, deadline)

    note over Controller: Step 1: Input & Deadline Checks
    Controller->>Controller: Check block.timestamp <= deadline, shares > 0, not paused

    note over Controller: Step 2: Proportional Asset Withdrawal
    Controller->>Vault: withdraw(cbBTC, Controller, propBTC)
    Controller->>Vault: withdraw(WETH, Controller, propETH)

    note over Controller: Step 3: Swaps back to Payout Collateral
    Controller->>Swap: Swap cbBTC -> USDC
    Controller->>Swap: Swap WETH -> USDC

    note over Controller: Step 4: Fee & Performance Settlement
    Controller->>Controller: Calculate Redemption Fee (2.00%) -> Treasury

    note over Controller: Step 5: Share Burn & User Transfer
    Controller->>Token: burn(User, shares)
    Controller->>CBM: recordRedemption(User, shares)
        Controller->>User: Transfer Net USDC

    note over Controller: Step 6: Invariant Verification
    Controller->>Controller: Assert IERC20(USDC).balanceOf(Controller) == 0
    Controller-->>User: RedeemCompleted event
```

---

## 🔒 2. Key Safeguards

1. **Deadline Protection**: Reverts `DeadlineExpired` if `block.timestamp > deadline`.
2. **Slippage Bounds**: Reverts `SlippageLimitExceeded` if net USDC returned is less than `minAssetsOut`.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
