# UnifyVault Smart Contracts (`@unifyvault/protocol`)

This workspace hosts the core Solidity smart contracts, deployment scripts, and test suites for the UnifyVault Protocol, built and managed using the Foundry toolchain.

---

## 1. Directory Structure

```
packages/protocol/
├── src/                   # Solidity smart contract code implementations
│   ├── interfaces/        # Core module interfaces
│   ├── libraries/         # Math & Safe token transfer helpers
│   ├── types/             # Shared structs & enums definitions
│   ├── errors/            # Centralized custom error catalog
│   ├── events/            # Centralized custom event definitions
│   │
│   ├── oracle/            # Price feed feed adapters
│   ├── vault/             # Asset custody vault systems
│   ├── token/             # ERC-20 wrapper tokens
│   ├── treasury/          # Fee allocation and operational pools
│   ├── governance/        # Timelock and multisig executors
│   └── Constants.sol      # Protocol-wide constants
│
├── test/                  # Foundry unit, fuzz, and invariant tests
│   ├── OracleAdapter.t.sol
│   ├── CustodyVault.t.sol
│   ├── UnifyVaultController.t.sol
│   ├── FeeManager.t.sol
│   └── UVBTCETHToken.t.sol
│
├── script/                # Deployment and rebalancing scripts
├── foundry.toml           # Foundry compiler and profile configurations
├── remappings.txt         # Import path configurations
└── package.json           # Scripts and dependency registry
```

---

## 2. Architectural Responsibilities

- **Interfaces:** Contain exact method signatures and parameters for each smart contract component. Every core contract must inherit its corresponding interface (e.g., `UVBTCETHToken` must implement `IToken`).
- **Errors / Events:** Custom errors are used exclusively instead of revert strings to optimize gas usage on Base. Shared events are defined globally to standardize telemetry tracking.
- **Protocol Coordinator (`UnifyVaultController`):** Canonical workflow orchestrator that manages asset deposits, redemptions, rebalances, and fee collection sequences. Does not own or hold state, but coordinates vault operations, oracle managers, and index tokens.
- **Protocol Directory (`ProtocolDirectory`):** Canonical registry that resolves target addresses using generic `bytes32` identifiers configured in [ModuleIds.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/src/constants/ModuleIds.sol). Governed by `GOVERNANCE_ROLE`. Includes a one-way `freeze()` method to permanently lock registry entries.
- **Oracle:** Decoupled architecture separating valuation logic (`OracleManager`) from source-specific data feeds (`IOracleProvider`). Normalized prices are scaled to 18 decimals and checked against heartbeats and non-positive value anomalies.
- **Oracle Provider (`IOracleProvider`):** Standard interface for multi-source oracle providers (Chainlink, Redstone, Pyth). Uses generic `bytes32 assetId` keys to support arbitrary off-chain feeds and returns a unified `ProviderPrice` struct. Normalizes pricing output to 18 decimals. The codebase includes a production-grade [MockOracleProvider](file:///packages/protocol/src/oracle/MockOracleProvider.sol) for deterministic testing.
- **Vault:** Custodianship of Wrapped BTC and native/staked ETH, managing reserves securely.
- **Token:** Implements the `UVBTCETH` index token.
- **Treasury:** Routes operational funds and protocol reserve allocations based on collected transaction fees.
- **Governance:** Executes system configuration updates (e.g., updating fee parameters) via timelocks.

---

## 3. Coding Conventions

- **Compiler Version:** Fixed compiler version `0.8.20` is required.
- **Access Control:** Use role-based access control (RBAC) via OpenZeppelin's upgradeable libraries.
- **Upgradeability:** Standardize on UUPS proxies (`ERC-1967`). Every upgradeable contract must include storage gaps (`uint256[50] __gap`) to prevent layout collisions during upgrades.
- **Reentrancy:** Implement `nonReentrant` guards on all state-modifying deposit/withdrawal endpoints.
- **Checks-Effects-Interactions:** Always modify local states before initiating external transfers or calls.

---

## 4. Import Strategy

Use clean, normalized import patterns managed via `remappings.txt`:

- Import from OpenZeppelin using:
  ```solidity
  import '@openzeppelin/contracts/...';
  ```
- Import from local files using relative paths:
  ```solidity
  import '../interfaces/IOracle.sol';
  import '../errors/Errors.sol';
  ```
