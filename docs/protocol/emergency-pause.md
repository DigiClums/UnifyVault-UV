---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Emergency Pause & Circuit Breaker Mechanics

This document details the emergency circuit breaker mechanism implemented across UnifyVault V2 contracts.

---

## 🚨 1. Emergency Pause Architecture

The protocol implements OpenZeppelin `Pausable` across all core execution contracts:

- `UnifyVaultController`
- `CustodyVault`
- `Treasury`
- `UVBTCETHToken`

### Role Privileges

- **Pause Execution (`emergencyPause`)**: Can be triggered immediately by `GUARDIAN_ROLE` or `GOVERNANCE_ROLE`.
- **Resume Execution (`resume`)**: Restricted exclusively to `GOVERNANCE_ROLE` (Multisig).

```mermaid
stateDiagram-v2
    [*] --> Normal
    Normal --> Paused: emergencyPause() [GUARDIAN_ROLE]
    Paused --> Normal: resume() [GOVERNANCE_ROLE]
```

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
