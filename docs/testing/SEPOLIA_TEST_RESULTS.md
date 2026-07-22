# Base Sepolia Integration Test Results

This document presents the validation results executed against the deployed protocol contracts on Base Sepolia.

---

## 1. Positive Integration Workflows

### Deposit & Minting Workflow

- **Action:** Deposited `100 MCOL` tokens from a clean test account.
- **Calculated Fee:** `0.25 MCOL` (25 BPS) transiently pulled and routed to the Treasury.
- **Net Deposit:** `99.75 MCOL` deposited into CustodyVault.
- **Shares Minted:** `99.75 UVBTCETH` index shares minted to user (1:1 bootstrap).
- **Ledger Updates:** `accountedAssets` updated in vault to `99.75 MCOL`.
- **Status:** PASS.

### Proportional Deposit Workflow

- **Action:** Executed second deposit of `100 MCOL` tokens.
- **Shares Minted:** `99.75 UVBTCETH` index shares minted (proportional share calculation matches total supply and accounted assets).
- **Status:** PASS.

### Partial Redemption Workflow

- **Action:** Redeemed `99.75 UVBTCETH` shares (50% of outstanding supply).
- **NAV Share Allocation:** Calculated as `99.75 MCOL` gross collateral return.
- **Calculated Fee:** `0.249375 MCOL` routed to Treasury.
- **Net Received:** `99.500625 MCOL` paid to redeemer.
- **Status:** PASS.

### Full Redemption Workflow

- **Action:** Redeemed all remaining shares (`99.75 UVBTCETH`).
- **Remaining Supply:** Returns to `0`.
- **Vault Assets:** Accounted assets returns to `0`.
- **Controller Balance:** Confirmed to be exactly `0` post-transaction.
- **Status:** PASS.

---

## 2. Security & Negative Test Verifications

### Donation Immunity Check

- **Action:** Directly transferred `10 MCOL` tokens to the CustodyVault contract address bypassing the controller.
- **Result:**
  - `totalAssets()` remained strictly `0`.
  - `surplusAssets()` tracked the `10 MCOL` surplus correctly.
  - Subsequent deposits and redemptions were unaffected by the donation, proving complete immunity to inflation attacks.
- **Status:** PASS.
