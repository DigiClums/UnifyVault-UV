# UnifyVault Treasury Review

This document provides a security, gas, and architectural evaluation of the `Treasury` protocol revenue storage contract.

---

## 1. Status

### **APPROVED**

The `Treasury` implementation conforms to all specifications for Sprint 5C, maintaining strict isolation between protocol-owned assets and user collateral (which is stored exclusively in `CustodyVault`), and has successfully passed all 134 unit, fuzz, and property-based invariant test suites.

---

## 2. Architecture Review

- **Core Separation:** Dedicated strictly to storing protocol fees and native ETH revenue. It implements no logic related to token minting, burns, valuation, or oracle coordinator integrations.
- **O(1) View Mappings:** Incorporates O(1) balance check and registration reads, preventing expensive storage lookups.
- **Decoupled Registry Functions:** Employs standard registration mechanics, allowing governance to add, remove, enable, or disable fee collection assets.

---

## 3. Security Review

- **Reentrancy Safeguards:** Protects both ERC20 and native ETH withdrawals against reentrancy vectors using the `nonReentrant` modifier.
- **Explicit Role Assignment:**
  - `CONTROLLER_ROLE`: Restricts fee collections strictly to the controller.
  - `GOVERNANCE_ROLE`: Restricts withdrawals (ERC20 and native) and registry configurations.
  - `GUARDIAN_ROLE`: Restricts emergency `pause` control.
- **Safe ETH Transfers:** Uses OpenZeppelin's `Address.sendValue` during native ETH withdrawals, which forwards all available gas and reverts automatically if the transaction fails, preventing silent failures.
- **Namespace Collision Resolution:** Custom project error definitions are imported as `ProtocolErrors` to prevent name clashes with OpenZeppelin's internal error utilities when compiling with `Address.sol`.

---

## 4. Token & Native Assets Compatibility

- **Fee-on-Transfer Tokens:** _Intentionally Not Supported._ Supporting fee-on-transfer tokens requires measuring contract balances before and after each transfer. The treasury assumes the incoming fee amount matches the parameter passed.
- **Rebasing Tokens:** _Intentionally Not Supported._ Since the treasury uses `balanceOf(address(this))` directly to report balances, positive or negative rebases will be reflected, but the controller's double-entry bookkeeping would desynchronize.
- **Native ETH Handling:** Implements `receive()` function to accept protocol income paid in native ether. Withdrawals are handled safely via `withdrawNative`.

---

## 5. Gas Review

- **No Duplicate Counters:** Token balances are read dynamically from token contracts, saving substantial storage slot writes.
- **Packed Config Structure:** Packed struct `AssetConfig` containing `decimals` and `enabled` utilizes a single 32-byte storage slot.

---

## 6. Future Compatibility

To accommodate future governance upgrades, storage mappings and roles are kept in simple, well-grouped layouts. In the future:

- Multi-signature governance can be attached by transferring the `GOVERNANCE_ROLE` to a Gnosis Safe or similar multi-sig wallet.
- Timelocks can be integrated by transferring the `GOVERNANCE_ROLE` to an OZ `TimelockController` contract.
- DAO spend proposals can be routed directly to the `withdraw` function since it only expects the caller to hold the `GOVERNANCE_ROLE`.

---

## 7. Audit Readiness

Full testing coverage has been implemented:

- **Unit Tests:** Validates ERC20 and native ETH withdrawals, duplicate prevention, and RBAC boundaries.
- **Fuzz Testing:** Validates arbitrary collect and withdraw amounts.
- **Invariant Testing:** Checks balance accounting accuracy, controller role limitations, and paused boundary limits.
