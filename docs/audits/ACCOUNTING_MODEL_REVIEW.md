# UnifyVault Internal Accounting Model Review

This document summarizes the design, implementation, and security guarantees of the Internal Asset Accounting system introduced for the UnifyVault Protocol in Sprint v0.6.5.

---

## 1. Internal Accounting Architecture

To mitigate first-depositor and pool-share inflation attacks, raw contract token balance queries are decoupled from index pricing math:

- **Legacy Model (Vulnerable):**
  `totalAssets = IERC20(asset).balanceOf(address(vault))`
- **New Accounting Model (Secure):**
  `totalAssets = accountedAssets`

Within [CustodyVault.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/src/vault/CustodyVault.sol), a private mapping `_accountedAssets` is maintained. This mapping is only incremented via authorized `deposit` calls and decremented via authorized `withdraw` calls from the controller.

---

## 2. Public Getters & Surplus Tracking

- **`totalAssets(address asset)`:** Exposes the internally accounted collateral amount for a supported asset. Used by the controller to calculate share allocations.
- **`surplusAssets(address asset)`:** Computes any unsolicited ERC20 donations by evaluating `IERC20(asset).balanceOf(address(this)) - accountedAssets`.

---

## 3. Donation and NAV Security

Direct ERC20 donations made to the `CustodyVault` contract:

1.  **Do NOT** increment `accountedAssets`.
2.  **Do NOT** alter NAV calculations.
3.  **Do NOT** dilute subsequent depositor share mints.

By ignoring unsolicited donations, the share exchange rate remains stable, preventing attackers from inflating the NAV per share and causing precision rounding loss to other depositors.

---

## 4. Self Audit

- **First-Depositor Attack:** Mitigated. Direct token transfers to the vault no longer inflate `totalAssets`.
- **Donation Attack:** Mitigated. Direct transfer yields a high `surplusAssets` value but has no effect on share allocation calculations.
- **Share Math Integrity:** The core proportional formula `shares = (netDeposit * totalSupply) / totalAssets` remains unchanged, but is now computed with high precision against the immutable accounted ledger state.
