---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# NestJS API Gateway Specification (@unifyvault/api)

This document details the backend REST and WebSocket API gateway ([`services/api`](../../services/api)).

---

## 🏗️ 1. Architecture & Technology Stack

- **Framework**: NestJS (TypeScript)
- **Database ORM**: Prisma ORM with PostgreSQL
- **Cache**: Redis
- **Modules**:
  - `oracle`: Price feed monitoring and history.
  - `auth`: SIWE (Sign-In with Ethereum) authentication.
  - `treasury`: Revenue tracking and fee reports.
  - `nav`: Historical NAV indexing and performance calculations.
  - `analytics`: TVL, volume, and deposit/redeem metrics.
  - `protocol`: Contract address resolution and events.
  - `notifications`: Alerting and webhook dispatching.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
