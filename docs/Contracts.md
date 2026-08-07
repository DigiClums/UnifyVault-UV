# Smart Contracts Specification

This document provides a comprehensive reference for every deployed contract in the UnifyVault V2 protocol.

---

## Contract Inventory

| Contract Name | License | Inheritance | Key Responsibility |
| :--- | :--- | :--- | :--- |
| `ProtocolDirectory` | MIT | `AccessControl`, `IProtocolDirectory` | Dynamic address registry for protocol modules |
| `UnifyVaultController` | MIT | `AccessControl`, `ReentrancyGuard`, `Pausable` | Core execution orchestrator for deposits, redemptions, and NAV |
| `CustodyVault` | MIT | `AccessControl`, `ReentrancyGuard`, `Pausable`, `IVault` | Secure collateral custody with donation-attack immunity |
| `Treasury` | MIT | `AccessControl`, `ReentrancyGuard`, `Pausable`, `ITreasury` | Protocol fee vault and treasury asset balance tracking |
| `FeeManager` | MIT | `AccessControl`, `IFeeManager` | Deposit/redemption fee computation and fee routing to Treasury |
| `LiquidityManager` | MIT | `AccessControl`, `ReentrancyGuard`, `ILiquidityManager` | Liquidity reserve monitoring and vault refill/sweep execution |
| `OracleManager` | MIT | `AccessControl`, `IOracle` | Multi-feed price aggregator with staleness and fallback routing |
| `ChainlinkOracleProvider` | MIT | `AccessControl`, `IOracleProvider` | Chainlink `AggregatorV3Interface` price feed adapter |
| `MockOracleProvider` | MIT | `AccessControl`, `IOracleProvider` | Controlled oracle provider for test environments and emergency pricing |
| `StrategyManager` | MIT | `AccessControl`, `IStrategyManager` | Target asset allocation (BPS) management |
| `PortfolioManager` | MIT | `AccessControl`, `ReentrancyGuard`, `IPortfolioManager` | Portfolio NAV computation and automated asset rebalancing |
| `SwapAdapter` | MIT | `AccessControl`, `ISwapAdapter` | DEX router adapter enforcing slippage protection |
| `UVBTCETHToken` | MIT | `ERC20`, `AccessControl`, `IToken` | ERC20 vault share token with controller-restricted mint/burn |
| `UnifyVaultTimelock` | MIT | `TimelockController` | 48-hour delay timelock controller for governance execution |

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
Holds underlying collateral assets securely, enforcing accounting isolation against raw transfers.

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

## 4. Treasury

### Purpose
Vault contract storing collected protocol fees and protocol reserves.

### Roles
- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Manages asset registration and withdrawals.
- `CONTROLLER_ROLE`: Authorized to deposit collected fees via `collectFee`.

### Key Public Methods
- `registerAsset(address asset, uint8 decimals)`: Enables treasury asset tracking.
- `collectFee(address asset, uint256 amount)`: Transfers fee tokens into treasury custody.
- `withdraw(address asset, uint256 amount, address recipient)`: Withdraws protocol fee earnings.

---

## 5. FeeManager

### Purpose
Calculates protocol fees for deposits and redemptions and routes collected funds to Treasury.

### Roles
- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Sets fee rates (BPS).

### Key Public Methods
- `calculateDepositFee(uint256 amount) returns (uint256)`: Computes deposit fee.
- `calculateRedemptionFee(uint256 amount) returns (uint256)`: Computes redemption fee.
- `routeDepositFee(address asset, uint256 feeAmount)`: Transfers fee to `Treasury`.

---

## 6. LiquidityManager

### Purpose
Monitors vault asset reserves against minimum/maximum thresholds and executes rebalance sweeps or refills.

### Roles
- `DEFAULT_ADMIN_ROLE`: Role management.
- `GOVERNANCE_ROLE`: Configures liquidity thresholds.
- `CONTROLLER_ROLE` / `BOT_ROLE`: Can execute `refillVaultLiquidity` and `sweepReserveLiquidity`.

---

## 7. OracleManager & Oracle Providers

### Purpose
`OracleManager` aggregates pricing from `ChainlinkOracleProvider` and optional fallback providers, enforcing heartbeat checks and price freshness bounds.

### Roles
- `GOVERNANCE_ROLE`: Configures asset feeds, heartbeats, and fallbacks.
- `ORACLE_OPERATOR_ROLE`: Updates manual or mock prices when using `MockOracleProvider`.

### Key Public Methods
- `configureAsset(bytes32 assetId, address primaryProvider, address fallbackProvider, uint256 heartbeat, bool enabled)`: Sets oracle feed configuration.
- `getAssetPrice(address asset) returns (uint256)`: Returns normalized asset price in 18 decimals.
- `isPriceFresh(address asset) returns (bool)`: Returns true if price is within heartbeat limits.

---

## 8. StrategyManager & PortfolioManager

### Purpose
`StrategyManager` maintains target portfolio allocation weights (in BPS). `PortfolioManager` evaluates current NAV, computes allocation drift, and executes rebalance swaps through `SwapAdapter`.

### Key Public Methods
- `setStrategyWeights(address[] assets, uint256[] weights)`: Configures target allocation percentages.
- `calculateNAV() returns (uint256)`: Calculates total portfolio USD valuation in 18 decimals.
- `rebalance(address[] targetAssets, uint256[] targetWeights)`: Performs asset swaps to restore target portfolio weighting.

---

## 9. SwapAdapter

### Purpose
Wraps DEX routers (e.g. Uniswap V3) to perform token swaps with guaranteed minimum output bounds computed using `OracleManager` prices and `swapSlippageBps`.

---

## 10. UVBTCETHToken

### Purpose
Standard ERC20 token representing shares in the UnifyVault.

### Roles
- `DEFAULT_ADMIN_ROLE`: Role management.
- `CONTROLLER_ROLE`: Restricted access to `mint(address to, uint256 amount)` and `burn(address from, uint256 amount)`.

---

## 11. UnifyVaultTimelock

### Purpose
Inherits OpenZeppelin `TimelockController` to enforce a 48-hour delay on governance proposals.

### Key Configuration
- Minimum delay: `48 hours` (`172800` seconds).
- Proposer: Configured Gnosis Safe address.
- Executor: Open execution (`address(0)`).
