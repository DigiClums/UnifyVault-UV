---
Status: Production Ready
Last Verified Commit: 87b9587
Source: Inferred from Repository Source Code
Audience: Smart Contract Auditors, Security Researchers, Protocol Engineers
Prerequisites: EVM, Solidity 0.8.24, Foundry
Related Documents: [Documentation Index](../README.md)
---

# Protocol Threat Model & Attack Vector Analysis

This document presents the threat model, attack surface analysis, trust assumptions, and mitigation strategies for **UnifyVault V2**.

---

## 🛡️ 1. Threat Matrix & Mitigations

| Threat Vector                        | Severity | Attack Mechanism                                                                          | Protocol Mitigation                                                                                                                   |
| :----------------------------------- | :------: | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| **Direct Vault Donation Attack**     |   High   | Attacker transfers tokens directly to vault to artificially manipulate NAV/share pricing. | `CustodyVault` tracks balances via internal `_accountedAssets` ledger, completely ignoring raw token balances.                        |
| **Flash Loan Arbitrage Attack**      | Critical | Attacker uses flash loans to manipulate spot DEX prices before depositing or redeeming.   | `UnifyVaultController` values portfolio via Chainlink Oracles rather than spot DEX balances, and enforces slippage protection bounds. |
| **Oracle Manipulation / Stale Feed** | Critical | Malicious/stale oracle prices cause under/over-valuation of index shares.                 | `OracleManager` verifies Chainlink heartbeat timestamps, rejects negative prices, and supports fallback oracle providers.             |
| **Reentrancy Deposit/Redeem Drain**  | Critical | Malicious ERC20 token fallback reenters Controller during transfer.                       | All state-changing methods enforce OpenZeppelin `ReentrancyGuard` (`nonReentrant`).                                                   |
| **Controller Balance Retention**     |   High   | Unclaimed tokens remain in Controller contract, subject to front-running.                 | Enforces strict **Zero-Retained-Balance Invariant** at the end of every deposit and redeem call.                                      |

---

## 🔒 2. Trust Assumptions & Boundaries

1. **Chainlink Oracle Feeds**: Trusted to accurately report asset prices within heartbeat intervals.
2. **Uniswap V3 Pools**: Trusted to execute swaps with sufficient liquidity within requested `minAmountOut` slippage parameters.
3. **Governance Multisig**: Trusted to manage protocol configuration, fee parameters, and contract upgrades responsibly.

---

## 🔍 Verification & Audit Metadata

- **Verification Sources**: Source code (), Foundry test suites ()
- **Related Contracts**: [](../contracts/UnifyVaultController.md), [](../contracts/ProtocolDirectory.md)
- **Related Tests**:
- **Last Reviewed**: 2026-07-30
