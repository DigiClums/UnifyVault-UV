---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# PortfolioManager Contract Specification

- **File Path**: [`packages/protocol/src/strategy/PortfolioManager.sol`](../../packages/protocol/src/strategy/PortfolioManager.sol)
- **Inherits**: `AccessControl`, `IPortfolioManager`
- **Compiler Version**: `0.8.24`

---

## 🎯 1. Purpose

`PortfolioManager` is the dedicated read-only Net Asset Value (NAV) engine and portfolio valuation coordinator for UnifyVault V2. It calculates the total vault USD value, share price NAV, and previews deposit mint amounts and redemption payouts.

---

## ⚙️ 2. Responsibilities

- Query underlying strategy balances from `CustodyVault`.
- Query normalized asset prices from `OracleManager`.
- Calculate Total Portfolio NAV in USD (scaled to 18 decimals).
- Calculate Share Price NAV in USD (initial NAV = $1.00 USD / `1e18`).
- Compute deposit preview shares and redemption preview payouts.

---

## 🏗️ 3. Constructor

```solidity
constructor(
    address admin,
    address directoryAddress,
    address strategyManagerAddress,
    address oracleManagerAddress,
    address custodyVaultAddress,
    address indexTokenAddress
)
```

- Validates non-zero addresses for all parameters. Grants `DEFAULT_ADMIN_ROLE` and `GOVERNANCE_ROLE` to `admin`.

---

## 📑 4. Function Reference

#### `calculateNAV() → (uint256 totalValueUSD, uint256 navPerShare)`

Calculates total portfolio value in USD and NAV per share.

- Iterates over active assets in `StrategyManager`.
- Retrieves custody balance from `CustodyVault.totalAssets(asset)`.
- Retrieves normalized price from `OracleManager.getAssetPrice(asset)`.
- Returns total value and NAV per share (or `1e18` if supply is zero).

#### `previewDeposit(address asset, uint256 netAmount) → DepositPreview`

Returns `DepositPreview(sharesToMint, feeAmount, netAmount)`.

#### `previewRedeem(address shares, address payoutAsset) → RedeemPreview`

Returns `RedeemPreview(payoutAmount, feeAmount, netAmount)`.

---

## 🧪 5. Testing References

- `packages/protocol/test/PortfolioManager.t.sol`

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
