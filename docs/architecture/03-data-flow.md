---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# System Data & Execution Flows

This document details the end-to-end data and transaction flows across smart contracts, oracle price feeds, keeper services, frontend applications, and API gateways in **UnifyVault V2**.

---

## 🔄 1. End-to-End User Deposit Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Web App
    participant Ctrl as UnifyVaultController
    participant Oracle as OracleManager
    participant Treasury as Treasury
    participant Swap as SwapAdapter (Uniswap V3)
    participant Vault as CustodyVault
    participant Token as UVBTCETHToken

    User->>Web: Input Deposit (e.g. 1,000 USDC)
    Web->>Ctrl: getDepositQuote(USDC, 1000e6)
    Ctrl->>Oracle: isPriceFresh(USDC) & getAssetPrice(USDC)
    Oracle-->>Ctrl: Normalized Price (18 Decimals)
    Ctrl-->>Web: Quote (Net Deposit, Fees, Preview Shares)

    User->>Ctrl: deposit(USDC, 1000e6, minShares, receiver)
    Ctrl->>Ctrl: Transfer 1,000 USDC from User to Controller

    rect rgb(240, 248, 255)
        note over Ctrl,Treasury: Step 1: Protocol Fee Routing
        Ctrl->>Treasury: Transfer Deposit Fee (0.25% = 2.5 USDC)
    end

    rect rgb(255, 245, 238)
        note over Ctrl,Swap: Step 2: Atomic DEX Asset Swaps
        Ctrl->>Swap: Swap USDC -> cbBTC (60% allocation)
        Swap-->>Ctrl: Receive cbBTC
        Ctrl->>Swap: Swap USDC -> WETH (40% allocation)
        Swap-->>Ctrl: Receive WETH
    end

    rect rgb(240, 255, 240)
        note over Ctrl,Vault: Step 3: Collateral Custody Deposit
        Ctrl->>Vault: deposit(cbBTC, Controller, amountBTC)
        Ctrl->>Vault: deposit(WETH, Controller, amountETH)
    end

    rect rgb(255, 250, 240)
        note over Ctrl,CBM: Step 4: Share Minting & Accounting
        Ctrl->>Token: mint(receiver, sharesToMint)
        Ctrl->>CBM: recordDeposit(receiver, netDeposit, sharesToMint)
    end

    Ctrl->>Ctrl: Assert Zero Controller Balance Invariant
    Ctrl-->>User: DepositCompleted Event & Minted Shares
```

---

## 🔄 2. End-to-End User Redemption Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Ctrl as UnifyVaultController
    participant Vault as CustodyVault
    participant Swap as SwapAdapter (Uniswap V3)
    participant Treasury as Treasury
    participant Token as UVBTCETHToken

    User->>Ctrl: redeem(USDC, shares, minAssetsOut, receiver, deadline)

    rect rgb(240, 255, 240)
        note over Ctrl,Vault: Step 1: Proportional Asset Withdrawal
        Ctrl->>Vault: withdraw(cbBTC, Controller, propBTC)
        Ctrl->>Vault: withdraw(WETH, Controller, propETH)
    end

    rect rgb(255, 245, 238)
        note over Ctrl,Swap: Step 2: Atomic DEX Asset Swaps to USDC
        Ctrl->>Swap: Swap cbBTC -> USDC
        Ctrl->>Swap: Swap WETH -> USDC
    end

    rect rgb(240, 248, 255)
        note over Ctrl,Treasury: Step 3: Protocol Fee Transfer
        Ctrl->>Treasury: Transfer Redemption Fee (2.00%)
    end

    rect rgb(255, 235, 235)
        note over Ctrl,User: Step 4: Share Burning & User Payout
        Ctrl->>Token: burn(User, shares)
        Ctrl->>User: Transfer Net USDC
    end

    Ctrl->>Ctrl: Assert Zero Controller Balance Invariant
    Ctrl-->>User: RedeemCompleted Event
```

---

## 🔗 Related Documents

- [`01-overview.md`](01-overview.md) — System Overview
- [`../protocol/deposit-lifecycle.md`](../protocol/deposit-lifecycle.md) — Deposit Lifecycle Specification
- [`../protocol/redeem-lifecycle.md`](../protocol/redeem-lifecycle.md) — Redeem Lifecycle Specification

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
