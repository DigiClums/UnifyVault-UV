# UnifyVault Architecture Freeze Document

This document records the official, immutable architectural decisions locked by the engineering review board for the UnifyVault Protocol V1 release.

---

## 1. Locked Decisions Index

| Component                     | Status     | Architectural Rationale                                                                                                                                                |
| :---------------------------- | :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo structure**        | **LOCKED** | Standardized Turborepo monorepo with `apps/`, `packages/`, `services/`, and `infra/` workspaces.                                                                       |
| **Backend consolidation**     | **LOCKED** | Merged individual microservices into a single modular NestJS monolith service (`@unifyvault/api`) to minimize connection pooling and deployment footprints.            |
| **Frontend structure**        | **LOCKED** | Twin Angular clients (`apps/web` and `apps/admin`) utilizing Tailwind CSS, Angular Signals, and centralized state architectures.                                       |
| **Solidity boundary layers**  | **LOCKED** | Segregated boundary interfaces under `src/interfaces/`, domain-specific custom types under `src/types/`, and namespaced storage structures under `src/libraries/`.     |
| **Access control model**      | **LOCKED** | Decoupled external validation in favor of contract-local inheritance of OpenZeppelin's `AccessControl` library to reduce transaction execution gas.                    |
| **Oracle coordinator design** | **LOCKED** | Splitting functions between individual provider adapters (`IOracleProvider`) and a main valuation coordinator (`IOracle`) to handle heartbeats and provider fallbacks. |
| **Upgradeability model**      | **LOCKED** | UUPS upgradeable proxies (`ERC-1967`) implemented for the transaction coordinator and vaults, backed by multi-sig governance timelocks.                                |
| **Database & Cache layer**    | **LOCKED** | PostgreSQL as the primary analytical DB, Prisma as ORM, and Redis for caching oracle price indexes.                                                                    |

---

## 2. Structural Dependencies & Boundaries

The dependency graph remains unidirectional to prevent circular loops:
`Interfaces` ➔ `Types` ➔ `Libraries` ➔ `Core Contracts` ➔ `Services (NestJS)` ➔ `Web Clients (Angular)`.

---

## 3. Product & Governance Core Parameters

- **Registry Directory:** Dynamic address resolver (`ProtocolDirectory`) is used to manage upgrade target swaps.
- **Pause Guards:** Access controls define `GUARDIAN_ROLE` to pause Controller deposit/redemptions in the event of anomalies.
