---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# NAV Calculation & Valuation Engine

This document details the Net Asset Value (NAV) mathematical formulas and valuation logic implemented in **[`PortfolioManager`](../contracts/PortfolioManager.md)**.

---

## 🧮 1. Mathematical Formulas

### Total Portfolio Value USD ($V_{total}$)

$$V_{total} = \sum_{i=1}^{N} \left( \frac{\text{Balance}_i \times \text{Price}_i}{10^{\text{Decimals}_i}} \right)$$

where:

- $\text{Balance}_i$ = `CustodyVault.totalAssets(asset_i)`
- $\text{Price}_i$ = `OracleManager.getAssetPrice(asset_i)` (normalized to 18 decimals)
- $\text{Decimals}_i$ = ERC20 token decimals (e.g. 8 for cbBTC, 18 for WETH)

### Share Price NAV ($\text{NAV}_{share}$)

$$ \text{NAV}_{share} = \begin{cases}
1.00 \text{ USD } (10^{18} \text{ wei}), & \text{if } \text{TotalSupply} = 0 \\
\frac{V_{total} \times 10^{18}}{\text{TotalSupply}}, & \text{if } \text{TotalSupply} > 0
\end{cases}$$

---

## 🔗 Related Documents
- [`../contracts/PortfolioManager.md`](../contracts/PortfolioManager.md) — Contract Specification
- [`oracle-pricing.md`](oracle-pricing.md) — Oracle Pricing Pipeline

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
$$
