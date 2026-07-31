# UnifyVault V2 — End-to-End Traceability Matrix

> **Protocol Version**: 2.0.0-RC2  
> **Status**: RC2 Deliverable #10 — Final Traceability Matrix  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## 1. Executive Summary

This Traceability Matrix establishes complete end-to-end mapping between identified security threats, smart contract controls, automated test suites, mathematical invariants, and documentation modules. This artifact enables external auditors and protocol maintainers to trace every protocol security claim directly to its underlying implementation and empirical test verification.

---

## 2. End-to-End Protocol Traceability Matrix

| Threat Category               | Primary Contract Control                                     | Automated Test Suite Reference               | Core Protocol Invariant | Documentation Reference                                                           |
| :---------------------------- | :----------------------------------------------------------- | :------------------------------------------- | :---------------------: | :-------------------------------------------------------------------------------- |
| **Donation Attack**           | NAV dynamic balance query in `CustodyVault.sol`              | `portfolioMath.test.ts`                      |  `INV-001`, `INV-003`   | [`THREAT_MODEL.md`](file:///var/www/UnifyVault-UV/docs/THREAT_MODEL.md)           |
| **First Depositor Inflation** | Genesis `$1.00/share` fallback & zero deposit revert         | `portfolioMath.test.ts` / `Controller.t.sol` |  `INV-003`, `INV-004`   | [`AUDIT_SCOPE.md`](file:///var/www/UnifyVault-UV/docs/AUDIT_SCOPE.md)             |
| **Flash-Loan Attack**         | Decentralized Chainlink/Pyth 18-decimal oracle pricing       | `OracleManager.t.sol`                        |        `INV-006`        | [`THREAT_MODEL.md`](file:///var/www/UnifyVault-UV/docs/THREAT_MODEL.md)           |
| **Oracle Manipulation**       | Heartbeat staleness checks & `try...catch` fallback routing  | `OracleManager.t.sol`                        |        `INV-006`        | [`SECURITY.md`](file:///var/www/UnifyVault-UV/docs/SECURITY.md)                   |
| **Governance Compromise**     | SafePal hardware wallet & OpenZeppelin RBAC role gating      | `UnifyVaultController.t.sol`                 |        `INV-007`        | [`SECURITY.md`](file:///var/www/UnifyVault-UV/docs/SECURITY.md)                   |
| **Reentrancy Exploitation**   | OpenZeppelin `ReentrancyGuard` (`nonReentrant`) + CEI        | `UnifyVaultController.t.sol`                 |  `INV-001`, `INV-004`   | [`SECURITY.md`](file:///var/www/UnifyVault-UV/docs/SECURITY.md)                   |
| **Precision / Rounding Loss** | 18-decimal fixed-point BigInt math (vault-favoring rounding) | `portfolioMath.test.ts`                      |        `INV-009`        | [`INVARIANTS.md`](file:///var/www/UnifyVault-UV/docs/INVARIANTS.md)               |
| **Denial of Service (DoS)**   | $O(1)$ constant time complexity per transaction              | `UnifyVaultController.t.sol`                 |        `INV-004`        | [`THREAT_MODEL.md`](file:///var/www/UnifyVault-UV/docs/THREAT_MODEL.md)           |
| **Front-Running / MEV**       | Explicit `minShares` & `minAssets` slippage parameters       | `UnifyVaultController.t.sol`                 |        `INV-004`        | [`THREAT_MODEL.md`](file:///var/www/UnifyVault-UV/docs/THREAT_MODEL.md)           |
| **Keeper Failure**            | Vault deposits/redeems operate 100% independently of keeper  | Phase 2.3 On-Chain Audit                     |        `INV-005`        | [`RUNBOOK.md`](file:///var/www/UnifyVault-UV/docs/RUNBOOK.md)                     |
| **Emergency Pause Abuse**     | `GUARDIAN_ROLE` pause; `GOVERNANCE_ROLE` separate resume     | `UnifyVaultController.t.sol`                 |        `INV-008`        | [`INCIDENT_RESPONSE.md`](file:///var/www/UnifyVault-UV/docs/INCIDENT_RESPONSE.md) |
