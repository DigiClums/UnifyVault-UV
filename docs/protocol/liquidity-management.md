---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Liquidity Management Accounting

This document details the liquidity threshold accounting and operational indicators managed by **[`LiquidityManager`](../contracts/LiquidityManager.md)**.

---

## 📊 1. Threshold Accounting Rules

`LiquidityManager` tracks two liquidity pools per strategy asset within `CustodyVault`:

- **Operational Liquidity**: Target **10.00%** (1,000 BPS), refill threshold **5.00%** (500 BPS).
- **Reserve Liquidity**: Excess sweep threshold **15.00%** (1,500 BPS).

> [!NOTE]
> `LiquidityManager` is purely an accounting and indicator module. It does NOT initiate automatic token transfers, avoiding un-sanctioned vault drains.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
