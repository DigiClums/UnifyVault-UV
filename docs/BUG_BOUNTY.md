# UnifyVault V2 Bug Bounty Program

Welcome to the **UnifyVault V2 Bug Bounty Program**. We prioritize protocol security and invite security researchers, whitehat hackers, and auditors to discover and report vulnerabilities in our smart contracts.

This program is managed in compliance with the **Immunefi Vulnerability Severity Classification System v2.3**.

---

## 1. Scope

### In-Scope Smart Contracts

All production smart contracts located under `packages/protocol/src/`:

| Contract                      | Target Address / Repository Path          | Function / Responsibility                            |
| :---------------------------- | :---------------------------------------- | :--------------------------------------------------- |
| `UnifyVaultController.sol`    | `src/controller/UnifyVaultController.sol` | Main deposit, redeem, and rate-limiting orchestrator |
| `CustodyVault.sol`            | `src/vault/CustodyVault.sol`              | Collateral asset custody vault                       |
| `Treasury.sol`                | `src/vault/Treasury.sol`                  | Protocol-owned treasury & fee collection vault       |
| `OracleManager.sol`           | `src/oracle/OracleManager.sol`            | Pricing coordinator & circuit breaker                |
| `ChainlinkOracleProvider.sol` | `src/oracle/ChainlinkOracleProvider.sol`  | Chainlink oracle price adapter                       |
| `StrategyManager.sol`         | `src/strategy/StrategyManager.sol`        | Index portfolio allocation & asset weight manager    |
| `PortfolioManager.sol`        | `src/strategy/PortfolioManager.sol`       | NAV and portfolio valuation engine                   |
| `SwapAdapter.sol`             | `src/swap/SwapAdapter.sol`                | Stateless DEX router execution adapter               |
| `FeeManager.sol`              | `src/treasury/FeeManager.sol`             | Fee parameters & caps manager                        |
| `UVBTCETHToken.sol`           | `src/token/UVBTCETHToken.sol`             | ERC-20 index share token                             |
| `UnifyVaultTimelock.sol`      | `src/governance/UnifyVaultTimelock.sol`   | 48-hour governance timelock controller               |
| `ProtocolDirectory.sol`       | `src/ProtocolDirectory.sol`               | Central module registry                              |

### Out-of-Scope

- Frontend applications (`apps/web`, `apps/web-v2`) unless causing direct smart contract loss.
- Third-party external contracts (e.g. Uniswap V3 core router, Chainlink aggregator contracts).
- Vulnerabilities requiring impossible conditions (e.g. 51% consensus attacks, compromised private key of governance multi-sig).
- Non-critical gas optimizations or cosmetic code formatting findings.

---

## 2. Severity Classification & Rewards

Payout amounts are determined based on impact and likelihood using the **Immunefi v2.3 Severity Matrix**:

| Severity Level | Max Reward       | Criteria & Examples                                                                                                                                                   |
| :------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical**   | **$100,000 USD** | Direct theft of user funds, permanent freezing of vault collateral, sandwich/donation attack causing loss of principal, or oracle manipulation leading to insolvency. |
| **High**       | **$20,000 USD**  | Temporary freezing of funds, unauthorized role bypass without total theft, or price manipulation resulting in fee theft.                                              |
| **Medium**     | **$5,000 USD**   | Unbounded gas consumption causing denial of service, griefing attacks, or unexpected state desynchronization requiring manual intervention.                           |
| **Low**        | **$1,000 USD**   | Minor logic flaws, event emission bugs, or edge cases with minimal financial impact.                                                                                  |

---

## 3. Disclosure Process

To qualify for a reward under this program:

1. **Email Submission**: Send a detailed report to **`security@unifyvault.io`**.
2. **PGP Encryption**: Encrypt your report using the UnifyVault Security PGP Public Key (`0x4A8F...C21B`).
3. **Response SLA**:
   - Initial Acknowledgement: **within 12 hours**
   - Triaging & Verification: **within 48 hours**
   - Resolution & Bounty Payout: **within 7 business days**
4. **Public Disclosure**: Do NOT publicly disclose or share the vulnerability until UnifyVault engineers have deployed a fix and provided written authorization.

---

## 4. Immunefi Readiness & Rules of Engagement

- **Proof of Concept (PoC)**: A runnable Foundry (`forge test`) or Hardhat test demonstrating the issue is required for Critical and High severity submissions.
- **No Double Submissions**: Submissions already reported via public audit or prior whitehat submissions are ineligible.
- **Good Faith Execution**: Whitehats must avoid accessing user data, causing service disruptions, or executing mainnet exploits. All testing must be conducted on local forks (`anvil` / `forge test`) or testnets (`Base Sepolia`).

---

_UnifyVault Security Team — Preserving Institutional Trust._
