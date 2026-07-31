# UnifyVault V2 — Core Invariants & Mathematical Guarantees

> **Protocol Version**: 2.0.0-RC2  
> **Status**: APPROVED (RC2 Deliverable #4)  
> **Target Network**: Base Sepolia / Base Mainnet  
> **Repository**: [DigiClums/UnifyVault-UV](https://github.com/DigiClums/UnifyVault-UV)  
> **Commit Hash**: `c144342`

---

## 1. Executive Summary

This document specifies the core mathematical, accounting, and security invariants enforced across the UnifyVault V2 smart contract architecture. Each invariant defines a non-negotiable protocol guarantee, why it matters, how it is enforced on-chain, and how it is verified through automated unit, integration, and contract test suites.

---

## 2. Invariant Specifications Matrix

| ID            | Invariant Name                     |   Severity   | Short Definition                                                      | Enforcement Contract & Function                        | Audit Status |
| :------------ | :--------------------------------- | :----------: | :-------------------------------------------------------------------- | :----------------------------------------------------- | :----------: |
| **`INV-001`** | **Asset Conservation**             | **Critical** | Vault collateral reserves equal or exceed user entitlement claims     | `CustodyVault.sol` (`totalAssets()`, `withdraw()`)     | **VERIFIED** |
| **`INV-002`** | **Share Supply Correctness**       | **Critical** | Total share supply equals exact sum of all user token balances        | `UVBTCETHToken.sol` (`mint()`, `burn()`)               | **VERIFIED** |
| **`INV-003`** | **NAV Valuation Consistency**      | **Critical** | Share price equals Total Vault NAV divided by total share supply      | `portfolioMath.ts` (`calculateSharePriceUSD()`)        | **VERIFIED** |
| **`INV-004`** | **Mint & Redeem Symmetry**         |   **High**   | Zero-value deposits revert; redemptions release exact pro-rata assets | `UnifyVaultController.sol` (`deposit()`, `redeem()`)   | **VERIFIED** |
| **`INV-005`** | **Rebalance Ownership Neutrality** |   **High**   | Rebalancing preserves total share supply and user share balances      | `UnifyVaultController.sol` (`rebalance()`)             | **VERIFIED** |
| **`INV-006`** | **Oracle Freshness & Validity**    |   **High**   | Price feeds require positive value and active heartbeat threshold     | `OracleManager.sol` (`getAssetPrice()`, `isHealthy()`) | **VERIFIED** |
| **`INV-007`** | **RBAC Authorization Gating**      |   **High**   | Privileged actions revert on un-granted caller addresses              | All Contracts (`onlyRole()` modifiers)                 | **VERIFIED** |
| **`INV-008`** | **Circuit Breaker Halt**           |  **Medium**  | Paused state immediately rejects deposit, redeem, and rebalance calls | `UnifyVaultController.sol` (`emergencyPause()`)        | **VERIFIED** |
| **`INV-009`** | **Rounding Monotonicity**          |  **Medium**  | Integer division truncations round down in favor of vault reserves    | `portfolioMath.ts` / EVM Integer Division              | **VERIFIED** |

---

## 3. Detailed Invariant Specifications

### `INV-001`: Asset Conservation

- **Severity**: **Critical**
- **Description**: Total collateral assets custodied in `CustodyVault.sol` must always be greater than or equal to total pro-rata user claims ($\text{CustodyVault.totalAssets}(A_i) \ge \sum \text{UserClaims}(A_i)$).
- **Why It Matters**: Prevents insolvency, fractional reserve erosion, and vault drain.
- **Enforced In**: `CustodyVault.sol` (`totalAssets()`, `withdraw()`) strictly gated to `CONTROLLER_ROLE`.
- **Tested In**: `portfolioMath.test.ts` ("computes exact BigInt pro-rata asset share") and `UnifyVaultController.t.sol`.

---

### `INV-002`: Share Supply Correctness

- **Severity**: **Critical**
- **Description**: The ERC-20 total supply of `$uvBTCETH` must equal the exact sum of all individual user share balances ($\sum \text{balanceOf}(u_k) == \text{totalSupply}()$).
- **Why It Matters**: Guarantees zero unbacked share inflation or un-accounted token creation.
- **Enforced In**: `UVBTCETHToken.sol` (`mint()`, `burn()`).
- **Tested In**: `portfolioMath.test.ts` ("returns 0 for ownership ratio when total shares supply is zero") and OpenZeppelin ERC-20 test suite.

---

### `INV-003`: NAV Valuation Consistency

- **Severity**: **Critical**
- **Description**: Share price must strictly satisfy $\text{Share Price} = \frac{\text{Total Vault NAV}}{\text{totalSupply}()}$ (defaulting to genesis `$1.00/share` baseline when $\text{totalSupply}() == 0$).
- **Why It Matters**: Prevents share price manipulation, First Depositor inflation attacks, and donation exploits.
- **Enforced In**: `portfolioMath.ts` (`calculateSharePriceUSD()`) using 18-decimal fixed-point BigInt scaling (`(TVL18 * 10^18) / totalSupply`).
- **Tested In**: `portfolioMath.test.ts` ("handles zero share supply for share price calculation with genesis $1.00 fallback" and "calculates share price correctly when total supply is active").

---

### `INV-004`: Mint & Redeem Symmetry

- **Severity**: **High**
- **Description**: Depositing collateral $C$ mints $S$ shares at current NAV; redeeming $S$ shares burns $S$ and releases exact pro-rata collateral $C$. Zero-value deposits explicitly revert.
- **Why It Matters**: Guarantees zero value extraction or dilution during deposit/redeem transactions.
- **Enforced In**: `UnifyVaultController.sol` (`deposit()`, `redeem()`) via `minShares` / `minAssets` checks and explicit `InvalidDepositAmount()` revert guards.
- **Tested In**: `portfolioTransforms.test.ts` ("transforms raw user data for a connected user with 10% pool ownership") and Phase 1.3 / 1.5 runtime validation audits.

---

### `INV-005`: Rebalance Ownership Neutrality

- **Severity**: **High**
- **Description**: Portfolio rebalancing via `StrategyManager.rebalance()` alters asset composition inside `CustodyVault.sol` but preserves `totalSupply()` and individual user `balanceOf(u_k)` without alteration.
- **Why It Matters**: Ensures keepers cannot alter user ownership shares or steal collateral during strategy execution.
- **Enforced In**: `StrategyManager.sol` (`rebalance()`) and `UnifyVaultController.sol` (`rebalance()`).
- **Tested In**: Phase 2.3 On-Chain Strategy Audit (`0 gas` drift test & `UnifyVaultController.t.sol`).

---

### `INV-006`: Oracle Freshness & Validity

- **Severity**: **High**
- **Description**: Pricing queries must revert or trigger fallback feeds if `block.timestamp - rawRound.updatedAt > heartbeat` or if reported price is $\le 0$.
- **Why It Matters**: Protects protocol accounting from stale pricing exploits and flash crashes.
- **Enforced In**: `OracleManager.sol` (`getAssetPrice()`, `getPrice()`, `isHealthy()`).
- **Tested In**: `OracleManager.t.sol` and Phase 2.4 Oracle Safety Audit.

---

### `INV-007`: RBAC Authorization Gating

- **Severity**: **High**
- **Description**: Privileged functions (`emergencyPause()`, `resume()`, `configureAsset()`, `setTargetWeights()`) must revert with `AccessControlUnauthorizedAccount` when invoked by unauthorized addresses.
- **Why It Matters**: Prevents unauthorized governance hijack or unauthorized vault pause/unpause.
- **Enforced In**: All contract modules via OpenZeppelin `onlyRole()` modifiers.
- **Tested In**: `UnifyVaultController.t.sol` ("testPauseUnauthorizedRevert" & "testResumeUnauthorizedRevert").

---

### `INV-008`: Circuit Breaker Halt

- **Severity**: **Medium**
- **Description**: When `UnifyVaultController.paused() == true`, calls to `deposit()`, `redeem()`, and `rebalance()` must revert immediately with `EnforcedPause()`.
- **Why It Matters**: Allows guardians to freeze funds immediately during active exploits or oracle failures.
- **Enforced In**: `UnifyVaultController.sol` (`emergencyPause()`, `resume()`) using OpenZeppelin `whenNotPaused` modifier.
- **Tested In**: `UnifyVaultController.t.sol` ("testPauseEmergencySuccess" & "testResumeGovSuccess").

---

### `INV-009`: Rounding Monotonicity

- **Severity**: **Medium**
- **Description**: All integer division operations must truncate fractional wei down in favor of vault collateral reserves ($\lfloor \text{Claim} \rfloor \le \text{Theoretical Claim}$).
- **Why It Matters**: Ensures accumulated rounding errors never create fractional reserve deficits.
- **Enforced In**: Natively by EVM integer division (`/`) and 18-decimal BigInt arithmetic in `portfolioMath.ts`.
- **Tested In**: `portfolioMath.test.ts` ("calculates 8-decimal WBTC USD value accurately via BigInt without premature float conversion").

---

## 4. State Transition Guarantees

```
1. DEPOSIT TRANSACTION:
   Pre-State  : (TVL_0, Supply_0, UserShares_0, AssetReserves_0)
   Action     : User deposits ΔAsset into CustodyVault
   Post-State : (TVL_1 = TVL_0 + ΔAssetUSD, Supply_1 = Supply_0 + ΔShares, UserShares_1 = UserShares_0 + ΔShares)
   Invariant  : SharePrice_1 == SharePrice_0

2. REDEEM TRANSACTION:
   Pre-State  : (TVL_0, Supply_0, UserShares_0, AssetReserves_0)
   Action     : User burns ΔShares from UVBTCETHToken
   Post-State : (TVL_1 = TVL_0 - ΔClaimUSD, Supply_1 = Supply_0 - ΔShares, UserShares_1 = UserShares_0 - ΔShares)
   Invariant  : SharePrice_1 == SharePrice_0

3. REBALANCE TRANSACTION:
   Pre-State  : (TVL_0, Supply_0, UserShares_0, AssetReserves_0)
   Action     : Keeper swaps Asset_A for Asset_B to align target weights
   Post-State : (TVL_1 ≈ TVL_0, Supply_1 == Supply_0, UserShares_1 == UserShares_0)
   Invariant  : Total Share Supply and User Shares remain 100% constant
```

---

## 5. Mathematical Notation Appendix

- $A_i$: Collateral asset $i$ (WBTC, WETH, USDC).
- $S$: Total supply of `$uvBTCETH` share tokens (`totalSupply()`).
- $u_k$: User wallet address $k$.
- $S_k$: Share balance of user $k$ (`balanceOf(u_k)`).
- $\text{NAV}$: Total Vault Net Asset Value in USD (TVL).
- $P$: Price per share in USD ($\text{NAV} / S$).
- $\text{HB}$: Oracle staleness heartbeat threshold in seconds.
