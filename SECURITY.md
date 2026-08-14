# UnifyVault V2 — Security Policy & Security Model Specification

> **Protocol Version**: 2.0.0-PROD  
> **Status**: APPROVED  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)

---

## 1. Security Principles & Architecture

UnifyVault is engineered around core security principles:

1. **Non-Custodial Collateral Isolation**: All vault collateral assets (`cbBTC`, `WETH`, `USDC`) are custodied inside `CustodyVault.sol` with donation-attack immunity.
2. **Oracle Multi-Provider Redundancy**: Valuations require fresh Chainlink feeds. `OracleManager.sol` enforces staleness heartbeats, multi-state status checks (`LIVE`, `STALE`, `REVERTED`, `UNAVAILABLE`), and fallback routing.
3. **Locked Pre-Transfer Cost Basis Accounting**: `UVBEV2` enforces a pre-transfer hook calling `CostBasisManagerV2` before `super._update()`. Ordinary transfers conserve total protocol basis.
4. **P2P Escrow Isolation**: `P2PEscrowV2` operates strictly on circulating tokens. `CostBasisManagerV2` explicitly ignores escrow transfers via `_isEscrow` guards, preventing fiat trades from mutating vault NAV, supply, or investor basis.
5. **Role Segregation (RBAC)**: Operational and administrative capabilities are strictly segregated via OpenZeppelin `AccessControl` and a 48-hour `UnifyVaultTimelock`.
6. **Emergency Circuit Breaker**: `GUARDIAN_ROLE` and `GOVERNANCE_ROLE` can immediately freeze protocol entry points (`pause()`) during security incidents.

---

## 2. Access Control & Role Matrix

The protocol implements Role-Based Access Control via OpenZeppelin's `AccessControl`:

| Role Identifier                | Role Hash                           | Primary Capabilities                                                                                                |
| :----------------------------- | :---------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **`DEFAULT_ADMIN_ROLE`**       | `0x00`                              | Super-administrative role; grants/revokes roles. Assigned to `UnifyVaultTimelock`.                                  |
| **`GOVERNANCE_ROLE`**          | `keccak256('GOVERNANCE_ROLE')`      | Configures protocol parameters, whitelists assets, sets fee rates, and registers modules in `ProtocolDirectory`.    |
| **`GUARDIAN_ROLE`**            | `keccak256('GUARDIAN_ROLE')`        | Emergency response role; can pause and unpause `UnifyVaultController`, `CustodyVault`, `UVBEV2`, and `P2PEscrowV2`. |
| **`CONTROLLER_ROLE`**          | `keccak256('CONTROLLER_ROLE')`      | Gated permission allowing `Controller` to mint/burn `UVBE` shares & withdraw vault collateral.                      |
| **`ARBITRATOR_ROLE`**          | `keccak256('ARBITRATOR_ROLE')`      | Resolves disputes in `P2PEscrowV2` by executing release to buyer or refund to seller.                               |
| **`BOT_ROLE` / `KEEPER_ROLE`** | `keccak256('BOT_ROLE')`             | Executes `StrategyManager.rebalance()` when allocation drift exceeds threshold.                                     |
| **`ORACLE_OPERATOR_ROLE`**     | `keccak256('ORACLE_OPERATOR_ROLE')` | Updates manual price feeds in `MockOracleProvider`.                                                                 |

---

## 3. Threat-to-Control Mapping

| Threat Vector                           | Primary Protocol Control                                                                                         |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Reentrancy Attacks**                  | OpenZeppelin `ReentrancyGuard` (`nonReentrant` modifier) on all state-mutating financial functions + CEI Pattern |
| **Oracle Manipulation & Staleness**     | Heartbeat staleness checks + multi-state feed classification (`LIVE`, `STALE`, `REVERTED`, `UNAVAILABLE`)        |
| **First Depositor Inflation Attack**    | Genesis `$1.00/share` baseline fallback + `DEAD_SHARES` (1000 wei) permanent mint                                |
| **Donation Attack / Balance Inflation** | `CustodyVault` internal accounting (`_internalBalances`) tracks deposits separately from `balanceOf`             |
| **P2P Escrow Double-Settlement**        | `_usedPaymentReferences` and `_usedEvidenceHashes` mappings enforce single-use of UTRs and receipt hashes        |
| **P2P Fee-on-Transfer Attack**          | Balance check in `_executeFundingTransfer` strictly reverts if `balanceAfter - balanceBefore < amount`           |
| **Unauthorized Seller Token Theft**     | During `PAYMENT_SUBMITTED` state, only the buyer can voluntarily forfeit; seller must raise dispute              |
| **Cost Basis Contamination**            | `CostBasisManagerV2` ignores all transfers involving registered escrow contracts (`_isEscrow` guard)             |

---

## 4. Emergency Procedures

### 4.1 Triggering Emergency Pause (`GUARDIAN_ROLE`)

During a suspected exploit or oracle corruption, `GUARDIAN_ROLE` invokes `pause()` on `UnifyVaultController.sol`, `UVBEV2.sol`, or `P2PEscrowV2.sol`:

- **Effect**: Halts `deposit()`, `redeem()`, `rebalance()`, token transfers, and escrow funding immediately.
- **Scope**: Vault collateral remains 100% frozen and isolated inside `CustodyVault.sol`.

### 4.2 Protocol Resumption (`GOVERNANCE_ROLE`)

Once the root cause is resolved and verified, `GOVERNANCE_ROLE` invokes `unpause()`:

- **Effect**: Restores normal deposit, redemption, and trading operations.

---

## 5. Vulnerability Reporting

We invite ethical security researchers to report vulnerabilities through our confidential security channel:

- **Primary Security Contact**: `security@unifyvault.io`
- **Response SLA**:
  - **Initial Triage**: `< 24 Hours`
  - **Fix & Patch Timeline**: `1 - 7 Days`
  - **Public Disclosure & Bounty Payout**: Post-Fix
