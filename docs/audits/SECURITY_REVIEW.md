# UnifyVault Protocol Security Review

This document provides a comprehensive security review of the UnifyVault Protocol (v0.8.0/v0.9.0) in preparation for Slither static analysis and external audits.

---

## 1. Executive Summary

A manual adversarial security review was performed on all core smart contracts:

- `ProtocolDirectory.sol`
- `OracleManager.sol`
- `MockOracleProvider.sol`
- `CustodyVault.sol`
- `Treasury.sol`
- `UVBTCETHToken.sol`
- `UnifyVaultController.sol`

The protocol employs robust architectural standards, including strict role separation, comprehensive reentrancy guards, and internal accounted balance tracking to prevent first-depositor inflation attacks.

---

## 2. Findings Catalog

### 2.1 Centralization Risk: Multi-sig and Governance Control

- **Severity:** Medium
- **Impact:** The `GOVERNANCE_ROLE` holds permissions to register new collateral assets, update oracle providers, and change heartbeats. If the governance key is compromised, an attacker could register a malicious asset or configure a spoofed oracle feed.
- **Recommendation:** Ensure the governance address is a multi-signature wallet (e.g., Gnosis Safe) with a timelock contract to allow users to exit before major upgrades/configurations take effect.
- **Status:** Acknowledged.

### 2.2 Checks-Effects-Interactions (CEI) Sequencing in Deposit

- **Severity:** Low / Informational
- **Finding:** In `UnifyVaultController.deposit`, share minting occurs before the underlying collateral token is transferred from the user:
  ```solidity
  // --- Effects: Mint shares ---
  UVBTCETHToken(_token).mint(receiver, sharesOut);

  // --- Interactions ---
  IERC20(asset).safeTransferFrom(msg.sender, address(vault), netDeposit);
  ```
- **Impact:** In the event that the token transfer fails, the transaction reverts and the minted shares are rolled back safely. However, standard CEI patterns advise performing external interactions _after_ local state transitions.
- **Recommendation:** Keep `nonReentrant` modifiers active on the controller to prevent callbacks in case of customized token configurations.
- **Status:** Resolved via `nonReentrant` modifier.

### 2.3 Oracle Staleness and Hardcoded Heartbeats

- **Severity:** Low
- **Finding:** Heartbeats are configured in the `OracleManager` per asset. If the heartbeat is set too high, stale prices could be accepted, leading to arbitrage opportunities.
- **Recommendation:** Implement strict validation checks to ensure heartbeat thresholds match Chainlink feed configurations.
- **Status:** Resolved (heartbeats are fully validated in `OracleValidationLib`).

---

## 3. Slither Preparation & Configurations

To optimize Slither runs in the CI/CD environment, the following settings have been configured in `packages/protocol/slither.config.json`:

- **Path Filtering:** Ignores external files under `lib`, `node_modules`, and `test` to focus scans strictly on `src/`.
- **Warning Exclusions:** Suppresses low-priority warnings (`naming-convention`, `solc-version`) to ensure the analysis results are clean and high-signal.
