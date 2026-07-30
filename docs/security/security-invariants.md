---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# On-Chain Security Invariants & Fuzz Properties

This document specifies the core protocol invariants verified by the Foundry test suite (`V2ProtocolInvariants.t.sol` and `EconomicAdversarial.t.sol`).

---

## 🔒 1. Protocol Invariants Catalog

### Invariant 1: Zero Retained Controller Balance

At the end of any deposit or redemption transaction, `UnifyVaultController` balance of USDC, cbBTC, and WETH must be exactly zero:
$$\text{IERC20}(\text{asset}).\text{balanceOf}(\text{Controller}) == 0$$

### Invariant 2: Total Strategy Allocation Sum

`StrategyManager` target weights must always sum to exactly 10,000 BPS:
$$\sum \text{targetWeightsBps} == 10000$$

### Invariant 3: Solvency & Backing Invariant

Total assets held in `CustodyVault` valued via `OracleManager` must be greater than or equal to backing values required for outstanding `UVBTCETHToken` share supply.

### Invariant 5: Fee Safety Caps

All fee parameters set in `FeeManager` must be strictly bounded by their hardcoded maximum caps (Deposit $\le 5\%$, Redeem $\le 5\%$, Performance $\le 20\%$).

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
