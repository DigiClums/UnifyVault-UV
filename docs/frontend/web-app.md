---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Next.js Web Frontend Application Architecture

This document describes the architecture, component structure, state management, and Web3 integration of the frontend application ([`apps/web`](../../apps/web)).

---

## 💻 1. Technology Stack

- **Framework**: Next.js 14 App Router (React 18, TypeScript)
- **Styling**: Tailwind CSS
- **Web3 Integration**: Wagmi v2, Viem, TanStack React Query
- **State Management**: Zustand (`useTransactionStore`, `usePreferencesStore`)
- **Icons & UI**: Lucide Icons

---

## 📂 2. Application Routes & Pages

| Route Path    | File Location             | Purpose & Functionality                                                |
| :------------ | :------------------------ | :--------------------------------------------------------------------- |
| `/`           | `app/page.tsx`            | Protocol Overview & Quick Start                                        |
| `/dashboard`  | `app/dashboard/page.tsx`  | Primary Dashboard: TVL, NAV, Wallet balance, recent activity           |
| `/deposit`    | `app/deposit/page.tsx`    | Deposit Module: Collateral input, quote preview, approval & execution  |
| `/redeem`     | `app/redeem/page.tsx`     | Redemption Module: Share burn input, payout preview, slippage settings |
| `/portfolio`  | `app/portfolio/page.tsx`  | User Portfolio & Allocation charts                                     |
| `/governance` | `app/governance/page.tsx` | Protocol Directory registry view & governance roles                    |
| `/admin`      | `app/admin/page.tsx`      | Admin controls: Emergency pause, slippage BPS, fee settings            |
| `/health`     | `app/health/page.tsx`     | System Health Monitor & Oracle heartbeat status                        |
| `/history`    | `app/history/page.tsx`    | User transaction history                                               |

---

## 🔗 3. Custom Hooks & Contract Services

- **`useDeposit`**: Manages USDC allowance check, approval execution, and `UnifyVaultController.deposit` invocation.
- **`useRedeem`**: Manages `UnifyVaultController.redeem` execution.
- **`useDepositPreview` / `useRedeemPreview`**: Real-time quote preview hook fetching from contract view functions.
- **`useProtocolHealth`**: Queries oracle freshness and pause states across modules.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
