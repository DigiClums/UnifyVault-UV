# UnifyVault V2 — Security Policy & Security Model Specification

> **Protocol Version**: 2.0.0-RC2  
> **Status**: APPROVED (RC2 Deliverable #3)  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## 1. Security Principles & Architecture

UnifyVault is engineered around five core security principles:

1. **Non-Custodial Collateral Isolation**: All collateral assets (`WBTC`, `WETH`, `USDC`) are custodied inside `CustodyVault.sol` without lending, leverage, or un-audited yield-farming re-hypothecation.
2. **Oracle Multi-Provider Redundancy**: Valuations require fresh Chainlink/Pyth oracle feeds. `OracleManager.sol` enforces staleness heartbeats and automatic fallback routing.
3. **Role Segregation (RBAC)**: Operational and administrative capabilities are strictly segregated via OpenZeppelin `AccessControl`.
4. **Emergency Circuit Breaker**: `GUARDIAN_ROLE` can immediately freeze protocol entry points (`emergencyPause()`) during security incidents.
5. **Deterministic Fixed-Point Accounting**: 18-decimal fixed-point BigInt arithmetic guarantees exact share pricing without rounding loss.

---

## 2. Security Assumptions

1. **Oracle Correctness**: Oracle providers behave correctly within documented heartbeat staleness thresholds (`block.timestamp - updatedAt <= heartbeat`).
2. **Key Security**: Governance and Guardian private keys remain uncompromised.
3. **ERC-20 Compliance**: Supported collateral tokens (`WBTC`, `WETH`, `USDC`) adhere strictly to standard ERC-20 transfer behavior without fee-on-transfer or balance rebalancing logic.
4. **RPC Failure Resilience**: Off-chain RPC providers may fail without affecting on-chain contract correctness or collateral safety.

---

## 3. Access Control & Role Matrix

The protocol implements Role-Based Access Control via OpenZeppelin's `AccessControl`:

| Role Identifier                | Role Hash                      |     Assigned Address (Testnet)     | Granted Capabilities                                                                                |
| :----------------------------- | :----------------------------- | :--------------------------------: | :-------------------------------------------------------------------------------------------------- |
| **`DEFAULT_ADMIN_ROLE`**       | `0x00`                         | `0xd905...96DA` (SafePal Hardware) | Grant/revoke roles, update module addresses in `ProtocolDirectory.sol`.                             |
| **`GOVERNANCE_ROLE`**          | `keccak256('GOVERNANCE_ROLE')` | `0xd905...96DA` (SafePal Hardware) | Unpause protocol (`resume()`), update oracle feed config & target strategy weights.                 |
| **`GUARDIAN_ROLE`**            | `keccak256('GUARDIAN_ROLE')`   | `0xd905...96DA` (SafePal Hardware) | Execute emergency pause (`emergencyPause()`) during security incidents.                             |
| **`CONTROLLER_ROLE`**          | `keccak256('CONTROLLER_ROLE')` |       `UnifyVaultController`       | Gated permission allowing `Controller` to mint/burn `$uvBTCETH` shares & withdraw vault collateral. |
| **`BOT_ROLE` / `KEEPER_ROLE`** | `keccak256('BOT_ROLE')`        |   Keeper Process / Automated Bot   | Execute `StrategyManager.rebalance()` when allocation drift exceeds 5.0%.                           |

---

## 4. Threat-to-Control Mapping

| Threat Vector                        | Primary Protocol Control                                                        |
| :----------------------------------- | :------------------------------------------------------------------------------ |
| **Reentrancy Attacks**               | OpenZeppelin `ReentrancyGuard` (`nonReentrant` modifier) + CEI Pattern          |
| **Oracle Manipulation & Staleness**  | Heartbeat staleness checks + `OracleManager.sol` `try...catch` fallback routing |
| **Unauthorized Admin Actions**       | OpenZeppelin `AccessControl` RBAC role separation                               |
| **Emergency Circuit Breaker**        | `UnifyVaultController.emergencyPause()` (gated to `GUARDIAN_ROLE`)              |
| **First Depositor Inflation Attack** | Genesis `$1.00/share` baseline fallback + zero-deposit explicit revert          |
| **Rounding Loss & Theft**            | 18-decimal fixed-point BigInt arithmetic (division truncates in favor of vault) |

---

## 5. Emergency Procedures

### 5.1 Triggering Emergency Pause (`GUARDIAN_ROLE`)

During a suspected exploit or oracle corruption, `GUARDIAN_ROLE` invokes `emergencyPause()` on `UnifyVaultController.sol`:

- **Effect**: Halts `deposit()`, `redeem()`, and `rebalance()` calls immediately.
- **Scope**: Vault collateral remains 100% frozen and isolated inside `CustodyVault.sol`.

### 5.2 Protocol Resumption (`GOVERNANCE_ROLE`)

Once the root cause is resolved and verified, `GOVERNANCE_ROLE` invokes `resume()`:

- **Effect**: Restores normal deposit, redemption, and rebalancing operations.

---

## 6. Key Management, Rotation & Governance Migration

- **Testnet Admin Key**: `0xd905920c91853039060246Ed5724AA72B91a96DA` (Dedicated SafePal Hardware Wallet).
- **Previous Hot Wallet**: `0xB145AC2a59575fBE306a58Ac924718f4DD4659Da` (Governance migrated on `2026-07-31`; hot wallet `DEFAULT_ADMIN_ROLE` renounced).
- **Key Replacement & Signer Rotation**: Governance replacement requires invoking `grantRole(GOVERNANCE_ROLE, newSigner)` followed by `renounceRole(GOVERNANCE_ROLE, oldSigner)`.
- **Mainnet Target Governance**: 3-of-5 Gnosis Safe Multi-Sig paired with a 48-hour Timelock Controller contract.

---

## 7. Upgrade Boundaries & Registry Architecture

- **Immutable Contracts**: Core token (`UVBTCETHToken.sol`) and collateral storage (`CustodyVault.sol`) are strictly **immutable**.
- **Registry Resolution**: Module address updating is coordinated exclusively through `ProtocolDirectory.sol`.
- **Registry Update Policy**: Updating a module contract address in `ProtocolDirectory.sol` requires a `DEFAULT_ADMIN_ROLE` transaction, which on mainnet will be subject to a 48-hour timelock delay.

---

## 8. Dependency Policy & Version Pinning

- **Version Pinning**: All core smart contract dependencies are strictly pinned to exact release versions in `package.json`:
  - OpenZeppelin Contracts: `v5.0.0`
  - Solidity Compiler: `0.8.24` (`cancun` EVM target)
  - Viem: `v2.55.2` / Wagmi: `v2.14.0`
- **Dependency Security Patch Policy**: Dependencies are scanned via Automated Dependabot and `gitleaks`. Patches undergo full regression testing before governance execution.

---

## 9. Vulnerability Reporting & Planned Bug Bounty

We invite ethical security researchers to report vulnerabilities through our confidential security channel:

- **Primary Security Contact**: `security@unifyvault.io`
- **Response SLA**:
  - **Initial Triage**: `< 24 Hours`
  - **Fix & Patch Timeline**: `1 - 7 Days`
  - **Public Disclosure & Bounty Payout**: Post-Fix

### Planned Bug Bounty Program (Target Maximum Reward: up to $100,000 USD)

- **Critical (Loss of Funds / Vault Drain)**: Target reward up to **$100,000 USD** (payable in USDC)
- **High (Temporary Freezing / Oracle Manipulation)**: Target reward up to **$25,000 USD**
- **Medium (Logic Flaws / Fee Theft)**: Target reward up to **$5,000 USD**

---

## 10. Incident Response Plan References

For detailed emergency runbooks, keeper procedures, and severity escalation SLAs, consult:

- [`docs/INCIDENT_RESPONSE.md`](file:///var/www/UnifyVault-UV/docs/INCIDENT_RESPONSE.md)
- [`docs/RUNBOOK.md`](file:///var/www/UnifyVault-UV/docs/RUNBOOK.md)
