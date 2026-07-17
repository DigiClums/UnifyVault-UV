# UnifyVault Complete Deposit Flow Audit

**Date:** 2026-07-17  
**Scope:** Full `deposit()` lifecycle — User → Validation → FeeLib → Collateral → CustodyVault / Treasury → ShareLib → Mint UVBTCETH → User  
**Tag:** `v0.6.4`  
**Reviewer:** Lead Smart Contract Auditor

---

## Executive Summary

45 tests pass. The Controller orchestrates deposit validation, fee routing, collateral custody, and share minting. The flow structure is sound: Checks-Effects-Interactions ordering holds, reentrancy guards are present, and invariants verify Controller balance neutrality.

However, a **critical first-depositor / inflation attack vector** exists. A direct ERC20 transfer to CustodyVault inflates `totalAssets` without minting shares, enabling an attacker to steal subsequent deposits via proportional share rounding truncation. The existing review documents claim "Max Deposit Bounds" mitigate this — they do not. There is no minimum deposit floor, no virtual shares offset, and no dead-shares burn. This alone makes the pipeline **not production-ready**.

---

## 1. Architecture Review

### 1.1 Contract Responsibilities

| Contract                 | Responsibility                                                  | SRP                   |
| ------------------------ | --------------------------------------------------------------- | --------------------- |
| **UnifyVaultController** | Orchestrator: validates, routes collateral, coordinates minting | ✅ Single coordinator |
| **FeeLib**               | Pure fee math (25 BPS deposit & redeem)                         | ✅ Pure library       |
| **ShareLib**             | Pure share math (bootstrap + proportional)                      | ✅ Pure library       |
| **CustodyVault**         | Passive collateral custody; no pricing or tokenomics            | ✅                    |
| **Treasury**             | Fee collection and protocol asset storage                       | ✅                    |
| **UVBTCETHToken**        | ERC20 + Permit; mint/burn restricted to CONTROLLER_ROLE         | ✅                    |
| **OracleManager**        | Multi-provider price normalization with fallback                | ✅                    |
| **ProtocolDirectory**    | Module address registry                                         | ✅                    |

**Architecture Verdict:** Clean separation of concerns. Each module has a single clear purpose.

### 1.2 Dependency Flow

```
User
  │
  ▼
UnifyVaultController.deposit()
  │
  ├─► _validateDeposit() [view pipeline]
  │     ├─► CustodyVault.assetConfig()        [asset enabled?]
  │     ├─► IOracle.isPriceFresh()             [staleness?]
  │     ├─► IOracle.getAssetPrice()            [normalized price]
  │     ├─► IOracleProvider.getLatestRound()   [raw price — informational]
  │     ├─► FeeLib.calculateDepositFee()       [fee]
  │     ├─► FeeLib.calculateNetDeposit()       [net]
  │     ├─► CustodyVault.balance()             [totalAssets]
  │     ├─► IERC20.totalSupply()               [totalSupply]
  │     └─► ShareLib.calculateShares()         [preview]
  │
  ├─► [Re-calculate shares with live state]
  │     ├─► CustodyVault.balance()
  │     ├─► IERC20.totalSupply()
  │     └─► ShareLib.calculateShares()
  │
  ├─► CustodyVault.deposit(net)                [user → vault]
  ├─► IERC20.transferFrom(user→controller, fee)
  ├─► IERC20.approve(treasury, fee)
  ├─► ITreasury.collectFee(fee)                [controller → treasury]
  ├─► IERC20.approve(treasury, 0)
  │
  ├─► [Balance verification for FoT/rebasing detection]
  │
  └─► UVBTCETHToken.mint(receiver, shares)
```

### 1.3 Storage Ownership

| Storage            | Owner                   | Notes                              |
| ------------------ | ----------------------- | ---------------------------------- |
| `_assets` mapping  | CustodyVault, Treasury  | Per-contract asset registry        |
| `_maxDeposit`      | UnifyVaultController    | Governance-configurable            |
| `_assets` (Oracle) | OracleManager           | Provider configurations            |
| Token balances     | CustodyVault / Treasury | ERC20 balanceOf as source of truth |

**Finding A1 (LOW):** CustodyVault has no barrier against direct ERC20 transfers. Anyone can `IERC20.transfer(custodyVaultAddress, amount)` and inflate `totalAssets` without the Controller's knowledge. This is the root cause of the inflation attack (see §2.6).

### 1.4 Access Control

| Role            | Pause | Unpause | Config | Deposit/Withdraw | Mint/Burn |
| --------------- | ----- | ------- | ------ | ---------------- | --------- |
| GOVERNANCE_ROLE | ❌    | ✅      | ✅     | ❌               | ❌        |
| GUARDIAN_ROLE   | ✅    | ❌      | ❌     | ❌               | ❌        |
| CONTROLLER_ROLE | ❌    | ❌      | ❌     | ✅               | ✅        |
| BOT_ROLE        | ❌    | ❌      | ❌     | ❌               | ❌        |

Pause/unpause separation is correct: Guardian stops, Governance resumes.

**Finding A2 (INFO):** `BOT_ROLE` is defined but unused in any gating logic. This is future scaffolding.

**Finding A3 (LOW):** `GUARDIAN_ROLE` is redefined per-contract (`keccak256('GUARDIAN_ROLE')`) instead of importing from `AccessRoles.GUARDIAN_ROLE`. The hashes match, so this is not a bug, but it's inconsistent — `GOVERNANCE_ROLE` is imported from AccessRoles. Resolves at zero cost by using the library constant.

### 1.5 Upgrade Readiness

All contracts are **non-upgradeable** (no proxies). This is a security-positive design choice but means bug fixes require migration.

---

## 2. Economic Review

### 2.1 Fee Calculation

```
FeeLib: DEPOSIT_FEE_BPS = 25 (0.25%)
Fee = (amount * 25) / 10000
Net = amount - fee
```

For amounts < 400 wei, fee truncates to 0. For amounts < 10000 wei, precision loss < 1 wei.

**Finding E1 (LOW):** Dust deposits (e.g., 399 wei) pay zero fee. Not exploitable at scale but allows fee-free micro-deposits. Consider a minimum deposit floor of `BPS_DENOMINATOR / DEPOSIT_FEE_BPS = 400` to ensure all deposits contribute fees.

### 2.2 Share Pricing

```
Bootstrap (totalSupply == 0 || totalAssets == 0):
    shares = netDeposit

Proportional:
    shares = (netDeposit * totalSupply) / totalAssets
```

Truncation rounds **down** (in vault's favor). Correct rounding direction for deposits.

### 2.3 Bootstrap Logic

On first deposit: `shares = netDeposit`. The user gets 1:1 shares for their net collateral. This is standard.

**Finding E2 (MEDIUM):** If `totalAssets == 0` but `totalSupply > 0` (could happen if all collateral is withdrawn but shares remain burned/held), the formula falls through to `return netDeposit` (line 23-24 of ShareLib). This violates the proportional invariant: depositors may get disproportionate shares. This can only occur if `totalSupply > 0` AND `totalAssets == 0`, which requires prior redemption (not yet implemented). Document and test this edge case when redemption is built.

### 2.4 NAV Correctness

`totalAssets` = `CustodyVault.balance(asset)` — strictly the vault's ERC20 balance.

Treasury balances are excluded. This is correct: fees are protocol revenue, not depositor collateral.

### 2.5 Treasury Exclusion

Protocol fees flow to Treasury and are permanently excluded from `totalAssets`. Depositors only earn on net collateral in the vault. This is the correct Vault/Treasury segregation model.

### 2.6 Inflation / First Depositor Attack — CRITICAL

**Attack Vector:**

1. Attacker deposits 1 wei → gets 1 wei UVBTCETH (`totalSupply = 1`).
2. Attacker directly transfers 1,000,000 USDC to CustodyVault address via ERC20 transfer (`totalAssets = 1,000,001` in wei-equivalent).
3. Victim deposits 1,000 USDC (net after fee).
   - `shares = (netDeposit * totalSupply) / totalAssets = (1000e6 * 1) / (1000001e6) = 0`
   - Victim gets **0 shares**, loses 1,000 USDC.
4. Attacker redeems 1 share → gets `1 * totalAssets / totalSupply ≈ 1,000,001` (effectively draining the vault).

**Root Cause:** CustodyVault has no barrier against direct ERC20 transfers. `totalAssets` reads from `IERC20(asset).balanceOf(address(this))`, which anyone can inflate.

**Existing Documentation Claim (INCORRECT):**

> "Max Deposit Bounds: Governance enforces upper and lower validation checks."

The current code has:

- `_maxDeposit` — upper bound only. Default is `type(uint256).max`.
- No `_minDeposit` variable exists.
- No lower-bound check in `_validateDeposit`.

**Standard Mitigations (choose one):**

| Mitigation                                                                         | Effort  | Gas Cost                       |
| ---------------------------------------------------------------------------------- | ------- | ------------------------------ |
| Virtual shares offset (like OZ ERC4626 `_decimalsOffset()`)                        | Medium  | +1 SLOAD per mint              |
| Burn dead shares on first deposit (send 1000 wei to address(0))                    | Low     | +1 mint per deployment         |
| Minimum deposit floor                                                              | Trivial | +1 comparison                  |
| CustodyVault tracks an internal `_accountedBalance` instead of raw ERC20 balanceOf | Medium  | +1 SSTORE per deposit/withdraw |

**Recommendation:** Implement the OpenZeppelin virtual shares approach (bootstrap `totalSupply` at `10**decimals()`). This is the industry standard and provides mathematical protection against all inflation vectors.

### 2.7 Fee Accounting

Fee splits are verified with strict pre/post balance checks:

```solidity
vaultReceived = vaultBalanceAfter - vaultBalanceBefore
treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore

if (vaultReceived != quote.netDeposit) revert InsufficientReserves(...)
if (treasuryReceived != quote.protocolFee) revert InsufficientReserves(...)
```

This correctly detects fee-on-transfer tokens and rebasing tokens, rejecting them. ✅

### 2.8 Share Conservation

Invariant `invariant_shareConservation` verifies `totalSupply == cumulativeExpectedShares`. ✅

---

## 3. Security Review

### 3.1 Reentrancy

| Function                  | Guard          |
| ------------------------- | -------------- |
| `Controller.deposit()`    | `nonReentrant` |
| `CustodyVault.deposit()`  | `nonReentrant` |
| `CustodyVault.withdraw()` | `nonReentrant` |
| `Treasury.collectFee()`   | `nonReentrant` |
| `Treasury.withdraw()`     | `nonReentrant` |

All state-changing functions are protected. Checks-Effects-Interactions ordering: all validation completes before any external calls in the deposit path. ✅

**Finding S1 (INFO):** The `Controller.deposit()` function has a nested `nonReentrant` call chain: `Controller.deposit()` → `CustodyVault.deposit()` (also `nonReentrant`), then `Treasury.collectFee()` (also `nonReentrant`). OpenZeppelin v5 uses a counter-based reentrancy guard (not boolean), so nested calls across different contracts don't conflict. Each contract has its own guard state. ✅

### 3.2 Flash Loan Attack Surface

The deposit pipeline does not use time-weighted values or manipulate prices. Flash loans could be used to:

- Inflate deposits → but there's no immediate arbitrage because shares are minted at the same proportional rate
- Front-run oracle updates → mitigated by `isPriceFresh()` staleness check

**Verdict:** Low risk. Flash loans confer no unfair advantage in the current deposit pipeline.

### 3.3 Oracle Assumptions

The Controller makes **three** external oracle calls per deposit in `_validateDeposit`:

1. `IOracle(_oracle).isPriceFresh(asset)` — staleness check
2. `IOracle(_oracle).getAssetPrice(asset)` — normalized price (via `OracleManager.getNormalizedPrice` → `getPrice` → provider `getLatestRound`)
3. `IOracleProvider(provider).getLatestRound(assetId).price` — raw price (informational only)

**Finding S2 (MEDIUM):** Call #3 is purely informational — `rawPrice` is stored in the quote but never used for validation. It costs an extra external call with no security benefit. Remove it or replace with a single OracleManager call that returns both normalized and raw prices.

**Finding S3 (MEDIUM):** Between call #1 (staleness check) and calls #2/#3 (price fetch), the oracle could become stale. In theory, `isPriceFresh` returns `true`, then the price feed updates, and `getAssetPrice` returns a different value. This is inherent to multi-call architectures. Impact is minimal since all calls occur atomically in a single view function.

### 3.4 Access Control

**Finding S4 (INFO):** `setMaxDeposit` (line 123) has no event emission. Governance parameter changes should emit events for off-chain monitoring.

```solidity
// Current:
function setMaxDeposit(uint256 maxDeposit_) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
  _maxDeposit = maxDeposit_;
}

// Recommended: emit MaxDepositUpdated(oldMaxDeposit, maxDeposit_);
```

### 3.5 ERC20 Compatibility

| Token Type                   | Behavior                                                 | Status    |
| ---------------------------- | -------------------------------------------------------- | --------- |
| Standard ERC20               | Works                                                    | ✅        |
| Fee-on-Transfer              | Rejected (balance check)                                 | ✅        |
| Rebasing                     | Rejected (balance check)                                 | ✅        |
| ERC777 hooks                 | Protected (nonReentrant)                                 | ✅        |
| USDT (non-standard approve)  | At risk                                                  | ⚠️ See S5 |
| Tokens with `decimals != 18` | Oracle normalizes price, but share math uses raw amounts | ⚠️ See S6 |

**Finding S5 (MEDIUM):** `IERC20(asset).approve(_treasury, 0)` on line 172 may revert for tokens like USDT that require `approve(0)` first, then `approve(amount)`. USDT's approve function reverts when changing a non-zero allowance to another non-zero value without first setting to zero. The current flow is:

1. `approve(treasury, fee)` ← sets allowance to `fee`
2. `collectFee` consumes the allowance
3. `approve(treasury, 0)` ← resets to 0

This should work because step #2 consumes the entire allowance (bringing it to 0). But if fee is 0, step #3 would try `approve(treasury, 0)` after `approve(treasury, 0)` — which is safe. **Verdict:** Likely safe but warrants a USDT-specific integration test.

**Finding S6 (LOW):** The deposit flow reads `totalAssets` and `totalSupply` in raw token amounts (not normalized). When multiple assets with different decimals are supported, share pricing across assets may be inconsistent. This is noted as a multi-asset future concern.

### 3.6 Controller Balance Invariant

The `invariant_controllerBalanceNeutral` test verifies `controller.balance == 0`. During execution, the Controller transiently holds the protocol fee between `safeTransferFrom(user, controller)` and `collectFee()`. This is a brief window but is guaranteed to clear before the function returns (enforced by the balance check). ✅

### 3.7 Treasury `collectFee` uses `safeTransferFrom`

```solidity
// Treasury.sol line 80:
IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
```

`msg.sender` = Controller. Controller must have approved Treasury for the fee amount, which it does on line 166. This two-hop pattern (user→controller→treasury) is verified by balance deltas. ✅

---

## 4. Code Quality

### 4.1 Duplication

| Duplicate                                                  | Locations                                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `AssetConfig` struct                                       | CustodyVault.sol, Treasury.sol (identical)                                             |
| `registerAsset / enableAsset / disableAsset / removeAsset` | CustodyVault.sol, Treasury.sol (near-identical)                                        |
| `GUARDIAN_ROLE` definition                                 | All 4 contracts (should use AccessRoles)                                               |
| `MockERC20`                                                | 4 test files (DepositCollateral, DepositFeeRouting, DepositMinting, DepositValidation) |

**Finding C1 (MEDIUM):** `AssetConfig` and asset lifecycle management (register/enable/disable/remove) are duplicated across CustodyVault and Treasury. Consider extracting to a shared base contract or library.

### 4.2 Library Usage

| Library             | Status                                                          |
| ------------------- | --------------------------------------------------------------- |
| **FeeLib**          | ✅ Used by Controller and tests                                 |
| **ShareLib**        | ✅ Used by Controller and DepositMinting tests                  |
| **AccessRoles**     | ⚠️ Partially used — GOVERNANCE_ROLE imported, GUARDIAN_ROLE not |
| **Constants**       | ❌ Unused — FeeLib defines its own `BPS_DENOMINATOR`            |
| **SafeTransferLib** | ❌ Empty placeholder                                            |
| **MathUtils**       | ❌ Barely used (placeholder `mulDiv`)                           |

**Finding C2 (LOW):** `Constants.sol` defines `BASIS_POINTS_DIVISOR = 10000` and `MAX_FEE_BPS = 100`. FeeLib defines its own `BPS_DENOMINATOR = 10000`. Consolidate or remove the unused constants file.

### 4.3 Readability

- Function names are self-documenting. ✅
- Naming convention is consistent. ✅
- NatSpec exists on all public/external functions. ✅
- Complex balance verification has inline comments. ✅

### 4.4 Gas Optimizations

| Finding                                                                                   | Impact                                | Recommendation                                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Triple oracle call (C3)                                                                   | +~20k gas                             | Cache raw price from first OracleManager call                 |
| Fee routing through Controller (C4)                                                       | +~50k gas (2 transfers + 2 approvals) | Use direct user→Treasury transfer with separate user approval |
| Duplicate asset enabled check (C5)                                                        | +~2k gas                              | Controller validates; Vault validates again in `deposit()`    |
| `_validateDeposit` re-reads `totalAssets` and `totalSupply`; `deposit()` reads again (C6) | +~4k gas                              | Pass cached values from validation to execution               |

### 4.5 Naming Consistency

**Finding C7 (LOW):** In Controller.sol line 303, the revert error uses `EnforcedPause()` but the import is `Pausable` from OZ v5 which emits `EnforcedPause()`. When `whenNotPaused` modifier triggers, it uses a different error. Both revert with `EnforcedPause()`. The explicit check `if (paused()) revert EnforcedPause()` on line 302-304 is redundant with the `whenNotPaused` modifier on line 144. ✅ — safe but unnecessary.

---

## 5. Testing Review

### 5.1 Coverage Summary

| Suite             | Unit   | Fuzz  | Invariant | Total  |
| ----------------- | ------ | ----- | --------- | ------ |
| DepositCollateral | 7      | 1     | 4         | 12     |
| DepositValidation | 10     | 1     | 1         | 12     |
| DepositFeeRouting | 4      | 1     | 4         | 9      |
| DepositMinting    | 7      | 1     | 4         | 12     |
| **Total**         | **28** | **4** | **13**    | **45** |

**All 45 tests pass.** ✅

### 5.2 Fuzz Coverage

Fuzz ranges:

- Deposit amounts: `10000` to `1000000000 * 10**18` wei
- Prices: `100` to `10000000 * 10**18`
- Default runs: 256

Fuzz tests cover happy paths but do not fuzz edge cases (boundary values, 0, max uint256). ✅ adequate for current stage.

### 5.3 Invariant Coverage

| Invariant                                     | Verified             |
| --------------------------------------------- | -------------------- |
| Controller balance always 0                   | ✅                   |
| Vault balance = cumulative expected net       | ✅                   |
| Treasury balance = cumulative expected fee    | ✅                   |
| Share conservation (supply matches expected)  | ✅ (Minting only)    |
| Token supply unchanged during validation-only | ✅ (Validation only) |

### 5.4 Missing Edge Cases

| Missing Test                                  | Severity                                                        |
| --------------------------------------------- | --------------------------------------------------------------- |
| First depositor inflation attack reproduction | **HIGH**                                                        |
| Direct ERC20 transfer to CustodyVault bypass  | **HIGH**                                                        |
| Deposit with amount = 399 (zero fee)          | MEDIUM                                                          |
| USDT-style non-standard approve               | MEDIUM                                                          |
| `minSharesOut` boundary (exactly matching)    | LOW                                                             |
| Gas griefing with many tiny deposits          | LOW                                                             |
| `_maxDeposit` update during active deposit    | LOW                                                             |
| Multiple consecutive deposits from same user  | LOW                                                             |
| Deposit to receiver ≠ msg.sender              | LOW (test `testSecondDepositProportional` uses different users) |

### 5.5 Negative Tests

All validation rejection paths are tested:

- Unsupported asset ✅
- Disabled asset ✅
- Zero amount ✅
- Zero receiver ✅
- Stale oracle ✅
- Offline oracle ✅
- Slippage exceeded ✅
- Max deposit limit ✅
- Paused protocol ✅
- Insufficient balance ✅
- Insufficient allowance ✅
- Fee-on-transfer rejection ✅
- Rebasing rejection ✅
- Unauthorized mint ✅

### 5.6 Event Validation

- `DepositCollateralReceived` ✅ (tested in DepositCollateral, FeeRouting)
- `ProtocolFeeCollected` ✅ (tested in FeeRouting)
- `DepositCompleted` ✅ (tested in Minting)
- `EmergencyPaused` / `EmergencyResumed` ⚠️ Not explicitly tested in deposit suite (tested in Controller suite)

---

## 6. Summary of All Findings

### Critical

| ID           | Finding                                                                                                                                                      | Location                                          | Impact                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------- |
| **F-CRIT-1** | **Inflation / First-Depositor Attack** — Direct ERC20 transfers to CustodyVault inflate `totalAssets`, enabling share-value manipulation and depositor theft | `ShareLib.sol` + `CustodyVault.sol` balance model | **Theft of user deposits** |

### High

| ID           | Finding                                                   | Location                                | Impact                   |
| ------------ | --------------------------------------------------------- | --------------------------------------- | ------------------------ |
| **F-HIGH-1** | No minimum deposit enforcement — dust deposits avoid fees | `UnifyVaultController._validateDeposit` | Fee avoidance            |
| **F-HIGH-2** | `setMaxDeposit` has no event emission                     | `UnifyVaultController.sol:123`          | Off-chain monitoring gap |

### Medium

| ID          | Finding                                                        | Location                           | Impact                              |
| ----------- | -------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| **F-MED-1** | Triple oracle calls per deposit (raw price is unused)          | `_validateDeposit` lines 328-341   | Gas waste + potential inconsistency |
| **F-MED-2** | USDT non-standard approve compatibility not tested             | `Controller.deposit` line 166-172  | Possible revert with USDT           |
| **F-MED-3** | AssetConfig struct and lifecycle duplicated (Vault + Treasury) | `CustodyVault.sol`, `Treasury.sol` | Maintenance burden                  |
| **F-MED-4** | `totalAssets == 0 && totalSupply > 0` edge case in ShareLib    | `ShareLib.sol:23-24`               | Incorrect pricing (post-redemption) |

### Low

| ID      | Finding                                                                      |
| ------- | ---------------------------------------------------------------------------- |
| F-LOW-1 | `GUARDIAN_ROLE` redefined per-contract instead of importing from AccessRoles |
| F-LOW-2 | `BOT_ROLE` defined but unused                                                |
| F-LOW-3 | `Constants.sol` unused — FeeLib defines own constants                        |
| F-LOW-4 | `SafeTransferLib.sol` is an empty placeholder                                |
| F-LOW-5 | `MathUtils.mulDiv` is a placeholder without overflow protection              |
| F-LOW-6 | `EnforcedPause()` check duplicated (explicit + modifier)                     |
| F-LOW-7 | `rawPrice` fetched but never used in any computation or validation           |

---

## 7. Recommendations

### Blocking (Required before production)

1. **Implement inflation attack mitigation.** Strongly recommend OpenZeppelin-style virtual shares (set initial `totalSupply` to a non-zero offset like `10**decimals`). At minimum, add a `_minDeposit` floor and burn dead shares on first deposit.
2. Add a dedicated reproduction test for the inflation attack scenario.

### High Priority (Required before audit)

3. Add `MaxDepositUpdated` event to `setMaxDeposit`.
4. Implement minimum deposit enforcement (≥ `BPS_DENOMINATOR / DEPOSIT_FEE_BPS = 400`).
5. Add USDT integration test for approve/approve-zero pattern.

### Medium Priority (Before mainnet)

6. Remove the redundant raw price oracle call or consolidate into a single OracleManager query.
7. Extract shared `AssetConfig` lifecycle into a base contract or library.
8. Add test for `totalAssets == 0 && totalSupply > 0` edge case.

### Low Priority (Nice-to-have)

9. Consolidate `GUARDIAN_ROLE` to use `AccessRoles.GUARDIAN_ROLE` across all contracts.
10. Remove or populate `SafeTransferLib.sol`.
11. Add overflow protection to `MathUtils.mulDiv` or remove it.
12. Remove `Constants.sol` or consolidate with FeeLib constants.

---

## 8. Remaining Work Before Redemption Implementation

| Task                                   | Blocks Redemption?                                |
| -------------------------------------- | ------------------------------------------------- |
| Inflation attack mitigation (F-CRIT-1) | ✅ Yes — NAV manipulation affects redemptions too |
| Minimum deposit enforcement (F-HIGH-1) | No                                                |
| Oracle call consolidation (F-MED-1)    | No, but recommended                               |
| ShareLib edge case testing (F-MED-4)   | ✅ Yes — affected by redemptions                  |
| USDT compatibility (F-MED-2)           | No                                                |

---

## 9. Final Verdict

# FAIL

The deposit pipeline architecture is clean and well-structured, with comprehensive test coverage and correct Checks-Effects-Interactions ordering. However, the **inflation / first-depositor attack vector (F-CRIT-1)** is a production-blocking vulnerability that can result in direct theft of user deposits.

**The MINTING_ENGINE_REVIEW.md claims mitigation exists where it does not.**

Before proceeding to Redemption implementation, the inflation attack must be addressed with a mathematically sound mitigation (virtual shares offset or equivalent).

### Blocking Issues for `FAIL`:

1. **F-CRIT-1:** No inflation attack protection — direct ERC20 transfers to CustodyVault can be exploited to steal user deposits via share rounding truncation.

---

_Generated by Deep Code Audit Engine — v0.6.4_
