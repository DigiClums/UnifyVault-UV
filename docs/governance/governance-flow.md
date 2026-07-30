---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Governance Architecture & Role Migration

This document details the governance flow, multisig administration, and role migration procedures for **UnifyVault V2**.

---

## 🏛️ 1. Governance Control Flow

Governance over UnifyVault V2 is exercised by a Safe Multisig holding `GOVERNANCE_ROLE` across all system contracts.

```mermaid
graph TD
    Multisig[Governance Multisig / Timelock] -->|updateAddress| Dir[ProtocolDirectory]
    Multisig -->|setDepositFeeBps / setRedeemFeeBps| FM[FeeManager]
    Multisig -->|setStrategy| SM[StrategyManager]
    Multisig -->|setSwapSlippageBps / resume| Ctrl[UnifyVaultController]
    Multisig -->|withdraw| Treas[Treasury]
    Multisig -->|freeze| Dir
```

---

## 🚀 2. Governance Role Migration

To transition deployment authority from deployer EOA to production Multisig:

1. Execute [`packages/protocol/script/mainnet/GrantAdminRoles.s.sol`](../../packages/protocol/script/mainnet/GrantAdminRoles.s.sol) to grant `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` to the Multisig.
2. Execute [`packages/protocol/script/mainnet/RenounceOldAdmin.s.sol`](../../packages/protocol/script/mainnet/RenounceOldAdmin.s.sol) to renounce EOA privileges.
3. Verify role assignment via [`packages/protocol/script/mainnet/VerifyGovernance.s.sol`](../../packages/protocol/script/mainnet/VerifyGovernance.s.sol).

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
