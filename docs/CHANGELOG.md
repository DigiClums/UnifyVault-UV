# Changelog

All notable changes to the UnifyVault protocol and web application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.2.0-rc1] - 2026-07-26

### Release Candidate 1 — Audit-Ready Backend & Production-Ready Web dApp

#### 🚀 Protocol Smart Contracts (`v2.2.0`)

- **UV-501: Cost Basis Manager (`CostBasisManager.sol`)**:
  - Implemented weighted average entry NAV tracking per user wallet.
  - Added user cost basis updates on deposit and partial/full redemptions.
- **UV-502: High-Water Mark Manager (`HighWaterMarkManager.sol`)**:
  - Added historical High-Water Mark (HWM) tracking to prevent double-charging fees on unearned gains.
- **UV-503: Profit Calculation Engine (`UVIP-001`)**:
  - Built net unrealized & realized profit valuation engine evaluating user share balance against entry NAV and HWM.
- **UV-504: Performance Fee Settlement (`FeeManager.sol`)**:
  - Integrated 5.0% performance fee deduction above High-Water Mark upon redemption.
  - Maintained 0.25% protocol deposit and 0.25% protocol redeem fee structures.
- **UV-505: Controller Integration (`UnifyControllerV2.sol`)**:
  - Integrated `CostBasisManager`, `HighWaterMarkManager`, and `FeeManager` into atomic `deposit()` and `redeem()` execution flows.
- **UV-506 & UV-507: Security Audit Package & Slither Verification**:
  - Achieved 100% test pass rate across 416 Foundry unit & invariant smart contract tests.
  - Published comprehensive audit documentation (`docs/Architecture.md`, `SECURITY.md`, `Threat_Model.md`, `Trust_Assumptions.md`, `Gas_Report.md`, `Known_Limitations.md`, `UVIP-001_Performance_Fee_Specification.md`).

#### 🎨 Web Application (`@unifyvault/web`)

- **UV-601: On-Chain Protocol Integration**:
  - Integrated live `previewDeposit()` and `previewRedeem()` contract calls.
  - Built multi-stage transaction progress modal (`Wallet Approval` $\rightarrow$ `Submitted` $\rightarrow$ `Safety Checks` $\rightarrow$ `Asset Swap` $\rightarrow$ `Shares Minted / Fee Settlement`).
- **UV-602: Investor Dashboard & Overview**:
  - Built real-time portfolio performance cards (Current Value, Total Invested, Unrealized Gain, Realized Profit, Performance Fees Paid, NAV).
  - Added Quick Actions navigation card and dynamic `ContractAddressesTable` resolution via `ProtocolDirectory`.
- **UV-603: Transaction Experience & Advanced Analytics**:
  - Built dedicated `/history` page with operation type filters, status filters, Basescan links, and CSV export.
  - Built `/analytics` page with cost basis & ROI insights, fee transparency breakdown, and portfolio allocation insights.
- **UV-604: UI/UX Polish & Accessibility**:
  - Added layout-stable skeleton loading states (`SkeletonCard`, `SkeletonTable`, `SkeletonChart`).
  - Added accessible tooltips, empty recovery states (`EmptyState`), and percentage preset amount buttons (**25%**, **50%**, **75%**, **100%**).
- **UV-605: Production QA**:
  - 100% Vitest test pass rate (118/118 tests).
  - Static site generation and build validation across all 14 app routes.

---

## [v2.1.0] - 2026-06-15

- Initial release of UnifyVault V2 index share minting, Chainlink oracle aggregation, and 50/50 cbBTC/WETH strategy manager.
