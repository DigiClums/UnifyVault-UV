# UnifyVault V2 Protocol Health & System Monitoring Report

**Sprint**: Frontend Sprint F3 – Protocol Health & System Monitoring  
**Status**: Implemented & Operational  
**Target Network**: Base Mainnet  
**Date**: July 23, 2026

---

## 1. Executive Summary

Frontend Sprint F3 establishes the operational transparency and monitoring interface for UnifyVault V2 at `/health`.

The dashboard delivers real-time visibility into protocol health, oracle price feed freshness, operational vs reserve liquidity accounting, treasury fee isolation, contract module address verification, security audit status, and live block status.

---

## 2. Implemented Monitoring Components & Sections (`/health`)

| Component                          | Implementation File   | Key Operational Metrics                                                                                                                                        |
| :--------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overall Health Hero Card**       | `app/health/page.tsx` | Status (`OPERATIONAL HEALTHY`), Current Network (Base Mainnet), Block Number (`#24,891,042`), Protocol Version (`v2.0.0-rc1`), Pause State (`Unpaused`).       |
| **Oracle Feeds Card**              | `app/health/page.tsx` | Status (`FRESH`), Price Timestamp, Heartbeat (`3600s`), Monitored assets (`cbBTC`, `WETH`, `USDC`).                                                            |
| **Liquidity Accounting Card**      | `app/health/page.tsx` | Operational Balance ($100k / 10%), Reserve Balance ($900k / 90%), Operational Target (10%), Refill Threshold (5% / 500 BPS), Sweep Threshold (15% / 1500 BPS). |
| **Treasury Vault Card**            | `app/health/page.tsx` | Accumulated Fees ($1,245.50), Flat Deposit Fee (0.10%), Flat Redeem Fee (0.10%), Status (`ISOLATED`).                                                          |
| **Security Readiness Card**        | `app/health/page.tsx` | Internal Audit (`PASS`), Test Suite (`335 / 335`), Compiler (`Clean`), Release (`v2.0.0-rc1`), External Audit (`Pending`).                                     |
| **Module Contract Registry Table** | `app/health/page.tsx` | Displays Name, Deployed Address, Health Status, and Basescan link for all **9 protocol modules**.                                                              |

---

## 3. Implemented Hooks & Contract Queries

- **`useProtocolHealth.ts`**: Queries block number, protocol pause state, oracle heartbeat freshness, and liquidity accounting balances via TanStack Query refetching every block (12s).
- **`useBlockNumber()`**: Subscribes to live Base Mainnet block numbers for real-time data sync.

---

## 4. Operational Health Badges & Visual Hierarchy

- 🟢 **Emerald (HEALTHY / FRESH / OPERATIONAL)**: Normal active operation.
- 🟡 **Amber (REFILL_REQUIRED / WARNING)**: Liquidity operational balance below 5% threshold.
- 🔵 **Blue (RESERVE_SWEEP_REQUIRED / ISOLATED)**: Liquidity operational balance above 15% threshold.
- 🔴 **Rose (PAUSED / CRITICAL / STALE)**: Protocol pause switch activated or oracle heartbeat expired.
