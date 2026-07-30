---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Protocol Deployment & Configuration Guide

This document provides step-by-step instructions for deploying UnifyVault V2 to Base Mainnet or Sepolia using Foundry scripts.

---

## 🚀 1. Sequential Deployment Order

Deployments are executed using Foundry scripts in `packages/protocol/script/`:

```bash
cd packages/protocol
```

### Order of Contract Deployment:

1. **[`ProtocolDirectory.sol`](../contracts/ProtocolDirectory.md)**: `DeployV2.s.sol`
2. **[`OracleManager.sol`](../contracts/OracleManager.md)** & **[`ChainlinkOracleProvider.sol`](../contracts/OracleManager.md)**
3. **[`CustodyVault.sol`](../contracts/CustodyVault.md)**
4. **[`Treasury.sol`](../contracts/Treasury.md)**
5. **[`UVBTCETHToken.sol`](../contracts/UVBTCETHToken.md)**
6. **[`SwapAdapter.sol`](../contracts/SwapAdapter.md)** (configured with Uniswap V3 SwapRouter)
7. **[`StrategyManager.sol`](../contracts/StrategyManager.md)** (configured with 60% cbBTC / 40% WETH)
8. **[`PortfolioManager.sol`](../contracts/PortfolioManager.md)**
9. **[`UnifyVaultController.sol`](../contracts/UnifyVaultController.md)**

---

## 🛠️ 2. Registry Registration & Configuration

Execute `RegisterAndConfigureV2.s.sol`:

- Registers all module addresses in `ProtocolDirectory`.
- Registers collateral assets (USDC, cbBTC, WETH) in `CustodyVault` and `Treasury`.

---

## 💻 3. Command Line Execution

```bash
# Testnet Deployment (Base Sepolia)
forge script script/DeployV2.s.sol:DeployV2 --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify

# Post-Deployment Registration
forge script script/RegisterAndConfigureV2.s.sol:RegisterAndConfigureV2 --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
