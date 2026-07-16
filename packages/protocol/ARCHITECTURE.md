# UnifyVault Smart Contract Architecture

This document describes the design principles, boundary mappings, and layout patterns established for the UnifyVault Protocol smart contracts.

---

## 1. Core Architectural Pillars

### A. Modular Separation & Segregated Scope

Instead of deploying monolithic contract architectures, UnifyVault distributes responsibilities across independent, decoupled components:

- **Controller (`UnifyVaultController`):** Orchester of minting, burning, and collateral rebalancing flows.
- **Custody Vault (`CustodyVault`):** Holds underlying collateral securely.
- **Fee/Operational Treasury (`Treasury`):** Processes fee distributions.
- **Oracle Adapter Manager (`OracleManager`):** Computes normalized token valuations.

### B. Generic Dynamic Address Resolution (`IProtocolDirectory`)

Hardcoding destination addresses inside smart contracts creates deployment rigidities and complicates testing. UnifyVault resolves peer addresses dynamically via a central directory contract. Contracts import [IProtocolDirectory.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/src/interfaces/IProtocolDirectory.sol) and call address queries on-chain using the generic `getAddress(bytes32)` endpoint. All module identifiers are defined as immutable constants in [ModuleIds.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/src/constants/ModuleIds.sol). To eliminate trust assumptions post-rollout, the directory supports a one-way `freeze()` function that permanently locks module registration, updates, and removal.

### C. Contract-Local Access Controls

Instead of performing external calls to a central validator, authorization is checked using contract-local role management by inheriting OpenZeppelin's standard `AccessControl` library. Role definitions are centralized in [AccessRoles.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/src/libraries/AccessRoles.sol) to ensure naming consistency across modules.

### D. ERC-7201 Namespaced Storage

Standard upgradeable proxy variables (UUPS) carry layout collision risks if variables are re-arranged. UnifyVault implements **namespaced storage layouts** defined in [ProtocolStorage.sol](file:///Users/apple/Documents/UnifyVault-UV/packages/protocol/src/libraries/ProtocolStorage.sol) conforming to ERC-7201. Data variables are stored in custom pointers computed dynamically, protecting storage slots from overrides.

---

## 2. Directory Mappings & Boundaries

```
src/
├── interfaces/            # API blueprints & functional declarations
├── libraries/             # ERC-7201 Storage pointers & Auth roles constants
├── types/                 # Domain-segregated struct/enum modules
├── errors/                # Centralized custom error catalog
├── events/                # Centralized event emission rules
└── <domain>/              # Implementation modules (Oracle, Vault, Token, etc.)
```

---

## 3. Dependency Boundary Map

```mermaid
graph TD
    Controller[UnifyVaultController] -->|Resolves Targets| Directory[ProtocolDirectory]
    Controller -->|Read Prices| Oracle[OracleManager]
    Controller -->|Withdraw / Custody| Vault[CustodyVault]
    Controller -->|Distribute Fees| Treasury[Treasury]

    Oracle -->|Fetch Price / Heartbeat| Providers[OracleProviders]

    Vault -->|Inherits| LocalAuth[Local AccessControl]
    Controller -->|Inherits| LocalAuth
    Treasury -->|Inherits| LocalAuth

---

## 4. Oracle Provider Abstraction

To support multi-source pricing feeds seamlessly (including Chainlink, Redstone, and Pyth), the protocol decouples the main valuation logic from the provider-specific integration layers.

### A. Normalized Pricing API (`IOracleProvider`)

Individual pricing source adapters inherit [IOracleProvider.sol](file:///packages/protocol/src/interfaces/IOracleProvider.sol). Rather than using EVM contract addresses, the provider interface resolves prices using generic `bytes32 assetId` keys. This design accommodates:
- Non-EVM native feeds or fiat currency indices.
- Direct mapping to off-chain price feed hashes (such as Pyth's 32-byte Price IDs).
- Multi-chain token variations.

### B. Shared Price Data Model (`ProviderPrice`)

Pricing details are unified in a single `ProviderPrice` struct defined in [OracleTypes.sol](file:///packages/protocol/src/types/OracleTypes.sol):
- `price`: The raw price value from the provider.
- `decimals`: The decimal precision of the raw price feed.
- `updatedAt`: The block timestamp of the last oracle update.
- `roundId`: The source-specific round identifier (or `0` if unsupported).
- `providerId`: A unique `bytes32` identifier of the source (e.g., `keccak256("Chainlink")`).

### C. Normalization & Safety Guarantees
- **Decimal Normalization:** Raw prices are normalized to `18` decimals by `getLatestPrice(bytes32)` for protocol-wide calculation consistency.
- **Health Validation:** Providers define `isHealthy(bytes32)` to return `false` instead of reverting if the oracle feed is offline, has zero/negative prices, or has gone past its heartbeat staleness threshold.
- **Fail-Safe Checks:** Concrete implementations must enforce strict validation against stale timestamp thresholds and non-positive price values, throwing `Errors.OracleProviderPriceNegative` or `Errors.OracleProviderPriceStale` under anomalies.

### D. Mock Pricing Simulation (`MockOracleProvider`)

To facilitate robust and deterministic testing, the protocol includes a production-grade [MockOracleProvider.sol](file:///packages/protocol/src/oracle/MockOracleProvider.sol).

#### 1. Why it Exists
Testing core protocol flows (such as minting, burning, and rebalancing) against live networks or standard third-party mock contracts introduces non-determinism, slow test execution, and hard-to-simulate error scenarios. The `MockOracleProvider` gives tests absolute control over the mock oracle state, enabling precise verification of the controller's safety systems.

#### 2. Deterministic Testing Capabilities
- **Forced Anomalies:** Tests can simulate stale feeds, negative or zero prices, offline status, and unscheduled round updates.
- **Fuzz Integration:** Price value, decimal structure, update time, and round progression are compatible with standard property-based fuzzers.
- **Role-Protected Configs:** Operators or governance accounts can dynamically alter oracle parameters.

#### 3. Differences from Production Adapters
While production adapters wrap specific external contract interfaces (e.g. Chainlink's `AggregatorV3Interface`), the mock provider bypasses external network requests entirely, maintaining all feed configs inside an internal Solidity state mapping.
---

## 5. Protocol Coordinator (UnifyVaultController)

The `UnifyVaultController` acts as the coordinator and brain of the UnifyVault Protocol. Following modular separation principles:
- **Zero State Ownership:** The controller does not store collateral assets, user balances, oracle prices, or token supply numbers. It delegates all storage and queries to their respective domain-isolated modules (`CustodyVault`, `UVBTCETHToken`, `OracleManager`, `Treasury`).
- **Workflow Coordination:** It orchestrates the deposit, redemption, rebalancing, and fee collection sequences, translating user inputs and oracle valuations into safe collateral transfers and token mints/burns.
- **Pausability Guards:** Implements emergency pause controls restricted to the `GUARDIAN_ROLE` and unpausing operations restricted to the `GOVERNANCE_ROLE`.
```
