# UnifyVault Collateral Transfer Review

This document summarizes the collateral transfer architecture, state safety, fee protection mechanisms, and compatibility roadmaps implemented for the UnifyVault Protocol.

---

## 1. Zero Assets Stored in the Controller

The `UnifyVaultController` serves strictly as the coordinator of business processes.

- **Decoupled Risk:** The Controller never retains custody of any user collateral tokens or native assets. Even during transient transaction execution, funds flow directly from the User to the `CustodyVault`.
- **Attack Vector Elimination:** By ensuring the Controller's balance is always `0` for all assets, any potential exploit vector (such as rounding arbitrage or reentrancy drain) targeting the Controller cannot access or steal protocol assets, since all funds are stored within the isolated `CustodyVault`.

---

## 2. CustodyVault as the Sole Custodian

- **Isolated Scope:** The `CustodyVault` is the canonical asset repository of the protocol. It exposes simple `deposit` and `withdraw` endpoints, protected by the `CONTROLLER_ROLE`.
- **Simplified Audits:** The CustodyVault uses standard, well-audited OpenZeppelin libraries for asset transfers, and has no exposure to price calculation, slippage, or tokenomics, maintaining a minimal audit surface.

---

## 3. Fee-On-Transfer and Rebasing Token Protection

To safeguard the protocol's index valuation accounting from hidden balance losses (such as tax-on-transfer tokens or rebasing tokens):

- **Balance Measurement:** The Controller measures the vault balance immediately before and after the transfer:
  ```solidity
  uint256 balanceBefore = IERC20(asset).balanceOf(_vault);
  CustodyVault(_vault).deposit(asset, msg.sender, amount);
  uint256 balanceAfter = IERC20(asset).balanceOf(_vault);
  uint256 receivedAmount = balanceAfter - balanceBefore;
  ```
- **Strict Verification:** The Controller validates that `receivedAmount == amount`. If a fee is deducted (or rebasing occurs), the condition is violated, and the transaction is aborted with `InsufficientReserves`.

---

## 4. Future Compatibility with Permit2 / ERC-2612

- **Signature Approvals:** Because the transfer is coordinated via the Controller, we can seamlessly add support for gasless approvals (like ERC-2612 `permit` or Uniswap's `Permit2`) in future Controller upgrades.
- **Seamless Integration:** The Controller can accept permit signatures, forward them to the token or Permit2 router, and then invoke `CustodyVault.deposit` without requiring users to make a separate transaction for approvals.
