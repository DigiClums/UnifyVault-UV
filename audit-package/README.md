# UnifyVault V2 — Independent Security & Architecture Audit Package

> **Protocol Version**: V2.0.0-Mainnet  
> **Compiler Target**: Solc `0.8.24` (`cancun`, 200 runs, `via_ir = true`)  
> **Repository**: UnifyVault-UV  
> **License**: MIT

---

## 🎯 Purpose

This package provides external security auditors, economic researchers, and protocol evaluators with a complete, self-contained overview of **UnifyVault V2**. It contains architectural specifications, trust assumptions, threat models, economic invariant definitions, ABI specifications, and deployment artifacts.

---

## 📁 Package Contents

```
audit-package/
├── README.md               <-- This Document
├── ARCHITECTURE.md         <-- Complete System Architecture & Module Intersections
├── MANIFESTO.md            <-- Decentralization & Non-Custodial Core Principles
├── CONSTITUTION.md         <-- Governance Rules & Timelock Enforcement Rules
├── SECURITY_AUDIT.md       <-- Static Analysis & Internal Audit Summary
├── ECONOMIC_AUDIT.md       <-- Economic Attack Vectors & Arbitrage Immunity Analysis
├── THREAT_MODEL.md         <-- STRIDE Threat Matrix & Risk Mitigation Strategies
├── DEPLOYMENT.md           <-- Base Sepolia & Base Mainnet Deployment Guide
├── ABI/                    <-- JSON Application Binary Interfaces
├── diagrams/               <-- Architecture & Interaction Flow Diagrams (Mermaid/ASCII)
└── contracts/              <-- Core Contract Map & Line Count Overview
```

---

## 🔒 Scope of Smart Contracts

| Contract Name                 | Category         | Primary Function                                           | Immutable / Non-Proxy |
| :---------------------------- | :--------------- | :--------------------------------------------------------- | :-------------------- |
| **`UnifyVaultController`**    | Core Controller  | User deposits, share minting, redemptions                  | **YES**               |
| **`CustodyVault`**            | Asset Custody    | Isolated collateral asset accounting & storage             | **YES**               |
| **`Treasury`**                | Protocol Reserve | Protocol fee aggregation & protocol reserves               | **YES**               |
| **`StrategyManager`**         | Asset Allocation | Target portfolio weight definitions & rebalances           | **YES**               |
| **`PortfolioManager`**        | Execution        | Vault rebalance calculation & routing                      | **YES**               |
| **`LiquidityManager`**        | Liquidity        | Operational & reserve balance thresholds                   | **YES**               |
| **`FeeManager`**              | Fee System       | Deposit/redemption fee routing & capping                   | **YES**               |
| **`OracleManager`**           | Price Discovery  | Multi-feed Chainlink oracle aggregation & staleness checks | **YES**               |
| **`ChainlinkOracleProvider`** | Oracle Provider  | Chainlink AggregatorV3 integration & heartbeat guard       | **YES**               |
| **`ProtocolDirectory`**       | Registry         | On-chain immutable module address lookup registry          | **YES**               |
| **`UnifyVaultTimelock`**      | Governance       | 48-Hour mandatory governance execution delay               | **YES**               |
| **`UVBTCETHToken`**           | Index Token      | ERC20 share token representing vault index shares          | **YES**               |

---

## 🚀 Quick Verification Commands

```bash
# Clone and enter repo
git clone https://github.com/DigiClums/UnifyVault-UV.git
cd UnifyVault-UV/packages/protocol

# Run full test suite
forge test

# Run Phase 2 validation & Phase 3 stress/simulation tests
forge test --match-contract Phase2_ValidationSuite
forge test --match-contract Phase3_StressTest
forge test --match-contract Phase3_LongRunningSim
```
