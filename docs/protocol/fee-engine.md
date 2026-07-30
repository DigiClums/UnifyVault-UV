---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Protocol Fee Engine & Performance Settlement

This document specifies the fee calculations, and protocol fee calculations in **UnifyVault V2**.

---

## 🧮 1. Fee Mathematical Specification

### Deposit Protocol Fee ($F_{dep}$)

$$F_{dep} = \frac{\text{DepositAmount} \times \text{depositFeeBps}}{10000}$$
$$\text{NetDeposit} = \text{DepositAmount} - F_{dep}$$

### Redemption Protocol Fee ($F_{red}$)

$$F_{red} = \frac{\text{GrossPayout} \times \text{redeemFeeBps}}{10000}$$

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
