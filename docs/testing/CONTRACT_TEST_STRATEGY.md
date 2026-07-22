# UnifyVault Smart Contract Testing Strategy

This document defines the testing framework, test types, execution practices, and coverage targets for the UnifyVault Protocol smart contracts.

---

## 1. Testing Framework

The smart contracts layer utilizes the **Foundry** toolchain for unit tests, fuzz testing, and mainnet fork simulations.

All test files are located under `packages/protocol/test/` and extend the `Test.sol` base contract from `forge-std`.

---

## 2. Testing Levels

### A. Unit Tests

- **Focus:** Isolated verification of single contract functions and validation rules.
- **Examples:** Testing fee limit boundary validations in the Controller, role configurations, and registry lookups in the Directory.
- **Mocking:** Use mock contract implementations to isolate external dependencies (e.g. mock ERC-20 tokens).

### B. Integration Tests

- **Focus:** Simulating workflows across multiple connected protocol contracts.
- **Examples:** Verifying that a `deposit()` call updates the collateral balance in the Vault, mints shares via the Token contract, and routes fee shares to the Treasury.

### C. Fuzz Tests

- **Focus:** Feeding randomized inputs to contract functions to detect edge-case math overflows or state crashes.
- **Execution:** Configure fuzzing parameters in `foundry.toml` (`runs = 256` for dev, `runs = 1000` for CI). Ensure inputs (e.g. mint amounts, deposit values) cover boundary constraints.

### D. Invariant Tests (State-based Fuzzing)

- **Focus:** Asserting that global system invariants remain true under all transaction paths.
- **Core Invariants:**
  1.  _Solvency Invariant:_ Total circulating supply of `UVBTCETH` must always be backed 1-to-1 by the market valuation of assets in the Custody Vault.
  2.  _Fee Cap Invariant:_ No fee configuration can ever exceed `100 bps` (1.00%).

### E. Mainnet Fork Tests

- **Focus:** Forking the active Base L2 network locally to simulate live integrations.
- **Verification:** Verify Chainlink oracle adapter responses and DEX swap paths against live mainnet states.

---

## 3. Metrics & Benchmarks

- **Coverage Targets:** 100% code coverage required for all math libraries and controller entrypoints.
- **Gas Benchmarking:** Run `forge snapshot` to check transaction gas usage. Changes that increase gas by more than 5% on key entrypoints (mint, burn) must be approved by the lead architect.
