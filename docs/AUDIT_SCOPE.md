# UnifyVault V2 Audit Scope & Specification

> **Protocol Version**: 2.0.0-RC2  
> **Status**: APPROVED (RC2 Deliverable #1)  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## Executive Summary

### Protocol Purpose

UnifyVault V2 is an EVM-native, non-custodial multi-asset index vault protocol. It enables users to deposit collateral assets (`WBTC`, `WETH`, `USDC`) and receive a single, ERC-20 compliant liquid index share token (`$uvBTCETH`).

The protocol dynamically maintains target index allocations (e.g. 50% WBTC / 50% WETH) across custodied vault reserves, periodically executing rebalances while preserving strict accounting invariants:

$$\text{Share Price} = \frac{\text{Total Vault NAV}}{\text{Total Share Supply}}$$

$$\text{User Asset Claim}_i = \left(\frac{\text{User Shares}}{\text{Total Supply}}\right) \times \text{Vault Reserve}_i$$

### High-Level Architecture

The system consists of modular smart contracts coordinated through an on-chain registry (`ProtocolDirectory.sol`):

```
+-----------------------------------------------------------------------+
|                             USER / FRONTEND                           |
+-----------------------------------------------------------------------+
       |                                              |
    Deposit                                         Redeem
       v                                              v
+-----------------------------------------------------------------------+
|                         UnifyVaultController                          |
|  - Validates oracle freshness                                         |
|  - Enforces pause guards (Pausable)                                   |
|  - Calculates share minting / burning                                 |
+-----------------------------------------------------------------------+
    |                      |                          |
    | Transfers Collateral | Mints / Burns            | Price Query
    v                      v                          v
+--------------+   +---------------+   +--------------------------------+
| CustodyVault |   | UVBTCETHToken |   |         OracleManager          |
| (Warehouse)  |   | ($uvBTCETH)   |   | - Primary / Fallback Routing   |
+--------------+   +---------------+   | - Staleness Heartbeat Check    |
                                       | - 18-Decimal Normalization     |
                                       +--------------------------------+
                                                      ^
                                                      | Price Telemetry
                                       +--------------------------------+
                                       |        StrategyManager         |
                                       | - Target Weight Registry       |
                                       | - Drift Calculation Engine     |
                                       | - Keeper Rebalance Trigger     |
                                       +--------------------------------+
```

---

## Scope

### In-Scope Contracts

All smart contracts located within `packages/protocol/src/` are in-scope for security audit:

| Contract                       | Location                                                    | SLOC | Primary Purpose                                                                              |
| :----------------------------- | :---------------------------------------------------------- | :--: | :------------------------------------------------------------------------------------------- |
| **`UnifyVaultController.sol`** | `packages/protocol/src/controller/UnifyVaultController.sol` | ~750 | Primary entry point for `deposit()`, `redeem()`, emergency pause, and fee collection.        |
| **`CustodyVault.sol`**         | `packages/protocol/src/vault/CustodyVault.sol`              | ~420 | Non-custodial warehouse holding raw WBTC, WETH, and USDC collateral reserves.                |
| **`OracleManager.sol`**        | `packages/protocol/src/oracle/OracleManager.sol`            | ~304 | Pricing coordinator with primary/fallback routing, staleness checks, and 18-decimal scaling. |
| **`StrategyManager.sol`**      | `packages/protocol/src/strategy/StrategyManager.sol`        | ~380 | Target weight registry, drift calculation engine, and keeper rebalance trigger.              |
| **`UVBTCETHToken.sol`**        | `packages/protocol/src/token/UVBTCETHToken.sol`             | ~180 | ERC-20 compliant liquid index share token ($uvBTCETH). Minting/burning gated by Controller.  |
| **`ProtocolDirectory.sol`**    | `packages/protocol/src/directory/ProtocolDirectory.sol`     | ~210 | On-chain registry mapping `bytes32` module identifiers to active contract instances.         |
| **`Treasury.sol`**             | `packages/protocol/src/treasury/Treasury.sol`               | ~160 | Protocol fee sink receiving protocol withdrawal and management fees.                         |

### Out-of-Scope Contracts

- Third-party DEX contract logic (Uniswap V3 Core / Router contracts).
- External oracle node infrastructure (Chainlink node network / Pyth guardian network).
- Off-chain indexers, browser extensions, or third-party RPC providers.

---

## Core Protocol Invariants

1. **`INV-001`**: $\text{Total Assets (TVL)} \ge 0$
2. **`INV-002`**: $\text{Total Share Supply} \ge 0$
3. **`INV-003`**: $\text{Share Price} == \frac{\text{Total Vault NAV}}{\text{Total Share Supply}}$
4. **`INV-004`**: No user can mint unbacked or zero-value shares without transferring collateral.
5. **`INV-005`**: Share price is immune to First Depositor / Inflation donation attacks.
6. **`INV-006`**: Rebalancing cannot alter user share balances or total share supply.
7. **`INV-007`**: Oracle pricing requires valid freshness heartbeat (`block.timestamp - updatedAt <= heartbeat`).
8. **`INV-008`**: Redemption payout cannot exceed custodied vault reserves.

---

## Security Model

### Access Control

Fine-grained Role-Based Access Control (RBAC) via OpenZeppelin's `AccessControl`:

- **`DEFAULT_ADMIN_ROLE` (`0x00`)**: Granted to SafePal Hardware Admin (`0xd905...96DA`).
- **`GOVERNANCE_ROLE`**: Manages oracle feed configurations and target allocation weights.
- **`GUARDIAN_ROLE`**: Can trigger `emergencyPause()` during suspected security incidents.
- **`CONTROLLER_ROLE`**: Gated permission allowing `UnifyVaultController` to mint/burn shares and withdraw vault collateral.

### Pause Mechanism

`UnifyVaultController` inherits OpenZeppelin `Pausable`. Calling `emergencyPause()` by `GUARDIAN_ROLE` immediately halts all `deposit()`, `redeem()`, and `rebalance()` operations. `GOVERNANCE_ROLE` can resume operations via `resume()`.

### Oracle Validation

`OracleManager.sol` validates price freshness (`block.timestamp - updatedAt <= heartbeat`), rejects zero prices (`price > 0`), and wraps calls in `try...catch` blocks to route to secondary fallback providers if primary feeds fail.

### Reentrancy Protection

All state-changing user functions (`deposit()`, `redeem()`, `collectProtocolFee()`) enforce OpenZeppelin `ReentrancyGuard` (`nonReentrant` modifier) and Checks-Effects-Interactions patterns.

---

## Assumptions vs Guarantees

### System Assumptions

1. **Oracle Accuracy**: Primary or fallback oracle feeds report accurate market prices when `isPriceFresh() == true`.
2. **Governance Sane Parameters**: Governance (`GOVERNANCE_ROLE`) configures valid target weights (summing to 10,000 BPS) and realistic heartbeats.
3. **Collateral Isolation**: Vault reserves inside `CustodyVault` are held passively without lending or un-audited yield-farming exposure.

### Protocol Guarantees

1. **Non-Custodial Ownership**: Users can redeem their shares for underlying collateral at any time unless the system is explicitly paused by `GUARDIAN_ROLE`.
2. **Strict Pro-Rata Entitlement**: Share redemptions release exact pro-rata collateral across all underlying vault reserves without favoring specific assets.
3. **Protected Share Pricing**: Share price calculation `calculateSharePriceUSD()` uses 18-decimal fixed-point BigInt arithmetic and cannot be manipulated by direct asset donations.

---

## Protocol Non-Goals

1. **Tax Accounting & Compliance Reporting**: The protocol does not track individual tax liabilities or jurisdiction-specific regulatory reporting.
2. **Cross-Chain Settlement**: UnifyVault V2 operates as a single-chain index vault on Base. Cross-chain bridging is handled by external bridges.
3. **Leveraged Positions / Debt Issuance**: The vault does not issue debt or support collateralized borrowing/lending.
4. **Third-Party Custody Management**: The protocol does not entrust collateral to centralized custodians.

---

## External Dependency Versions

- **Solidity Compiler**: `0.8.24` (`cancun` EVM target)
- **OpenZeppelin Contracts**: `v5.0.0`
- **Foundry Toolchain**: `v1.0.0`
- **Node.js Environment**: `v20.11.0` (LTS)
- **Viem / Wagmi**: `viem v2.55.2`, `wagmi v2.14.0`

---

## Known Limitations

### EVM Integer Division Truncation

Standard EVM integer arithmetic truncates fractional wei down. In pro-rata redemption calculations `(totalAsset * userShares) / totalShares`, truncations round down in favor of vault collateral reserves.

### Rebalance Drift Tolerance Threshold

Rebalancing is gated by a 500 BPS (5.0%) drift threshold (`StrategyManager.rebalanceThreshold()`) to prevent gas waste on minor price fluctuations.

### Testnet Cost Basis Accounting Behavior

On Base Sepolia testnet where `CostBasisManager` events are unindexed, the frontend falls back to browser deposit ledgers (`localStorage`) backed by genesis `$1.00/share` baseline valuation.

---

## Test Coverage

### Unit Tests

- **Vitest Frontend Suite**: 26/26 tests passing (100% pass rate).
- **Foundry Protocol Suite**: Passed (`forge test`).

### Integration Tests

- Full deposit $\rightarrow$ mint $\rightarrow$ holding valuation $\rightarrow$ redeem $\rightarrow$ burn flow verified on Base Sepolia.

---

## Auditor Focus Areas

1. **Accounting Integrity**: Verify that `CustodyVault.sol` collateral reserves match `$uvBTCETH` share claims to exact 1 wei precision under all deposit/redeem sequences.
2. **Share Pricing Invariant Edge-Case Validation**: Audit `calculateSharePriceUSD()` under boundary test scenarios ($1 \text{ wei}$ to $10^{12} \text{ shares}$) to guarantee no inflation or donation attacks exist.
3. **Oracle Safety & Fallback Routing**: Inspect `OracleManager.sol` `try...catch` fallback routing when primary price feeds revert, lag, or return 0.
4. **Access Control & Role Gating**: Verify that no un-gated functions allow unauthorized share minting, vault withdrawals, or governance role hijacking.
5. **Rebalancing Mechanics**: Verify that `StrategyManager.rebalance()` cannot be exploited to alter user share balances or extract vault collateral.

---

> 🔗 **Detailed Threat Matrix**: Detailed attack scenarios and mitigation controls are documented in [`docs/THREAT_MODEL.md`](file:///var/www/UnifyVault-UV/docs/THREAT_MODEL.md).
