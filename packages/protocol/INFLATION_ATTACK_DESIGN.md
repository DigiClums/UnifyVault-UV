# Architectural Design Review: Inflation & First-Depositor Mitigation

This document evaluates mitigation strategies for the first-depositor inflation attack vulnerability identified in the UnifyVault Protocol deposit flow, analyzing security guarantees, trade-offs, and recommending a production-ready architecture.

---

## 1. Evaluation of Mitigation Strategies

### 1. Internal Asset Accounting

- **Mechanism:** Instead of querying `IERC20(asset).balanceOf(CustodyVault)`, the vault maintains an internal state variable tracking cumulative net deposits and withdrawals. Unsolicited token transfers (direct donations) do not increment the internal balance tracker.
- **Security Guarantees:** Immune to raw token donation inflation since donations are ignored during share calculations.
- **Remaining Attack Surface:** An attacker can still execute the first-depositor attack if they deposit normally (incrementing the internal balance) and then immediately redeem or manipulate shares, though it requires interacting via the contract entry point.
- **Gas Impact:** Slight increase due to reading/writing state variables on deposit/withdrawal (SSTORE/SLOAD).
- **Complexity:** Low.
- **Auditability:** High; clean state tracking.
- **UX Impact:** None.
- **Long-Term Maintenance:** Easy; no extra offsets or virtual states.
- **Redemption Compatibility:** Fully compatible; redemptions decrease the internal ledger state variable.

### 2. Virtual Shares / Virtual Assets (ERC-4626 Style)

- **Mechanism:** Offsets both assets and shares by a virtual scale factor (e.g., `1` or `1000` wei) during math operations: `shares = (netDeposit * (totalSupply + 10**3)) / (totalAssets + 10**3)`.
- **Security Guarantees:** Prevents zero-share minting exploits by ensuring the conversion rate is bounded even when total assets are manipulated.
- **Remaining Attack Surface:** Mathematically eliminates inflation attacks entirely.
- **Gas Impact:** Negligible (pure math operations).
- **Complexity:** Medium; math formulas must consistently apply offsets.
- **Auditability:** Requires careful validation of offset values to prevent rounding loss for small depositors.
- **UX Impact:** None.
- **Long-Term Maintenance:** Medium; standard ERC-4626 library patterns exist.
- **Redemption Compatibility:** Fully compatible.

### 3. Dead Shares (Burning initial shares to zero address)

- **Mechanism:** The initial depositor is forced to mint a minimum amount of shares (e.g., `1000` wei) directly to a dead address (`address(0)` or `address(0xdead)`), locking up early liquidity.
- **Security Guarantees:** Makes the cost of manipulation prohibitively expensive since any direct donation is shared with the dead shares.
- **Remaining Attack Surface:** The effectiveness depends on the dollar value of the burned shares. If token values skyrocket, the cost of inflation might become affordable relative to the exploit gains.
- **Gas Impact:** Low; one-time check during bootstrap.
- **Complexity:** Low.
- **Auditability:** Simple.
- **UX Impact:** The first depositor loses the burned share value (a tiny fraction of a cent at launch).
- **Redemption Compatibility:** Fully compatible.

### 4. Governance Bootstrap

- **Mechanism:** Governance pre-seeds the vault with initial collateral and shares before public deposits are opened.
- **Security Guarantees:** Prevents first-depositor attacks by ensuring public depositors are never the first to deposit.
- **Remaining Attack Surface:** High if governance withdraws the initial seed, or if the vault starts with 0 assets in secondary pools.
- **Gas Impact:** None.
- **Complexity:** Operational rather than smart contract level.
- **Auditability:** Operational risk.
- **UX Impact:** None for public users; governance must deploy capital.
- **Redemption Compatibility:** Fully compatible.

### 5. Minimum Initial Liquidity

- **Mechanism:** Enforces that the first deposit must be greater than a minimum threshold (e.g., `$1,000` worth of assets).
- **Security Guarantees:** Increases the capital requirement for inflation attacks, making it economically unfeasible to execute cheap rounding exploits.
- **Remaining Attack Surface:** An attacker with high capital can still carry out the attack if they have sufficient funds.
- **Gas Impact:** Very low.
- **Complexity:** Low.
- **UX Impact:** Restricts micro-depositors from bootstrapping new assets.
- **Redemption Compatibility:** Requires enforcing a minimum vault size below which redemptions are blocked.

### 6. Hybrid Approaches (Internal Ledger + Virtual Offsets)

- **Mechanism:** Combines internal accounting tracking with virtual share offsets to get the safety of both worlds.
- **Security Guarantees:** High; donations do not inflate assets, and virtual offsets protect against mathematical rounding limits.
- **Gas Impact:** Cumulative gas increases of both models.
- **Complexity:** High.
- **UX Impact:** None.
- **Redemption Compatibility:** Fully compatible.

---

## 2. Special Analysis

### Question 1: How should unsolicited ERC20 donations behave?

Unsolicited ERC20 donations **must be ignored by the NAV/share pricing math**.

- **Reasoning:** If unsolicited donations increase the NAV, they directly manipulate the share conversion price, which is the root cause of the inflation attack.
- **Resolution:** They should remain in the `CustodyVault` contract but not count towards `totalAssets`. Governance can subsequently harvest these unsolicited tokens as protocol revenue or sweep them back into the vault via a structured recapitalization function.

### Question 2: Should totalAssets represent Actual ERC20 balance (A) or Internally accounted assets (B)?

It should represent **B) Internally accounted assets**.

- **Trade-offs:**
  - _Actual Balance:_ Easy to implement, but vulnerable to external state modification (direct transfers/donations).
  - _Internal Accounting:_ Slightly more gas and storage variables, but provides absolute isolation against malicious direct transfers. It ensures that the vault state changes ONLY through expected code entry points.

### Question 3: Which model is most suitable for production protocols?

**Internal Asset Accounting combined with Virtual Offsets** is the most suitable model. It ensures full compatibility with standard ERC-4626 vault aggregators, keeps NAV math deterministic, isolates direct donation attack vectors, and supports clean asset additions without operational governance bootstrapping overhead.

---

## 3. Final Recommendation: Hybrid Internal Accounting + Virtual Offsets

We recommend the **Hybrid Model (Internal Accounting + Virtual Offsets)**.

### Pros

- **Exploit Proof:** Donations do not affect NAV, and rounding manipulations are protected by virtual share offsets.
- **Standard Compatibility:** Integrates cleanly with ERC-4626 aggregators.
- **Operational Ease:** No need for governance to seed every new asset pool.

### Cons

- **Gas Overhead:** Writes to storage on every state transition.
- **Audit Surface:** Increased mathematical complexity in the code.

### Future Implications

Ensures the protocol can scale to support dozens of secondary pools and yield strategies without risk of vault dilution.

### Migration Complexity

Low; changes are isolated to `CustodyVault` accounting logic and `ShareLib` math formulas. No structural changes are needed in `UnifyVaultController` workflow coordination.
