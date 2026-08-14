# Smart Contracts Specification

This document provides a comprehensive reference for every deployed contract in the UnifyVault V2 protocol.

---

## Contract Inventory

| Contract Name             | License | Inheritance                                                   | Key Responsibility                                                     |
| :------------------------ | :------ | :------------------------------------------------------------ | :--------------------------------------------------------------------- |
| `ProtocolDirectory`       | MIT     | `AccessControl`, `IProtocolDirectory`                         | Dynamic address registry for protocol modules                          |
| `UnifyVaultController`    | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`                | Core execution orchestrator for deposits, redemptions, and NAV         |
| `CustodyVault`            | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`, `IVault`      | Secure collateral custody with donation-attack immunity                |
| `Treasury`                | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`, `ITreasury`   | Protocol fee vault and treasury asset balance tracking                 |
| `FeeManager`              | MIT     | `AccessControl`, `IFeeManager`                                | Deposit/redemption fee computation and fee routing to Treasury         |
| `LiquidityManager`        | MIT     | `AccessControl`, `ReentrancyGuard`, `ILiquidityManager`       | Liquidity reserve monitoring and vault refill/sweep execution          |
| `OracleManager`           | MIT     | `AccessControl`, `IOracle`                                    | Multi-feed price aggregator with staleness and fallback routing        |
| `ChainlinkOracleProvider` | MIT     | `AccessControl`, `IOracleProvider`                            | Chainlink `AggregatorV3Interface` price feed adapter                   |
| `MockOracleProvider`      | MIT     | `AccessControl`, `IOracleProvider`                            | Controlled oracle provider for test environments and emergency pricing |
| `StrategyManager`         | MIT     | `AccessControl`, `IStrategyManager`                           | Target asset allocation (BPS) management                               |
| `PortfolioManager`        | MIT     | `AccessControl`, `ReentrancyGuard`, `IPortfolioManager`       | Portfolio NAV computation and automated asset rebalancing              |
| `SwapAdapter`             | MIT     | `AccessControl`, `ISwapAdapter`                               | DEX router adapter enforcing slippage protection                       |
| `UVBEV2`                  | MIT     | `ERC20`, `ERC20Permit`, `AccessControl`, `Pausable`, `IToken` | Index share token with locked pre-transfer cost basis hooks            |
| `CostBasisManagerV2`      | MIT     | `AccessControl`, `ICostBasisManagerV2`                        | Realized/unrealized P&L, entry price, and P2P escrow transfer filter   |
| `PerformanceManager`      | MIT     | `AccessControl`, `IPerformanceManager`                        | Benchmark tracking, high-water marks, and time-weighted returns        |
| `P2PEscrowV2`             | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`, `IP2PEscrow`  | Non-custodial crypto-fiat escrow with cryptographic proof verification |
| `Marketplace`             | MIT     | `AccessControl`, `ReentrancyGuard`, `Pausable`                | Non-custodial limit orderbook engine with linked escrow creation       |
| `UnifyVaultTimelock`      | MIT     | `TimelockController`                                          | 48-hour delay timelock controller for governance execution             |

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

## 14. Canonical Deployed Addresses (Base Sepolia - Chain ID 84532)

| Contract Module             | Canonical Address                            |
| :-------------------------- | :------------------------------------------- |
| **ProtocolDirectory**       | `0x8040006d6907a84911aaC0a9aC08278311B156e2` |
| **Treasury**                | `0xB8c8113a042f39936dD966A5983fAaE2bF7b7290` |
| **FeeManager**              | `0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1` |
| **CustodyVault**            | `0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0` |
| **OracleManager**           | `0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF` |
| **ChainlinkOracleProvider** | `0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B` |
| **LiquidityManager**        | `0xd1DCd311ACD1176E35823360652FCb356a7F227F` |
| **UVBEV2 (UVBEToken)**      | `0x006c5DF13C716E5224b33956651C4356BB90DEc0` |
| **UnifyVaultController**    | `0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec` |
| **StrategyManager**         | `0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb` |
| **PortfolioManager**        | `0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b` |
| **SwapAdapter**             | `0xbc97337dE85654aCD96182C93841f21168da65B4` |
| **CostBasisManagerV2**      | `0x57869372AFbd7b61752f2f8d3e7F37701e28517B` |
| **PerformanceManager**      | `0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6` |
| **P2PEscrowV2**             | `0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb` |
| **Marketplace**             | `0x5978273B16467E99f45984Dc8AE9048ba05a30F7` |
| **TimelockController**      | `0x9094145Cd2AEA2f309eDf14237444a07edF98d02` |
