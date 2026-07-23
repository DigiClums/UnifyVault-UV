# UnifyVault V2 Governance Dashboard & Admin Console Report

**Sprint**: Frontend Sprint F4 – Governance Dashboard & Admin Console  
**Status**: Implemented & Operational  
**Target Network**: Base Mainnet  
**Date**: July 23, 2026

---

## 1. Executive Summary

Frontend Sprint F4 implements the governance dashboard and admin console for UnifyVault V2 at `/governance`.

The interface features access-controlled governance management, role detection (`DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, `GUARDIAN_ROLE`, `CONTROLLER_ROLE`), emergency pause controls, liquidity refill/sweep execution, strategy weight allocation manager with 10,000 BPS invariant validation, treasury monitoring, oracle feed overview, and audit activity logging.

---

## 2. Implemented Governance Features & Sections (`/governance`)

| Feature / Section            | Implementation File       | Functionality & Access Control                                                                                                                                                                                                  |
| :--------------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Role Verification Badges** | `app/governance/page.tsx` | Automatically checks connected wallet against protocol access roles (`DEFAULT_ADMIN_ROLE`, `GOVERNANCE_ROLE`, `GUARDIAN_ROLE`). Displays `🔒 Read-Only Mode` badge and disables execution controls for non-privileged accounts. |
| **Emergency Pause Controls** | `app/governance/page.tsx` | Guardian and Governance role holders can trigger emergency pause (`Pause Protocol`) or resume operations (`Unpause Protocol`) via modal confirmation.                                                                           |
| **Liquidity Operations**     | `app/governance/page.tsx` | Governance role holders can manually trigger `Execute Refill` (when operational balance drops below 5%) or `Execute Sweep` (when operational balance exceeds 15%).                                                              |
| **Strategy Weight Manager**  | `app/governance/page.tsx` | Allows governance to adjust target weights (cbBTC BPS + WETH BPS). Validates that total allocation equals **exactly 10,000 BPS (100.00%)** before enabling update submission.                                                   |
| **Governance Activity Log**  | `app/governance/page.tsx` | Transaction log displaying recent governance actions, executors, timestamps, status, and Basescan links.                                                                                                                        |

---

## 3. Implemented Hooks & Role Verification (`hooks/`)

- **`useGovernance.ts`**: Evaluates connected Web3 wallet permissions against contract role hashes and provides access flags (`isAdmin`, `isGovernance`, `isGuardian`, `isReadOnly`).

---

## 4. Security & Confirmation Controls

- **Multi-Step Confirmation**: All privileged actions (Emergency Pause, Refill, Sweep, Strategy Weight Update) require:
  1. Interactive confirmation button.
  2. Wallet signature trigger.
  3. `TransactionModal` execution lifecycle.
  4. Confirmed transaction receipt & Basescan explorer link.
