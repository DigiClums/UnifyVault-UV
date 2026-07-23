# UnifyVault V2 Portfolio & Analytics Report

**Sprint**: Frontend Sprint F2 – Portfolio & Analytics  
**Status**: Implemented & Integrated  
**Target Network**: Base Mainnet  
**Date**: July 23, 2026

---

## 1. Executive Summary

Frontend Sprint F2 delivers a deep, institutional-grade portfolio and analytics experience for UnifyVault V2 across `/dashboard` and `/portfolio`.

The implementation builds upon the F0 architecture and F1 Web3 core user experience, featuring interactive Recharts visualization, real-time NAV tracking, strategy asset breakdown (60% cbBTC / 40% WETH), user position performance metrics, recent activity tracking, and auto-refresh polling.

---

## 2. Implemented Pages & Features

| Route        | Implementation File      | Key Features                                                                                                                                                                                             |
| :----------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard` | `app/dashboard/page.tsx` | Enhanced dashboard featuring Portfolio Value (USD), Unrealized PnL, Average Entry NAV ($1.0000), Current NAV, Share Price, Total Shares Owned, Estimated Redeem Value, TVL, and NAV Area Chart.          |
| `/portfolio` | `app/portfolio/page.tsx` | Full portfolio breakdown page featuring Donut Allocation Chart, NAV & TVL Area Charts (24H, 7D, 30D, ALL), User Position Performance Banner, Custody Strategy Holdings Table, and Recent Activity Table. |

---

## 3. Data Visualization & Charts (`components/charts/`)

1. **`AllocationChart.tsx`**: Donut chart segmenting target strategy allocation (60% cbBTC, 40% WETH) with interactive hover legends and USD valuations.
2. **`NAVHistoryChart.tsx`**: Area chart visualizing historical NAV per share performance over selected timeframes (`24H`, `7D`, `30D`, `ALL`).
3. **`TVLHistoryChart.tsx`**: Area chart visualizing total protocol value locked over time.

---

## 4. Performance & Auto-Refresh Queries

- **Block-Time Refetch Polling**: TanStack Query refetches protocol NAV, TVL, and user balances aligned with 12s block intervals.
- **Last Updated Indicator**: Displays real-time timestamp indicator ("Updated: HH:MM:SS AM/PM") informing users of data freshness.
- **Cache Invalidation**: Confirmed transactions immediately trigger cache invalidation for `['nav']`, `['portfolio']`, and `['userBalances']`.

---

## 5. User Position & Performance Metrics

- **Current Position Value**: Calculated as `sharesBalance * navPerShare`.
- **Unrealized Gain / Loss**: Calculated as `currentPositionValue - (sharesBalance * avgEntryNAV)`.
- **Estimated Redeem Value**: Calculated as `currentPositionValue * (1 - protocolRedeemFee)`.
- **Custody Asset Breakdown**: Tables display physical asset balances (`cbBTC`, `WETH`) held in `CustodyVault` alongside target basis points (6000 BPS / 4000 BPS).
