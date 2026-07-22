# UnifyVault Deposit Validation Layer Review

This document outlines the architectural specifications, validation order, state safety, and security mechanisms implemented in the deposit validation layer of `UnifyVaultController`.

---

## 1. Validation Order Pipeline

The validation logic in `UnifyVaultController._validateAndCalculateDeposit` executes checks in the exact order requested:

1.  **Protocol Paused Check:** Reverts with `EnforcedPause()` if the guardian has paused the system.
2.  **Asset Supported Check:** Queries `CustodyVault` configuration mapping. Reverts if unregistered.
3.  **Asset Enabled Check:** Queries `CustodyVault` configuration mapping. Reverts if the asset configuration is explicitly disabled.
4.  **Amount > 0 Check:** Prevents zero-value deposits. Reverts with `MathCalculationOverflow()`.
5.  **Receiver Validation Check:** Prevents zero-address minting. Reverts with `ZeroAddressDetected()`.
6.  **Oracle Health Check:** Queries `OracleManager.isPriceFresh()` to verify the active feed heartbeat latency and status.
7.  **Oracle Price Check:** Fetches the normalized 18-decimal price, reverting if the price cannot be fetched.
8.  **Positive Price Check:** Assures feed value is non-negative and non-zero, reverting on pricing anomalies.
9.  **Decimals Normalization & Share Preview:** Calculates expected share mints based on total supply and current vault value.
10. **Slippage limit Check:** Validates expected shares against user-defined `minSharesOut`.
11. **Maximum Deposit Limit Check:** Compares the deposit amount against the governance-configurable `_maxDeposit`.
12. **Validation Completion:** Reverts with `DepositValidationComplete()` to cleanly end execution without state changes.

---

## 2. Reads Before Writes & Zero State Changes

The validation layer has been designed to guarantee **zero state changes**:

- **Preventing Reentrancy & Exploitation:** By executing all read-only validations (such as fetching oracle prices, checking limits, and calculating share previews) _before_ any state modifications or asset moves occur, we align with the strict **Checks-Effects-Interactions** pattern.
- **Gas Efficiency:** Unsuccessful deposit attempts revert early, before any expensive state changes, token transfers, or contract interactions occur.
- **Validation Complete Revert:** Returning `revert DepositValidationComplete()` is a deterministic signal indicating that the validation phase succeeded. No assets were moved, no tokens were minted, and no contract variables were written.

---

## 3. Security & Audit Readiness

- **Access Controls:** Limit configurations (`setMaxDeposit`) are protected by the `GOVERNANCE_ROLE` role. Pausing controls are divided between `GUARDIAN_ROLE` (pause) and `GOVERNANCE_ROLE` (resume).
- **Staleness Guard:** The `OracleManager` validates timestamps against the configured heartbeats before delivering prices, protecting the protocol from oracle frontrunning and stale data feed exploits.
- **Math Guard:** Share calculations include division-by-zero protection.
