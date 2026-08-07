# Testing Strategy & Specification

This document describes the testing architecture, test suites, coverage metrics, and mock infrastructure for UnifyVault V2 (`packages/protocol`).

---

## 1. Overview

UnifyVault V2 relies on **Foundry (`forge`)** as its primary smart contract testing framework. The test suite includes unit tests, integration tests, fuzzing suites, invariant tests, and live testnet fork validation tests.

---

## 2. Test Architecture & Directory Structure

Test files are located in `packages/protocol/test/`:

```
packages/protocol/test/
├── ProtocolDirectory.t.sol           # Registry unit tests
├── UnifyVaultController.t.sol        # Controller unit & integration tests
├── CustodyVault.t.sol                # Vault balance & donation immunity tests
├── Treasury.t.sol                     # Fee collection & treasury tests
├── FeeManager.t.sol                   # Fee calculation tests
├── LiquidityManager.t.sol             # Liquidity threshold & sweep tests
├── OracleManager.t.sol                # Price aggregator & staleness tests
├── ChainlinkOracleProvider.t.sol      # Chainlink feed adapter tests
├── StrategyManager.t.sol              # Target allocation BPS tests
├── PortfolioManager.t.sol             # NAV calculation & rebalance tests
├── SwapAdapter.t.sol                  # DEX router & slippage tests
├── UVBTCETHToken.t.sol                # Share token minting & burning tests
├── UnifyVaultTimelock.t.sol           # 48h timelock governance tests
├── RedemptionFuzz.t.sol               # Property-based fuzzing tests
├── invariant/                         # System invariant test suite
│   ├── Handlers.sol
│   └── ProtocolInvariants.t.sol
└── fork/                              # On-chain fork validation
    └── MainnetDeploymentValidation.t.sol
```

---

## 3. Test Suite Metrics

As of current build verification:
- **Total Test Suites**: `55`
- **Total Tests Passed**: `380`
- **Total Failures**: `0`
- **Execution Time**: `~11.8 seconds`

---

## 4. Test Categories

### 4.1 Unit Tests
Test individual contract functions in isolation against expected behavior, access control reverts, and zero-address input validations.

### 4.2 Property-Based Fuzzing Tests
Utilize Foundry fuzzing (`vm.assume`, random seed execution) to test deposit/redemption math across extreme uint256 ranges (`RedemptionFuzz.t.sol`).

### 4.3 Invariant Tests
Ensure critical system properties hold under arbitrary call sequences:
- `totalAssets(asset) >= 0`
- `token.totalSupply()` matches total active shares minus burned dead shares.
- Internal vault balances remain strictly equal to calculated deposit totals regardless of direct token donations.

### 4.4 Live Network Fork Tests
`MainnetDeploymentValidation.t.sol` executes deployment simulation against Base Sepolia / Base Mainnet forks to verify real Chainlink feeds and live contract interactions.

---

## 5. Mock Infrastructure

For deterministic testing without external RPC dependencies, the test suite utilizes:
- **`MockChainlinkAggregator`**: Simulates Chainlink `AggregatorV3Interface` feeds with configurable decimals, prices, and timestamps.
- **`MockOracleProvider`**: Implements `IOracleProvider` to inject test price data into `OracleManager`.
- **`TestSwapRouter`**: Simulates DEX swap execution with slippage checking.
- **`TestToken`**: Standard ERC20 token with public `mint()` for funding test accounts.

---

## 6. Execution Commands

```bash
# Run all tests
cd packages/protocol && forge test

# Run with gas report
forge test --gas-report

# Run specific test function
forge test --match-test test_Deposit_Success -vvvv
```
