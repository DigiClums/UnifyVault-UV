# UnifyVault Fee Routing Review

This document summarizes the architecture, lifecycle, accounting system, and security considerations of the protocol fee collection system implemented for the UnifyVault Protocol in Sprint 6B.3.

---

## 1. Architecture

The protocol fee system coordinates three key modules under the orchestration of `UnifyVaultController`:

1.  **Fee Calculation (FeeLib):** A pure utility library (`FeeLib.sol`) containing fee constants and calculations (25 BPS fee for deposits/redemptions), which isolates mathematical complexity from contract storage and state variables.
2.  **Asset Custody (CustodyVault):** Receives ONLY the net collateral amount of deposits, remaining completely unaware of price coordinates, tokenomics, or protocol fees.
3.  **Fee Collection (Treasury):** Receives the collected protocol fee portion of every deposit, storing and accounting for the protocol's earned fee reserves.

---

## 2. Fee Lifecycle

For every `deposit()` call:

1.  **Validation & Quote:**
    - The `Controller` computes the deposit fee and the net deposit amount using `FeeLib`.
    - The quote is generated using the net deposit amount (deducting the fee before computing the expected shares output).
2.  **Double-Split Transfer:**
    - **Net Collateral Flow:** The `Controller` calls `CustodyVault.deposit` to pull `netDeposit` from the user directly into the vault.
    - **Fee Routing Flow:** The `Controller` pulls `protocolFee` from the user into the `Controller`, approves the `Treasury`, and coordinates fee routing via `Treasury.collectFee`.
    - **Finalization:** The `Controller` resets the Treasury approval to `0`.
3.  **Telemetry & Emission:**
    - Emits `DepositCollateralReceived` with the net deposit amount.
    - Emits `ProtocolFeeCollected` with the routed fee amount.

---

## 3. Accounting & Balance Verification

To maintain accounting integrity and prevent errors such as tax-on-transfer deductions or rounding leakages, the `Controller` performs strict pre- and post-balance checks:

- **Balance Safety Bounds:**
  - `vaultBalanceAfter - vaultBalanceBefore == netDeposit`
  - `treasuryBalanceAfter - treasuryBalanceBefore == protocolFee`
- **Balance Neutrality:**
  - The `Controller` transiently holds the fee, but at the end of execution, its balance is verified to be exactly `0`.

---

## 4. Security Review

- **Precision and Rounding:**
  - Uses basis points (BPS) math with `BPS_DENOMINATOR = 10000`.
  - Fees are truncated in favor of the vault (the protocol fee is calculated via standard division, and net deposit is `amount - fee`, meaning any rounding dust remains as vault collateral).
- **Reentrancy Guard:**
  - The `deposit` function is protected by the `nonReentrant` modifier.
  - State validations are fully completed before any token transfers are executed.
- **Access Control:**
  - `Treasury.collectFee` and `CustodyVault.deposit` require the `CONTROLLER_ROLE` ensuring only governance-approved orchestrators can execute transfers.
