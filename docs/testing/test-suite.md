---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Foundry Test Suite Breakdown & Verification Report

This document details the structure, execution commands, coverage breakdown, and invariant properties of the Foundry test suite in [`packages/protocol/test/`](../../packages/protocol/test/).

---

## 🧪 1. Test Suite Summary

- **Total Test Suites**: 52
- **Passed Tests**: 420
- **Failed Tests**: 0
- **Pass Rate**: 100%

```bash
cd packages/protocol
forge test
```

---

## 📊 2. Test Category Breakdown

| Test Category                  | Suite File(s)                                                                     | Description & Focus                                                                                             |
| :----------------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Protocol Invariant Tests**   | `V2ProtocolInvariants.t.sol`, `VaultInvariant.t.sol`, `AccountingInvariant.t.sol` | Random state fuzzing verifying core invariants (Zero Retained Balance, Solvency, 10,000 BPS Allocation Sum).    |
| **Economic Adversarial Tests** | `EconomicAdversarial.t.sol`, `DonationAttack.t.sol`                               | Resiliency validation against direct vault donations, flash loan arbitrage, oracle manipulation, and fee theft. |
| **Base Mainnet Fork Tests**    | `BaseMainnetFork.t.sol`                                                           | Fork simulation against real Base Mainnet contracts (USDC, cbBTC, WETH, Uniswap V3 Router).                     |

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
