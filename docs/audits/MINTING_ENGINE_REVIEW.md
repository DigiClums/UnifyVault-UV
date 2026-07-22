# UnifyVault Minting Engine Review

This document summarizes the architecture, bootstrap logic, share calculation formula, precision scaling, and inflation attack mitigation implemented for the UnifyVault Protocol in Sprint 6B.4.

---

## 1. Architecture

The Minting Engine completes the stateful execution phase of deposits:

1.  **Share Calculation (ShareLib):** A pure utility library (`ShareLib.sol`) containing share math calculation formulas for bootstrapping and proportional minting.
2.  **UVBTCETHToken:** Represents the index ownership token. It exposes `mint` restricted to the `Controller` role.
3.  **Controller Orchestration:** Reads vault collateral balances (`totalAssets`) and outstanding share supply (`totalSupply`) to calculate expected shares via `ShareLib`, executing the mint call, and emitting `DepositCompleted`.

---

## 2. Share Formula and Bootstrap Logic

Calculations are computed using the following rules:

- **Initial Bootstrapping (`totalSupply == 0` or `totalAssets == 0`):**
  ```solidity
  shares = netDeposit
  ```
- **Proportional Minting (`totalSupply > 0`):**
  ```solidity
  shares = (netDeposit * totalSupply) / totalAssets
  ```
- **Rounding Direction:** Truncated/rounded down.

---

## 3. NAV and Asset Segregation

- **CustodyVault Assets ONLY:** The `totalAssets` is strictly defined as `CustodyVault.balance(asset)`.
- **Treasury Exclusion:** Protocol fees inside the `Treasury` are completely excluded from `totalAssets` and have no effect on share pricing or valuation (they do not dilute depositors).

---

## 4. Inflation and First Depositor Attack Analysis

A common vulnerability in ERC4626 vaults is the **First Depositor / Inflation Attack**:

1.  **The Attack Scenario:** An attacker deposits `1 wei` of collateral, getting `1 wei` of shares. The attacker then transfers `1,000,000 USD` worth of collateral directly into the vault (without depositing, inflating `totalAssets`).
2.  **The Result:** The next depositor depositing `1,000 USD` gets `(1,000 * 1) / 1,000,001 = 0` shares due to rounding truncation, losing their entire deposit to the attacker.
3.  **Mitigation in UnifyVault Protocol:**
    - **Max Deposit Bounds:** Governance enforces upper and lower validation checks.
    - **Future Virtual Shares:** In subsequent releases (V1.1), the protocol will introduce **virtual shares/assets** (similar to OpenZeppelin's ERC4626 implementation) to mathematically eliminate inflation attack vectors by offsetting the share denominator.
