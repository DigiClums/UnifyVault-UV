# Smart Contracts Specification

This document provides a comprehensive reference for every deployed contract in the UnifyVault V2 protocol.

---

## Contract Inventory

| Contract Name                     | License | Inheritance                                                                                              | Key Responsibility                                                     |
| :-------------------------------- | :------ | :------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `ProtocolDirectory`               | MIT     | `AccessControl`, `IProtocolDirectory`                                                                    | Dynamic address registry for protocol modules                          |
| `UnifyVaultControllerUpgradeable` | MIT     | `Initializable`, `AccessControlUpgradeable`, `ReentrancyGuard`, `PausableUpgradeable`, `UUPSUpgradeable` | Core UUPS execution orchestrator for deposits, redemptions, and NAV    |
| `CustodyVault`                    | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`, `IVault`                                                 | Secure collateral custody with donation-attack immunity                |
| `Treasury`                        | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`, `ITreasury`                                              | Protocol fee vault and treasury asset balance tracking                 |
| `FeeManager`                      | MIT     | `AccessControl`, `IFeeManager`                                                                           | Deposit/redemption fee computation and fee routing to Treasury         |
| `LiquidityManager`                | MIT     | `AccessControl`, `ReentrancyGuard`, `ILiquidityManager`                                                  | Liquidity reserve monitoring and vault refill/sweep execution          |
| `OracleManager`                   | MIT     | `AccessControl`, `IOracle`                                                                               | Multi-feed price aggregator with staleness and fallback routing        |
| `ChainlinkOracleProvider`         | MIT     | `AccessControl`, `IOracleProvider`                                                                       | Chainlink `AggregatorV3Interface` price feed adapter                   |
| `MockOracleProvider`              | MIT     | `AccessControl`, `IOracleProvider`                                                                       | Controlled oracle provider for test environments and emergency pricing |
| `StrategyManager`                 | MIT     | `AccessControl`, `IStrategyManager`                                                                      | Target asset allocation (BPS) management                               |
| `PortfolioManager`                | MIT     | `AccessControl`, `ReentrancyGuard`, `IPortfolioManager`                                                  | Portfolio NAV computation and automated asset rebalancing              |
| `SwapAdapter`                     | MIT     | `AccessControl`, `ISwapAdapter`                                                                          | DEX router adapter enforcing slippage protection                       |
| `UVBEV2`                          | MIT     | `ERC20`, `ERC20Permit`, `AccessControl`, `Pausable`, `IToken`                                            | Index share token with locked pre-transfer cost basis hooks            |
| `CostBasisManagerV2`              | MIT     | `AccessControl`, `ICostBasisManagerV2`                                                                   | Realized/unrealized P&L, entry price, and P2P/Staking transfer filter  |
| `PerformanceManager`              | MIT     | `AccessControl`, `IPerformanceManager`                                                                   | Benchmark tracking, high-water marks, and time-weighted returns        |
| `P2PEscrowV2`                     | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`, `IP2PEscrow`                                             | Non-custodial crypto-fiat escrow with cryptographic proof verification |
| `Marketplace`                     | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`                                                           | Non-custodial limit orderbook engine with linked escrow creation       |
| `GasTreasury`                     | MIT     | `AccessControl`, `ReentrancyGuard`                                                                       | ERC-4337 paymaster deposit holding and sponsorship pool                |
| `UnifyVaultTimelock`              | MIT     | `TimelockController`                                                                                     | 48-hour delay timelock controller for governance execution             |

---

## 1. ProtocolDirectory

### Purpose

Serves as the central service locator for the UnifyVault protocol, allowing contracts to discover sibling modules dynamically.

### Roles

- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Can call `registerAddress`, `updateAddress`, `removeAddress`, and `freeze`.

### Key Public Methods

- `registerAddress(bytes32 id, address target)`: Registers a new module.
- `updateAddress(bytes32 id, address target)`: Updates an existing module address.
- `removeAddress(bytes32 id)`: Deletes a module entry.
- `freeze()`: Permanently disables registry modifications.
- `getAddress(bytes32 name) returns (address)`: Fetches target address; reverts if non-existent.
- `exists(bytes32 name) returns (bool)`: Returns whether module ID is registered.
- `isFrozen() returns (bool)`: Returns true if registry is frozen.

### Events

- `AddressRegistered(bytes32 indexed id, address indexed target, address indexed actor)`
- `AddressUpdated(bytes32 indexed id, address indexed oldTarget, address indexed newTarget, address indexed actor)`
- `AddressRemoved(bytes32 indexed id, address indexed oldTarget, address indexed actor)`
- `RegistryFrozen(address indexed actor)`

---

## 2. UnifyVaultController

### Purpose

The primary interface for users to deposit collateral, receive shares, redeem shares for collateral, and trigger rebalancing workflows.

### Roles

- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Manages deposit limits, rate limits, slippage parameters, and monitoring thresholds.
- `GUARDIAN_ROLE`: Can trigger `pause()` and `unpause()`.
- `BOT_ROLE`: Can trigger automated keeper functions.

### Key Public Methods

- `deposit(address asset, uint256 amount, uint256 minSharesOut, address receiver) returns (DepositQuote memory)`: Deposits collateral asset and mints shares.
- `redeem(address asset, uint256 shares, uint256 minAssetsOut, address receiver, uint256 deadline) returns (uint256)`: Burns shares and returns net collateral.
- `rebalancePortfolio(address[] targetAssets, uint256[] targetWeights)`: Rebalances portfolio assets via `PortfolioManager`.
- `setMaxDeposit(uint256 maxDeposit_)`: Updates max deposit per tx.
- `setDepositLimits(uint256 maxPerTx, uint256 dailyCap)`: Updates deposit caps.
- `setRedeemLimits(uint256 maxPerTx, uint256 dailyCap)`: Updates redemption caps.
- `setSwapSlippageBps(uint256 slippageBps_)`: Sets maximum swap slippage tolerance.
- `pause()` / `unpause()`: Emergency circuit breaker.

---

## 3. CustodyVault

### Purpose

Holds underlying collateral assets securely, enforcing accounting isolation against raw transfers (donation-attack immunity).

### Roles

- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Registers/enables/disables supported assets.
- `CONTROLLER_ROLE`: Authorized to call `depositAsset` and `withdrawAsset`.

### Key Public Methods

- `registerAsset(address asset, uint8 decimals)`: Whitelists asset for custody.
- `depositAsset(address asset, uint256 amount)`: Records deposit and transfers tokens from user.
- `withdrawAsset(address asset, uint256 amount, address recipient)`: Transports assets to recipient.
- `totalAssets(address asset) returns (uint256)`: Returns tracked internal balance.
- `surplusAssets(address asset) returns (uint256)`: Returns untracked balance (donation buffer).

---

## 4. Treasury & FeeManager

### Purpose

`Treasury` securely stores collected protocol fees and reserves. `FeeManager` calculates fees on deposits and redemptions and routes them to Treasury.

### Key Public Methods

- `FeeManager.calculateDepositFee(uint256 amount) returns (uint256)`: Computes deposit fee.
- `FeeManager.calculateRedemptionFee(uint256 amount) returns (uint256)`: Computes redemption fee.
- `Treasury.collectFee(address asset, uint256 amount)`: Stores collected fees.
- `Treasury.withdraw(address asset, uint256 amount, address recipient)`: Withdraws treasury earnings (governance-only).

---

## 5. LiquidityManager

### Purpose

Monitors vault asset reserves against minimum/maximum thresholds and executes rebalance sweeps or refills.

---

## 6. OracleManager & ChainlinkOracleProvider

### Purpose

Aggregates pricing from Chainlink price feeds (`ChainlinkOracleProvider`) and fallback sources, enforcing heartbeat limits and price freshness bounds.

### Key Public Methods

- `configureAsset(bytes32 assetId, address primaryProvider, address fallbackProvider, uint256 heartbeat, bool enabled)`: Sets oracle feed parameters.
- `getAssetPrice(address asset) returns (uint256)`: Returns normalized asset price in 18 decimals.
- `isPriceFresh(address asset) returns (bool)`: Returns true if price timestamp is within heartbeat limits.

---

## 7. StrategyManager & PortfolioManager

### Purpose

`StrategyManager` maintains target portfolio allocation weights (in BPS). `PortfolioManager` evaluates current NAV, computes allocation drift, calculates UVBE token price, and executes rebalance swaps through `SwapAdapter`.

### Key Public Methods

- `calculateNAV() returns (uint256)`: Calculates total portfolio USD valuation in 18 decimals.
- `calculateUVPrice() returns (uint256 totalValueUSD, uint256 uvPriceUSD)`: Computes share valuation (`NAV / totalSupply`).
- `rebalance(address[] targetAssets, uint256[] targetWeights)`: Performs asset swaps to restore target portfolio weighting.

---

## 8. SwapAdapter

### Purpose

Wraps DEX routers (e.g. Uniswap V3) to perform token swaps with guaranteed minimum output bounds computed using `OracleManager` prices and `swapSlippageBps`.

---

## 9. UVBEV2 (UVBEToken)

### Purpose

ERC20 share token representing ownership in the vault, enhanced with `ERC20Permit` and a locked pre-transfer cost basis hook.

### Architecture

- Overrides `_update(from, to, value)`:
  1. Reads `senderBalanceBefore`.
  2. Calls `costBasisManager.onTokenTransfer(from, to, value, senderBalanceBefore)` BEFORE updating balances.
  3. Executes `super._update(from, to, value)`.
- Minting and burning are strictly restricted to `CONTROLLER_ROLE`.

---

## 10. CostBasisManagerV2

### Purpose

Maintains on-chain investor cost basis, entry prices, realized P&L, and unrealized returns.

### Key Features

- **Transfer Hook (`onTokenTransfer`)**: Shifts proportional cost basis on peer-to-peer transfers, maintaining exact basis conservation across the protocol.
- **P2P Escrow Exclusion (`_isEscrow`)**: When tokens transfer to or from registered escrow contracts, the hook returns immediately, ensuring P2P fiat trades do not contaminate portfolio investment basis.
- **Realized P&L (`recordRedeem`)**: Calculates realized gain/loss upon share redemption.
- **View Methods**:
  - `costBasis(address account) returns (uint256)`
  - `averageEntryPrice(address account) returns (uint256)`
  - `realizedPnL(address account) returns (int256)`
  - `unrealizedPnL(address account) returns (int256)`

---

## 11. PerformanceManager

### Purpose

Computes portfolio benchmark returns, high-water marks, and historical performance tracking.

---

## 12. P2PEscrowV2 & Marketplace

### Purpose

Provides a non-custodial limit orderbook and escrow clearinghouse for peer-to-peer trading of UVBE and crypto assets against fiat (INR/USD).

### Key Features

- **State Machine**: `CREATED` &rarr; `FUNDED` &rarr; `PAYMENT_SUBMITTED` &rarr; `RELEASED` / `REFUNDED` / `DISPUTED`.
- **Replay & Fraud Protection**: Unique `_usedPaymentReferences` (UTR) and `_usedEvidenceHashes` (receipt cryptographic hashes) prevent double-settlement.
- **Fee Routing**: Fee (up to 500 BPS max) deducted from released collateral and routed to `Treasury`.
- **Arbitration**: Role-based dispute resolution via `ARBITRATOR_ROLE` or `GOVERNANCE_ROLE`.
- **Zero Vault Exposure**: Pure settlement layer operating strictly on circulating tokens; does not touch vault collateral, supply, or NAV.

---

## 13. UnifyVaultTimelock

### Purpose

Inherits OpenZeppelin `TimelockController` to enforce a 48-hour delay on governance proposals.

### Configuration

- Minimum delay: `48 hours` (`172800` seconds).
- Proposer: Configured Gnosis Safe address (`0x1111111111111111111111111111111111111111`).
- Executor: Open execution (`address(0)`).

---

## 14. Canonical Deployed Addresses (Base Mainnet - Chain ID 8453)

| Contract Module                | Canonical Address                            | Explorer Link                                                                                    |
| :----------------------------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **ProtocolDirectory**          | `0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5` | [View on BaseScan](https://basescan.org/address/0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5#code) |
| **UnifyVaultController**       | `0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c` | [View on BaseScan](https://basescan.org/address/0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c#code) |
| **UVBE Index Coin (`UVBEV2`)** | `0x051979deb1eb4823672e6274a55c44d7818ff523` | [View on BaseScan](https://basescan.org/address/0x051979deb1eb4823672e6274a55c44d7818ff523#code) |
| **CustodyVault**               | `0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c` | [View on BaseScan](https://basescan.org/address/0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c#code) |
| **Treasury**                   | `0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9` | [View on BaseScan](https://basescan.org/address/0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9#code) |
| **FeeManager**                 | `0x76c8a1ab608403cd974ec7598b01ec88b44320d3` | [View on BaseScan](https://basescan.org/address/0x76c8a1ab608403cd974ec7598b01ec88b44320d3#code) |
| **PortfolioManager**           | `0xce97c16a1c544f1df87e46695f86c7cc61ea486a` | [View on BaseScan](https://basescan.org/address/0xce97c16a1c544f1df87e46695f86c7cc61ea486a#code) |
| **StrategyManager**            | `0x8c196a631531ac3a9754016db1d7b873ebbdb6e9` | [View on BaseScan](https://basescan.org/address/0x8c196a631531ac3a9754016db1d7b873ebbdb6e9#code) |
| **SwapAdapter**                | `0x9560361d964ebfeea402e75ad3b74fad4d8057be` | [View on BaseScan](https://basescan.org/address/0x9560361d964ebfeea402e75ad3b74fad4d8057be#code) |
| **OracleManager**              | `0xdbab63fe1d8accff6620214a5c616d4151a8fec7` | [View on BaseScan](https://basescan.org/address/0xdbab63fe1d8accff6620214a5c616d4151a8fec7#code) |
| **ChainlinkOracleProvider**    | `0x39af66781d16ec8a72d2b1a4a1b7697a577626a2` | [View on BaseScan](https://basescan.org/address/0x39af66781d16ec8a72d2b1a4a1b7697a577626a2#code) |
| **CostBasisManagerV2**         | `0x3fcf09b4e1545926c1031d22a302a39e552b3469` | [View on BaseScan](https://basescan.org/address/0x3fcf09b4e1545926c1031d22a302a39e552b3469#code) |
| **UVBEStakingVault**           | `0x625a7697e9fdde7c6a783593ca371ed6c73e61e0` | [View on BaseScan](https://basescan.org/address/0x625a7697e9fdde7c6a783593ca371ed6c73e61e0#code) |
| **UVBEReferralRegistry**       | `0x5d486ba39418bb63d03a27dbc77ccc88bb2bf4cc` | [View on BaseScan](https://basescan.org/address/0x5d486ba39418bb63d03a27dbc77ccc88bb2bf4cc#code) |
| **UVBERewardDistributor**      | `0xb8c565e7da406261baa4af922771bcca5bfc166a` | [View on BaseScan](https://basescan.org/address/0xb8c565e7da406261baa4af922771bcca5bfc166a#code) |
| **P2PEscrowV2**                | `0x400916339033b88cda38b1d8a5fb0f82e4889f38` | [View on BaseScan](https://basescan.org/address/0x400916339033b88cda38b1d8a5fb0f82e4889f38#code) |
| **P2PReputation**              | `0x7a4093316955baa5bcb8189c4522d9db31f42d41` | [View on BaseScan](https://basescan.org/address/0x7a4093316955baa5bcb8189c4522d9db31f42d41#code) |
| **PerformanceManager**         | `0x3e13aae6c9befaaec11b2247e2af678ce871f338` | [View on BaseScan](https://basescan.org/address/0x3e13aae6c9befaaec11b2247e2af678ce871f338#code) |
| **Marketplace**                | `0x6e3be632747e161a0b017cb35243d39eb90d0d8a` | [View on BaseScan](https://basescan.org/address/0x6e3be632747e161a0b017cb35243d39eb90d0d8a#code) |
| **StabilizerVault**            | `0xc268709ebb4d3f0f473c6c5767f60e540d330c11` | [View on BaseScan](https://basescan.org/address/0xc268709ebb4d3f0f473c6c5767f60e540d330c11#code) |
| **LiquidityManager**           | `0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919` | [View on BaseScan](https://basescan.org/address/0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919#code) |
| **Paymaster (ERC-4337)**       | `0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9` | [View on BaseScan](https://basescan.org/address/0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9#code) |
| **GasTreasury**                | `0x166477b1eb662dd553287d32af958436cad20c17` | [View on BaseScan](https://basescan.org/address/0x166477b1eb662dd553287d32af958436cad20c17#code) |
| **TimelockController**         | `0x610c5f66d99993d444561d270fba172db1f7cff1` | [View on BaseScan](https://basescan.org/address/0x610c5f66d99993d444561d270fba172db1f7cff1#code) |
