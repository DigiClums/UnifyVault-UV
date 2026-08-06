# ABI Lock

> **Freeze Status**: LOCKED & FROZEN  
> **Compiler**: Solc 0.8.24

This document freezes the Application Binary Interface (ABI) for all production smart contracts in UnifyVault V2.

## ChainlinkOracleProvider

### Functions

| Function Name        | Inputs                                                           | Outputs               | State Mutability |
| :------------------- | :--------------------------------------------------------------- | :-------------------- | :--------------- |
| `DEFAULT_ADMIN_ROLE` | `()`                                                             | `(bytes32 )`          | `view`           |
| `PROVIDER_ID`        | `()`                                                             | `(bytes32 )`          | `view`           |
| `getDecimals`        | `(bytes32 assetId)`                                              | `(uint8 decimals)`    | `view`           |
| `getFeedConfig`      | `(bytes32 assetId)`                                              | `(tuple config)`      | `view`           |
| `getLatestPrice`     | `(bytes32 assetId)`                                              | `(uint256 price)`     | `view`           |
| `getLatestRound`     | `(bytes32 assetId)`                                              | `(tuple round)`       | `view`           |
| `getRoleAdmin`       | `(bytes32 role)`                                                 | `(bytes32 )`          | `view`           |
| `getUpdatedAt`       | `(bytes32 assetId)`                                              | `(uint256 updatedAt)` | `view`           |
| `grantRole`          | `(bytes32 role, address account)`                                | `()`                  | `nonpayable`     |
| `hasRole`            | `(bytes32 role, address account)`                                | `(bool )`             | `view`           |
| `isHealthy`          | `(bytes32 assetId)`                                              | `(bool healthy)`      | `view`           |
| `registerFeed`       | `(bytes32 assetId, address feedAddress, uint32 heartbeat)`       | `()`                  | `nonpayable`     |
| `removeFeed`         | `(bytes32 assetId)`                                              | `()`                  | `nonpayable`     |
| `renounceRole`       | `(bytes32 role, address callerConfirmation)`                     | `()`                  | `nonpayable`     |
| `revokeRole`         | `(bytes32 role, address account)`                                | `()`                  | `nonpayable`     |
| `setFeedEnabled`     | `(bytes32 assetId, bool enabled)`                                | `()`                  | `nonpayable`     |
| `supportsInterface`  | `(bytes4 interfaceId)`                                           | `(bool )`             | `view`           |
| `updateFeed`         | `(bytes32 assetId, address newFeedAddress, uint32 newHeartbeat)` | `()`                  | `nonpayable`     |
| `updateHeartbeat`    | `(bytes32 assetId, uint32 newHeartbeat)`                         | `()`                  | `nonpayable`     |

### Events

| Event Name         | Parameters                                                                                                                                    |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `FeedEnabledSet`   | `(bytes32 indexed assetId, bool oldStatus, bool newStatus, address indexed caller)`                                                           |
| `FeedRegistered`   | `(bytes32 indexed assetId, address indexed feedAddress, uint32 heartbeat, address indexed caller)`                                            |
| `FeedRemoved`      | `(bytes32 indexed assetId, address indexed oldFeedAddress, address indexed caller)`                                                           |
| `FeedUpdated`      | `(bytes32 indexed assetId, address oldFeedAddress, address newFeedAddress, uint32 oldHeartbeat, uint32 newHeartbeat, address indexed caller)` |
| `HeartbeatUpdated` | `(bytes32 indexed assetId, uint32 oldHeartbeat, uint32 newHeartbeat, address indexed caller)`                                                 |
| `RoleAdminChanged` | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`                                                     |
| `RoleGranted`      | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                                     |
| `RoleRevoked`      | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                                     |

### Custom Errors

| Error Name                         | Parameters                                           |
| :--------------------------------- | :--------------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                                 |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`              |
| `AssetNotSupported`                | `(bytes32 assetId)`                                  |
| `EntryAlreadyExists`               | `(bytes32 id)`                                       |
| `HeartbeatIntervalOutofBounds`     | `()`                                                 |
| `IncompleteRound`                  | `(bytes32 assetId)`                                  |
| `OracleProviderPriceNegative`      | `(bytes32 assetId, int256 price)`                    |
| `OracleProviderPriceStale`         | `(bytes32 assetId, uint256 priceAge, uint256 limit)` |
| `ZeroAddressDetected`              | `()`                                                 |

## CustodyVault

### Functions

| Function Name        | Inputs                                          | Outputs      | State Mutability |
| :------------------- | :---------------------------------------------- | :----------- | :--------------- |
| `CONTROLLER_ROLE`    | `()`                                            | `(bytes32 )` | `view`           |
| `DEFAULT_ADMIN_ROLE` | `()`                                            | `(bytes32 )` | `view`           |
| `GUARDIAN_ROLE`      | `()`                                            | `(bytes32 )` | `view`           |
| `assetConfig`        | `(address asset)`                               | `(tuple )`   | `view`           |
| `balance`            | `(address asset)`                               | `(uint256 )` | `view`           |
| `deposit`            | `(address asset, address from, uint256 amount)` | `()`         | `nonpayable`     |
| `disableAsset`       | `(address asset)`                               | `()`         | `nonpayable`     |
| `enableAsset`        | `(address asset)`                               | `()`         | `nonpayable`     |
| `getRoleAdmin`       | `(bytes32 role)`                                | `(bytes32 )` | `view`           |
| `grantRole`          | `(bytes32 role, address account)`               | `()`         | `nonpayable`     |
| `hasRole`            | `(bytes32 role, address account)`               | `(bool )`    | `view`           |
| `isSupported`        | `(address asset)`                               | `(bool )`    | `view`           |
| `pause`              | `()`                                            | `()`         | `nonpayable`     |
| `paused`             | `()`                                            | `(bool )`    | `view`           |
| `registerAsset`      | `(address asset, uint8 decimals)`               | `()`         | `nonpayable`     |
| `removeAsset`        | `(address asset)`                               | `()`         | `nonpayable`     |
| `renounceRole`       | `(bytes32 role, address callerConfirmation)`    | `()`         | `nonpayable`     |
| `revokeRole`         | `(bytes32 role, address account)`               | `()`         | `nonpayable`     |
| `supportsInterface`  | `(bytes4 interfaceId)`                          | `(bool )`    | `view`           |
| `surplusAssets`      | `(address asset)`                               | `(uint256 )` | `view`           |
| `syncAccounting`     | `(address asset)`                               | `()`         | `nonpayable`     |
| `totalAssetBalance`  | `(address asset)`                               | `(uint256 )` | `view`           |
| `totalAssets`        | `(address asset)`                               | `(uint256 )` | `view`           |
| `unpause`            | `()`                                            | `()`         | `nonpayable`     |
| `withdraw`           | `(address asset, address to, uint256 amount)`   | `()`         | `nonpayable`     |

### Events

| Event Name           | Parameters                                                                                |
| :------------------- | :---------------------------------------------------------------------------------------- |
| `AssetDisabled`      | `(address indexed asset, address indexed caller)`                                         |
| `AssetEnabled`       | `(address indexed asset, address indexed caller)`                                         |
| `AssetRegistered`    | `(address indexed asset, uint8 decimals, address indexed caller)`                         |
| `AssetRemoved`       | `(address indexed asset, address indexed caller)`                                         |
| `DepositExecuted`    | `(address indexed asset, address indexed from, uint256 amount, address indexed caller)`   |
| `Paused`             | `(address account)`                                                                       |
| `RoleAdminChanged`   | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)` |
| `RoleGranted`        | `(bytes32 indexed role, address indexed account, address indexed sender)`                 |
| `RoleRevoked`        | `(bytes32 indexed role, address indexed account, address indexed sender)`                 |
| `Unpaused`           | `(address account)`                                                                       |
| `WithdrawalExecuted` | `(address indexed asset, address indexed to, uint256 amount, address indexed caller)`     |

### Custom Errors

| Error Name                         | Parameters                                           |
| :--------------------------------- | :--------------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                                 |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`              |
| `AssetNotSupported`                | `(bytes32 assetId)`                                  |
| `EnforcedPause`                    | `()`                                                 |
| `EntryAlreadyExists`               | `(bytes32 id)`                                       |
| `ExpectedPause`                    | `()`                                                 |
| `IdenticalAddressSubmitted`        | `()`                                                 |
| `InsufficientReserves`             | `(address asset, uint256 requested, uint256 actual)` |
| `MathCalculationOverflow`          | `()`                                                 |
| `ReentrancyGuardReentrantCall`     | `()`                                                 |
| `SafeERC20FailedOperation`         | `(address token)`                                    |
| `ZeroAddressDetected`              | `()`                                                 |

## FeeManager

### Functions

| Function Name         | Inputs                                       | Outputs      | State Mutability |
| :-------------------- | :------------------------------------------- | :----------- | :--------------- |
| `BPS_DENOMINATOR`     | `()`                                         | `(uint256 )` | `view`           |
| `DEFAULT_ADMIN_ROLE`  | `()`                                         | `(bytes32 )` | `view`           |
| `MAX_DEPOSIT_FEE_BPS` | `()`                                         | `(uint256 )` | `view`           |
| `MAX_REDEEM_FEE_BPS`  | `()`                                         | `(uint256 )` | `view`           |
| `depositFeeBps`       | `()`                                         | `(uint256 )` | `view`           |
| `getRoleAdmin`        | `(bytes32 role)`                             | `(bytes32 )` | `view`           |
| `grantRole`           | `(bytes32 role, address account)`            | `()`         | `nonpayable`     |
| `hasRole`             | `(bytes32 role, address account)`            | `(bool )`    | `view`           |
| `redeemFeeBps`        | `()`                                         | `(uint256 )` | `view`           |
| `renounceRole`        | `(bytes32 role, address callerConfirmation)` | `()`         | `nonpayable`     |
| `revokeRole`          | `(bytes32 role, address account)`            | `()`         | `nonpayable`     |
| `setDepositFeeBps`    | `(uint256 newFeeBps)`                        | `()`         | `nonpayable`     |
| `setRedeemFeeBps`     | `(uint256 newFeeBps)`                        | `()`         | `nonpayable`     |
| `setTreasury`         | `(address newTreasury)`                      | `()`         | `nonpayable`     |
| `supportsInterface`   | `(bytes4 interfaceId)`                       | `(bool )`    | `view`           |
| `treasury`            | `()`                                         | `(address )` | `view`           |

### Events

| Event Name          | Parameters                                                                                |
| :------------------ | :---------------------------------------------------------------------------------------- |
| `DepositFeeUpdated` | `(uint256 oldFeeBps, uint256 newFeeBps)`                                                  |
| `RedeemFeeUpdated`  | `(uint256 oldFeeBps, uint256 newFeeBps)`                                                  |
| `RoleAdminChanged`  | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)` |
| `RoleGranted`       | `(bytes32 indexed role, address indexed account, address indexed sender)`                 |
| `RoleRevoked`       | `(bytes32 indexed role, address indexed account, address indexed sender)`                 |
| `TreasuryUpdated`   | `(address indexed oldTreasury, address indexed newTreasury)`                              |

### Custom Errors

| Error Name                         | Parameters                              |
| :--------------------------------- | :-------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                    |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)` |
| `FeeExceedsMaxCap`                 | `(uint256 feeBps, uint256 maxCap)`      |
| `ZeroAddressDetected`              | `()`                                    |

## LiquidityManager

### Functions

| Function Name                    | Inputs                                                                                                  | Outputs                                                                                  | State Mutability |
| :------------------------------- | :------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------- | :--------------- |
| `BPS_DENOMINATOR`                | `()`                                                                                                    | `(uint256 )`                                                                             | `view`           |
| `DEFAULT_ADMIN_ROLE`             | `()`                                                                                                    | `(bytes32 )`                                                                             | `view`           |
| `DEFAULT_EXCESS_THRESHOLD_BPS`   | `()`                                                                                                    | `(uint256 )`                                                                             | `view`           |
| `DEFAULT_OPERATIONAL_TARGET_BPS` | `()`                                                                                                    | `(uint256 )`                                                                             | `view`           |
| `DEFAULT_REFILL_THRESHOLD_BPS`   | `()`                                                                                                    | `(uint256 )`                                                                             | `view`           |
| `assessLiquidity`                | `(address asset)`                                                                                       | `(bool needsRefill, bool needsSweep, uint256 amount, uint256 targetOperationalBalance)`  | `view`           |
| `checkLiquidity`                 | `(address asset)`                                                                                       | `(bool needsRefill, bool needsSweep, uint256 amount)`                                    | `nonpayable`     |
| `custodyVault`                   | `()`                                                                                                    | `(address )`                                                                             | `view`           |
| `directory`                      | `()`                                                                                                    | `(address )`                                                                             | `view`           |
| `getLiquidityBalances`           | `(address asset)`                                                                                       | `(uint256 operationalBalance, uint256 reserveBalance, uint256 totalBalance)`             | `view`           |
| `getRoleAdmin`                   | `(bytes32 role)`                                                                                        | `(bytes32 )`                                                                             | `view`           |
| `getThresholds`                  | `(address asset)`                                                                                       | `(uint256 operationalTargetBps, uint256 refillThresholdBps, uint256 excessThresholdBps)` | `view`           |
| `grantRole`                      | `(bytes32 role, address account)`                                                                       | `()`                                                                                     | `nonpayable`     |
| `hasRole`                        | `(bytes32 role, address account)`                                                                       | `(bool )`                                                                                | `view`           |
| `recordDeposit`                  | `(address asset, uint256 amount)`                                                                       | `()`                                                                                     | `nonpayable`     |
| `recordWithdrawal`               | `(address asset, uint256 amount)`                                                                       | `()`                                                                                     | `nonpayable`     |
| `refillOperationalLiquidity`     | `(address asset, uint256 amount)`                                                                       | `()`                                                                                     | `nonpayable`     |
| `renounceRole`                   | `(bytes32 role, address callerConfirmation)`                                                            | `()`                                                                                     | `nonpayable`     |
| `resetThresholds`                | `(address asset)`                                                                                       | `()`                                                                                     | `nonpayable`     |
| `revokeRole`                     | `(bytes32 role, address account)`                                                                       | `()`                                                                                     | `nonpayable`     |
| `setLiquidityBalances`           | `(address asset, uint256 opBalance, uint256 resBalance)`                                                | `()`                                                                                     | `nonpayable`     |
| `setThresholds`                  | `(address asset, uint256 operationalTargetBps, uint256 refillThresholdBps, uint256 excessThresholdBps)` | `()`                                                                                     | `nonpayable`     |
| `supportsInterface`              | `(bytes4 interfaceId)`                                                                                  | `(bool )`                                                                                | `view`           |
| `sweepReserveLiquidity`          | `(address asset, uint256 amount)`                                                                       | `()`                                                                                     | `nonpayable`     |
| `syncModules`                    | `()`                                                                                                    | `()`                                                                                     | `nonpayable`     |

### Events

| Event Name                     | Parameters                                                                                                                              |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `LiquidityBalancesSynced`      | `(address indexed asset, uint256 operationalBalance, uint256 reserveBalance, address indexed caller)`                                   |
| `OperationalLiquidityRefilled` | `(address indexed asset, uint256 amount, uint256 newOperationalBalance, uint256 newReserveBalance, address indexed caller)`             |
| `RefillRequired`               | `(address indexed asset, uint256 currentOperationalBalance, uint256 targetOperationalBalance, uint256 requiredRefillAmount)`            |
| `ReserveLiquiditySwept`        | `(address indexed asset, uint256 amount, uint256 newOperationalBalance, uint256 newReserveBalance, address indexed caller)`             |
| `ReserveSweepRequired`         | `(address indexed asset, uint256 currentOperationalBalance, uint256 targetOperationalBalance, uint256 excessSweepAmount)`               |
| `RoleAdminChanged`             | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`                                               |
| `RoleGranted`                  | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                               |
| `RoleRevoked`                  | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                               |
| `ThresholdsConfigured`         | `(address indexed asset, uint256 operationalTargetBps, uint256 refillThresholdBps, uint256 excessThresholdBps, address indexed caller)` |
| `VaultSynchronized`            | `(address indexed vault)`                                                                                                               |

### Custom Errors

| Error Name                         | Parameters                                              |
| :--------------------------------- | :------------------------------------------------------ |
| `AccessControlBadConfirmation`     | `()`                                                    |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`                 |
| `InsufficientOperationalBalance`   | `(address asset, uint256 requested, uint256 available)` |
| `InsufficientReserveBalance`       | `(address asset, uint256 requested, uint256 available)` |
| `InvalidThresholdConfiguration`    | `()`                                                    |
| `ZeroAddressDetected`              | `()`                                                    |
| `ZeroAmountDetected`               | `()`                                                    |

## OracleManager

### Functions

| Function Name               | Inputs                                                                                                 | Outputs                                 | State Mutability |
| :-------------------------- | :----------------------------------------------------------------------------------------------------- | :-------------------------------------- | :--------------- |
| `BPS_DENOMINATOR`           | `()`                                                                                                   | `(uint256 )`                            | `view`           |
| `DEFAULT_ADMIN_ROLE`        | `()`                                                                                                   | `(bytes32 )`                            | `view`           |
| `DEFAULT_MAX_DEVIATION_BPS` | `()`                                                                                                   | `(uint256 )`                            | `view`           |
| `MAX_ALLOWED_DEVIATION_BPS` | `()`                                                                                                   | `(uint256 )`                            | `view`           |
| `PROVIDER_ID`               | `()`                                                                                                   | `(bytes32 )`                            | `view`           |
| `configureAsset`            | `(bytes32 assetId, address primaryProvider, address fallbackProvider, uint32 heartbeat, bool enabled)` | `()`                                    | `nonpayable`     |
| `getAssetConfig`            | `(bytes32 assetId)`                                                                                    | `(tuple config)`                        | `view`           |
| `getAssetPrice`             | `(address asset)`                                                                                      | `(uint256 price)`                       | `view`           |
| `getFallbackProvider`       | `(bytes32 assetId)`                                                                                    | `(address fallbackProvider)`            | `view`           |
| `getFeedMetadata`           | `(address asset)`                                                                                      | `(address provider, uint256 heartbeat)` | `view`           |
| `getLastValidPrice`         | `(bytes32 assetId)`                                                                                    | `(uint256 )`                            | `view`           |
| `getMaxDeviationBps`        | `(bytes32 assetId)`                                                                                    | `(uint256 )`                            | `view`           |
| `getNormalizedPrice`        | `(bytes32 assetId)`                                                                                    | `(uint256 price)`                       | `view`           |
| `getPrice`                  | `(bytes32 assetId)`                                                                                    | `(tuple round)`                         | `view`           |
| `getProvider`               | `(bytes32 assetId)`                                                                                    | `(address provider)`                    | `view`           |
| `getRoleAdmin`              | `(bytes32 role)`                                                                                       | `(bytes32 )`                            | `view`           |
| `getValidatedPrice`         | `(bytes32 assetId)`                                                                                    | `(uint256 price)`                       | `nonpayable`     |
| `grantRole`                 | `(bytes32 role, address account)`                                                                      | `()`                                    | `nonpayable`     |
| `hasRole`                   | `(bytes32 role, address account)`                                                                      | `(bool )`                               | `view`           |
| `isHealthy`                 | `(bytes32 assetId)`                                                                                    | `(bool healthy)`                        | `view`           |
| `isPriceFresh`              | `(address asset)`                                                                                      | `(bool isFresh)`                        | `view`           |
| `renounceRole`              | `(bytes32 role, address callerConfirmation)`                                                           | `()`                                    | `nonpayable`     |
| `resetCircuitBreaker`       | `(bytes32 assetId, uint256 manualPrice)`                                                               | `()`                                    | `nonpayable`     |
| `revokeRole`                | `(bytes32 role, address account)`                                                                      | `()`                                    | `nonpayable`     |
| `setAssetEnabled`           | `(bytes32 assetId, bool enabled)`                                                                      | `()`                                    | `nonpayable`     |
| `setMaxDeviationBps`        | `(bytes32 assetId, uint256 deviationBps)`                                                              | `()`                                    | `nonpayable`     |
| `supportsInterface`         | `(bytes4 interfaceId)`                                                                                 | `(bool )`                               | `view`           |

### Events

| Event Name                | Parameters                                                                                    |
| :------------------------ | :-------------------------------------------------------------------------------------------- |
| `CircuitBreakerReset`     | `(bytes32 indexed assetId, uint256 oldPrice, uint256 newPrice, address indexed caller)`       |
| `FallbackProviderUpdated` | `(bytes32 indexed assetId, address oldProvider, address newProvider, address indexed caller)` |
| `MaxDeviationUpdated`     | `(bytes32 indexed assetId, uint256 oldBps, uint256 newBps, address indexed caller)`           |
| `OracleFailure`           | `(address indexed asset, string reason)`                                                      |
| `OracleFallback`          | `(address indexed asset, address indexed fallbackProvider, uint256 price)`                    |
| `PrimaryProviderUpdated`  | `(bytes32 indexed assetId, address oldProvider, address newProvider, address indexed caller)` |
| `ProviderDisabled`        | `(bytes32 indexed assetId, address indexed caller)`                                           |
| `ProviderEnabled`         | `(bytes32 indexed assetId, address indexed caller)`                                           |
| `RoleAdminChanged`        | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`     |
| `RoleGranted`             | `(bytes32 indexed role, address indexed account, address indexed sender)`                     |
| `RoleRevoked`             | `(bytes32 indexed role, address indexed account, address indexed sender)`                     |

### Custom Errors

| Error Name                         | Parameters                              |
| :--------------------------------- | :-------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                    |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)` |
| `AssetNotSupported`                | `(bytes32 assetId)`                     |
| `HeartbeatIntervalOutofBounds`     | `()`                                    |
| `MathCalculationOverflow`          | `()`                                    |
| `UnsafePricing`                    | `(address asset)`                       |
| `ZeroAddressDetected`              | `()`                                    |

## PortfolioManager

### Functions

| Function Name             | Inputs                                          | Outputs                                                 | State Mutability |
| :------------------------ | :---------------------------------------------- | :------------------------------------------------------ | :--------------- |
| `BPS_DENOMINATOR`         | `()`                                            | `(uint256 )`                                            | `view`           |
| `DEFAULT_ADMIN_ROLE`      | `()`                                            | `(bytes32 )`                                            | `view`           |
| `INITIAL_NAV_PER_SHARE`   | `()`                                            | `(uint256 )`                                            | `view`           |
| `calculateAllocation`     | `(address depositAsset, uint256 depositAmount)` | `(address[] targetAssets, uint256[] allocationAmounts)` | `view`           |
| `calculateNAV`            | `()`                                            | `(uint256 totalPortfolioValueUSD, uint256 navPerShare)` | `view`           |
| `calculatePortfolioValue` | `()`                                            | `(uint256 totalPortfolioValueUSD)`                      | `view`           |
| `custodyVault`            | `()`                                            | `(address )`                                            | `view`           |
| `directory`               | `()`                                            | `(address )`                                            | `view`           |
| `getRoleAdmin`            | `(bytes32 role)`                                | `(bytes32 )`                                            | `view`           |
| `grantRole`               | `(bytes32 role, address account)`               | `()`                                                    | `nonpayable`     |
| `hasRole`                 | `(bytes32 role, address account)`               | `(bool )`                                               | `view`           |
| `indexToken`              | `()`                                            | `(address )`                                            | `view`           |
| `oracleManager`           | `()`                                            | `(address )`                                            | `view`           |
| `previewDeposit`          | `(address depositAsset, uint256 depositAmount)` | `(tuple preview)`                                       | `view`           |
| `previewRedeem`           | `(uint256 sharesToBurn, address payoutAsset)`   | `(tuple preview)`                                       | `view`           |
| `renounceRole`            | `(bytes32 role, address callerConfirmation)`    | `()`                                                    | `nonpayable`     |
| `revokeRole`              | `(bytes32 role, address account)`               | `()`                                                    | `nonpayable`     |
| `setStrategyManager`      | `(address newStrategyManager)`                  | `()`                                                    | `nonpayable`     |
| `strategyManager`         | `()`                                            | `(address )`                                            | `view`           |
| `supportsInterface`       | `(bytes4 interfaceId)`                          | `(bool )`                                               | `view`           |
| `syncModules`             | `()`                                            | `()`                                                    | `nonpayable`     |

### Events

| Event Name             | Parameters                                                                                                   |
| :--------------------- | :----------------------------------------------------------------------------------------------------------- |
| `AllocationCalculated` | `(address indexed depositAsset, uint256 depositAmount, address[] targetAssets, uint256[] allocationAmounts)` |
| `NAVUpdated`           | `(uint256 totalPortfolioValueUSD, uint256 navPerShare, uint256 timestamp)`                                   |
| `RoleAdminChanged`     | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`                    |
| `RoleGranted`          | `(bytes32 indexed role, address indexed account, address indexed sender)`                                    |
| `RoleRevoked`          | `(bytes32 indexed role, address indexed account, address indexed sender)`                                    |
| `StrategySynchronized` | `(address indexed strategyManager)`                                                                          |

### Custom Errors

| Error Name                         | Parameters                              |
| :--------------------------------- | :-------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                    |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)` |
| `AssetNotSupportedByOracle`        | `(address asset)`                       |
| `InvalidOracle`                    | `()`                                    |
| `InvalidStrategyManager`           | `()`                                    |
| `InvalidToken`                     | `()`                                    |
| `InvalidVault`                     | `()`                                    |
| `ZeroAddressDetected`              | `()`                                    |
| `ZeroAmountDetected`               | `()`                                    |
| `ZeroShareSupplyWithNonZeroValue`  | `()`                                    |

## ProtocolDirectory

### Functions

| Function Name        | Inputs                                       | Outputs      | State Mutability |
| :------------------- | :------------------------------------------- | :----------- | :--------------- |
| `DEFAULT_ADMIN_ROLE` | `()`                                         | `(bytes32 )` | `view`           |
| `exists`             | `(bytes32 name)`                             | `(bool )`    | `view`           |
| `freeze`             | `()`                                         | `()`         | `nonpayable`     |
| `getAddress`         | `(bytes32 name)`                             | `(address )` | `view`           |
| `getRoleAdmin`       | `(bytes32 role)`                             | `(bytes32 )` | `view`           |
| `grantRole`          | `(bytes32 role, address account)`            | `()`         | `nonpayable`     |
| `hasRole`            | `(bytes32 role, address account)`            | `(bool )`    | `view`           |
| `isFrozen`           | `()`                                         | `(bool )`    | `view`           |
| `registerAddress`    | `(bytes32 id, address target)`               | `()`         | `nonpayable`     |
| `removeAddress`      | `(bytes32 id)`                               | `()`         | `nonpayable`     |
| `renounceRole`       | `(bytes32 role, address callerConfirmation)` | `()`         | `nonpayable`     |
| `revokeRole`         | `(bytes32 role, address account)`            | `()`         | `nonpayable`     |
| `supportsInterface`  | `(bytes4 interfaceId)`                       | `(bool )`    | `view`           |
| `updateAddress`      | `(bytes32 id, address target)`               | `()`         | `nonpayable`     |

### Events

| Event Name          | Parameters                                                                                   |
| :------------------ | :------------------------------------------------------------------------------------------- |
| `AddressRegistered` | `(bytes32 indexed id, address indexed target, address indexed caller)`                       |
| `AddressRemoved`    | `(bytes32 indexed id, address indexed oldTarget, address indexed caller)`                    |
| `AddressUpdated`    | `(bytes32 indexed id, address indexed oldTarget, address newTarget, address indexed caller)` |
| `RegistryFrozen`    | `(address indexed caller)`                                                                   |
| `RoleAdminChanged`  | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`    |
| `RoleGranted`       | `(bytes32 indexed role, address indexed account, address indexed sender)`                    |
| `RoleRevoked`       | `(bytes32 indexed role, address indexed account, address indexed sender)`                    |

### Custom Errors

| Error Name                         | Parameters                              |
| :--------------------------------- | :-------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                    |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)` |
| `EntryAlreadyExists`               | `(bytes32 id)`                          |
| `EntryDoesNotExist`                | `(bytes32 id)`                          |
| `IdenticalAddressSubmitted`        | `()`                                    |
| `RegistryIsFrozen`                 | `()`                                    |
| `ZeroAddressDetected`              | `()`                                    |

## StrategyManager

### Functions

| Function Name           | Inputs                                       | Outputs                                    | State Mutability |
| :---------------------- | :------------------------------------------- | :----------------------------------------- | :--------------- |
| `DEFAULT_ADMIN_ROLE`    | `()`                                         | `(bytes32 )`                               | `view`           |
| `TOTAL_BPS`             | `()`                                         | `(uint256 )`                               | `view`           |
| `addAsset`              | `(address asset, uint256 weightBps)`         | `()`                                       | `nonpayable`     |
| `getAssetCount`         | `()`                                         | `(uint256 )`                               | `view`           |
| `getAssetWeight`        | `(address asset)`                            | `(uint256 )`                               | `view`           |
| `getRoleAdmin`          | `(bytes32 role)`                             | `(bytes32 )`                               | `view`           |
| `getSupportedAssets`    | `()`                                         | `(address[] )`                             | `view`           |
| `getTargetWeights`      | `()`                                         | `(address[] assets, uint256[] weightsBps)` | `view`           |
| `getTotalAllocationBps` | `()`                                         | `(uint256 )`                               | `view`           |
| `grantRole`             | `(bytes32 role, address account)`            | `()`                                       | `nonpayable`     |
| `hasRole`               | `(bytes32 role, address account)`            | `(bool )`                                  | `view`           |
| `isSupportedAsset`      | `(address asset)`                            | `(bool )`                                  | `view`           |
| `removeAsset`           | `(address asset)`                            | `()`                                       | `nonpayable`     |
| `renounceRole`          | `(bytes32 role, address callerConfirmation)` | `()`                                       | `nonpayable`     |
| `revokeRole`            | `(bytes32 role, address account)`            | `()`                                       | `nonpayable`     |
| `setStrategy`           | `(address[] assets, uint256[] weightsBps)`   | `()`                                       | `nonpayable`     |
| `supportsInterface`     | `(bytes4 interfaceId)`                       | `(bool )`                                  | `view`           |
| `updateWeights`         | `(address[] assets, uint256[] weightsBps)`   | `()`                                       | `nonpayable`     |

### Events

| Event Name           | Parameters                                                                                    |
| :------------------- | :-------------------------------------------------------------------------------------------- |
| `AssetAdded`         | `(address indexed asset, uint256 weightBps, address indexed caller)`                          |
| `AssetRemoved`       | `(address indexed asset, address indexed caller)`                                             |
| `RoleAdminChanged`   | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`     |
| `RoleGranted`        | `(bytes32 indexed role, address indexed account, address indexed sender)`                     |
| `RoleRevoked`        | `(bytes32 indexed role, address indexed account, address indexed sender)`                     |
| `StrategyRebalanced` | `(address indexed caller, address[] assets, uint256[] newWeights)`                            |
| `StrategyUpdated`    | `(address[] assets, uint256[] weightsBps, address indexed caller)`                            |
| `WeightUpdated`      | `(address indexed asset, uint256 oldWeightBps, uint256 newWeightBps, address indexed caller)` |

### Custom Errors

| Error Name                         | Parameters                                |
| :--------------------------------- | :---------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                      |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`   |
| `ArrayLengthMismatch`              | `()`                                      |
| `AssetAlreadySupported`            | `(address asset)`                         |
| `AssetNotSupportedByStrategy`      | `(address asset)`                         |
| `EmptyStrategyNotAllowed`          | `()`                                      |
| `InvalidTotalAllocation`           | `(uint256 totalBps, uint256 expectedBps)` |
| `ZeroAddressDetected`              | `()`                                      |
| `ZeroWeightNotAllowed`             | `()`                                      |

## SwapAdapter

### Functions

| Function Name        | Inputs                                                                                                             | Outputs               | State Mutability |
| :------------------- | :----------------------------------------------------------------------------------------------------------------- | :-------------------- | :--------------- |
| `DEFAULT_ADMIN_ROLE` | `()`                                                                                                               | `(bytes32 )`          | `view`           |
| `DEFAULT_FEE_TIER`   | `()`                                                                                                               | `(uint24 )`           | `view`           |
| `getExpectedOutput`  | `(address tokenIn, address tokenOut, uint256 amountIn)`                                                            | `(uint256 amountOut)` | `pure`           |
| `getRoleAdmin`       | `(bytes32 role)`                                                                                                   | `(bytes32 )`          | `view`           |
| `grantRole`          | `(bytes32 role, address account)`                                                                                  | `()`                  | `nonpayable`     |
| `hasRole`            | `(bytes32 role, address account)`                                                                                  | `(bool )`             | `view`           |
| `renounceRole`       | `(bytes32 role, address callerConfirmation)`                                                                       | `()`                  | `nonpayable`     |
| `revokeRole`         | `(bytes32 role, address account)`                                                                                  | `()`                  | `nonpayable`     |
| `router`             | `()`                                                                                                               | `(address )`          | `view`           |
| `setRouter`          | `(address newRouter)`                                                                                              | `()`                  | `nonpayable`     |
| `supportsInterface`  | `(bytes4 interfaceId)`                                                                                             | `(bool )`             | `view`           |
| `swap`               | `(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient, uint256 deadline)` | `(uint256 amountOut)` | `nonpayable`     |
| `swap`               | `(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient)`                   | `(uint256 amountOut)` | `nonpayable`     |
| `swapExactInput`     | `(tuple params)`                                                                                                   | `(uint256 amountOut)` | `nonpayable`     |
| `swapExactOutput`    | `(tuple params)`                                                                                                   | `(uint256 amountIn)`  | `nonpayable`     |

### Events

| Event Name         | Parameters                                                                                                            |
| :----------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `RoleAdminChanged` | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`                             |
| `RoleGranted`      | `(bytes32 indexed role, address indexed account, address indexed sender)`                                             |
| `RoleRevoked`      | `(bytes32 indexed role, address indexed account, address indexed sender)`                                             |
| `RouterUpdated`    | `(address indexed oldRouter, address indexed newRouter, address indexed caller)`                                      |
| `SwapExecuted`     | `(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address indexed recipient)` |

### Custom Errors

| Error Name                         | Parameters                                     |
| :--------------------------------- | :--------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                           |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`        |
| `DeadlineExpired`                  | `(uint256 deadline, uint256 currentTimestamp)` |
| `InvalidRouter`                    | `()`                                           |
| `SafeERC20FailedOperation`         | `(address token)`                              |
| `SlippageLimitExceeded`            | `(uint256 expected, uint256 actual)`           |
| `SwapExecutionFailed`              | `()`                                           |
| `ZeroAddressDetected`              | `()`                                           |
| `ZeroAmountDetected`               | `()`                                           |

## Treasury

### Functions

| Function Name        | Inputs                                               | Outputs      | State Mutability |
| :------------------- | :--------------------------------------------------- | :----------- | :--------------- |
| `CONTROLLER_ROLE`    | `()`                                                 | `(bytes32 )` | `view`           |
| `DEFAULT_ADMIN_ROLE` | `()`                                                 | `(bytes32 )` | `view`           |
| `GUARDIAN_ROLE`      | `()`                                                 | `(bytes32 )` | `view`           |
| `assetConfig`        | `(address asset)`                                    | `(tuple )`   | `view`           |
| `balance`            | `(address asset)`                                    | `(uint256 )` | `view`           |
| `collectFee`         | `(address asset, uint256 amount)`                    | `()`         | `nonpayable`     |
| `disableAsset`       | `(address asset)`                                    | `()`         | `nonpayable`     |
| `enableAsset`        | `(address asset)`                                    | `()`         | `nonpayable`     |
| `getRoleAdmin`       | `(bytes32 role)`                                     | `(bytes32 )` | `view`           |
| `grantRole`          | `(bytes32 role, address account)`                    | `()`         | `nonpayable`     |
| `hasRole`            | `(bytes32 role, address account)`                    | `(bool )`    | `view`           |
| `isSupported`        | `(address asset)`                                    | `(bool )`    | `view`           |
| `nativeBalance`      | `()`                                                 | `(uint256 )` | `view`           |
| `pause`              | `()`                                                 | `()`         | `nonpayable`     |
| `paused`             | `()`                                                 | `(bool )`    | `view`           |
| `registerAsset`      | `(address asset, uint8 decimals)`                    | `()`         | `nonpayable`     |
| `removeAsset`        | `(address asset)`                                    | `()`         | `nonpayable`     |
| `renounceRole`       | `(bytes32 role, address callerConfirmation)`         | `()`         | `nonpayable`     |
| `revokeRole`         | `(bytes32 role, address account)`                    | `()`         | `nonpayable`     |
| `supportsInterface`  | `(bytes4 interfaceId)`                               | `(bool )`    | `view`           |
| `totalAssetBalance`  | `(address asset)`                                    | `(uint256 )` | `view`           |
| `unpause`            | `()`                                                 | `()`         | `nonpayable`     |
| `withdraw`           | `(address asset, address recipient, uint256 amount)` | `()`         | `nonpayable`     |
| `withdrawNative`     | `(address recipient, uint256 amount)`                | `()`         | `nonpayable`     |

### Events

| Event Name           | Parameters                                                                                   |
| :------------------- | :------------------------------------------------------------------------------------------- |
| `AssetDisabled`      | `(address indexed asset, address indexed caller)`                                            |
| `AssetEnabled`       | `(address indexed asset, address indexed caller)`                                            |
| `AssetRegistered`    | `(address indexed asset, uint8 decimals, address indexed caller)`                            |
| `AssetRemoved`       | `(address indexed asset, address indexed caller)`                                            |
| `FeeCollected`       | `(address indexed asset, address indexed from, uint256 amount)`                              |
| `NativeReceived`     | `(address indexed sender, uint256 amount)`                                                   |
| `NativeWithdrawn`    | `(address indexed recipient, uint256 amount, address indexed caller)`                        |
| `Paused`             | `(address account)`                                                                          |
| `RoleAdminChanged`   | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`    |
| `RoleGranted`        | `(bytes32 indexed role, address indexed account, address indexed sender)`                    |
| `RoleRevoked`        | `(bytes32 indexed role, address indexed account, address indexed sender)`                    |
| `TreasuryWithdrawal` | `(address indexed asset, address indexed recipient, uint256 amount, address indexed caller)` |
| `Unpaused`           | `(address account)`                                                                          |

### Custom Errors

| Error Name                         | Parameters                                           |
| :--------------------------------- | :--------------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                                 |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`              |
| `AssetNotSupported`                | `(bytes32 assetId)`                                  |
| `EnforcedPause`                    | `()`                                                 |
| `EntryAlreadyExists`               | `(bytes32 id)`                                       |
| `ExpectedPause`                    | `()`                                                 |
| `FailedCall`                       | `()`                                                 |
| `IdenticalAddressSubmitted`        | `()`                                                 |
| `InsufficientBalance`              | `(uint256 balance, uint256 needed)`                  |
| `InsufficientReserves`             | `(address asset, uint256 requested, uint256 actual)` |
| `MathCalculationOverflow`          | `()`                                                 |
| `ReentrancyGuardReentrantCall`     | `()`                                                 |
| `SafeERC20FailedOperation`         | `(address token)`                                    |
| `ZeroAddressDetected`              | `()`                                                 |

## UVBTCETHToken

### Functions

| Function Name        | Inputs                                                                                             | Outputs                                                                                                                        | State Mutability |
| :------------------- | :------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--------------- |
| `CONTROLLER_ROLE`    | `()`                                                                                               | `(bytes32 )`                                                                                                                   | `view`           |
| `DEFAULT_ADMIN_ROLE` | `()`                                                                                               | `(bytes32 )`                                                                                                                   | `view`           |
| `DOMAIN_SEPARATOR`   | `()`                                                                                               | `(bytes32 )`                                                                                                                   | `view`           |
| `GOVERNANCE_ROLE`    | `()`                                                                                               | `(bytes32 )`                                                                                                                   | `view`           |
| `GUARDIAN_ROLE`      | `()`                                                                                               | `(bytes32 )`                                                                                                                   | `view`           |
| `allowance`          | `(address owner, address spender)`                                                                 | `(uint256 )`                                                                                                                   | `view`           |
| `approve`            | `(address spender, uint256 value)`                                                                 | `(bool )`                                                                                                                      | `nonpayable`     |
| `balanceOf`          | `(address account)`                                                                                | `(uint256 )`                                                                                                                   | `view`           |
| `burn`               | `(address from, uint256 amount)`                                                                   | `()`                                                                                                                           | `nonpayable`     |
| `decimals`           | `()`                                                                                               | `(uint8 )`                                                                                                                     | `pure`           |
| `eip712Domain`       | `()`                                                                                               | `(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)` | `view`           |
| `getRoleAdmin`       | `(bytes32 role)`                                                                                   | `(bytes32 )`                                                                                                                   | `view`           |
| `grantRole`          | `(bytes32 role, address account)`                                                                  | `()`                                                                                                                           | `nonpayable`     |
| `hasRole`            | `(bytes32 role, address account)`                                                                  | `(bool )`                                                                                                                      | `view`           |
| `mint`               | `(address to, uint256 amount)`                                                                     | `()`                                                                                                                           | `nonpayable`     |
| `name`               | `()`                                                                                               | `(string )`                                                                                                                    | `view`           |
| `nonces`             | `(address owner)`                                                                                  | `(uint256 )`                                                                                                                   | `view`           |
| `pause`              | `()`                                                                                               | `()`                                                                                                                           | `nonpayable`     |
| `paused`             | `()`                                                                                               | `(bool )`                                                                                                                      | `view`           |
| `permit`             | `(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)` | `()`                                                                                                                           | `nonpayable`     |
| `renounceRole`       | `(bytes32 role, address callerConfirmation)`                                                       | `()`                                                                                                                           | `nonpayable`     |
| `revokeRole`         | `(bytes32 role, address account)`                                                                  | `()`                                                                                                                           | `nonpayable`     |
| `supportsInterface`  | `(bytes4 interfaceId)`                                                                             | `(bool )`                                                                                                                      | `view`           |
| `symbol`             | `()`                                                                                               | `(string )`                                                                                                                    | `view`           |
| `totalSupply`        | `()`                                                                                               | `(uint256 )`                                                                                                                   | `view`           |
| `transfer`           | `(address to, uint256 value)`                                                                      | `(bool )`                                                                                                                      | `nonpayable`     |
| `transferFrom`       | `(address from, address to, uint256 value)`                                                        | `(bool )`                                                                                                                      | `nonpayable`     |
| `unpause`            | `()`                                                                                               | `()`                                                                                                                           | `nonpayable`     |

### Events

| Event Name            | Parameters                                                                                |
| :-------------------- | :---------------------------------------------------------------------------------------- |
| `Approval`            | `(address indexed owner, address indexed spender, uint256 value)`                         |
| `EIP712DomainChanged` | `()`                                                                                      |
| `Paused`              | `(address account)`                                                                       |
| `RoleAdminChanged`    | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)` |
| `RoleGranted`         | `(bytes32 indexed role, address indexed account, address indexed sender)`                 |
| `RoleRevoked`         | `(bytes32 indexed role, address indexed account, address indexed sender)`                 |
| `Transfer`            | `(address indexed from, address indexed to, uint256 value)`                               |
| `Unpaused`            | `(address account)`                                                                       |

### Custom Errors

| Error Name                         | Parameters                                             |
| :--------------------------------- | :----------------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                                   |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`                |
| `ECDSAInvalidSignature`            | `()`                                                   |
| `ECDSAInvalidSignatureLength`      | `(uint256 length)`                                     |
| `ECDSAInvalidSignatureS`           | `(bytes32 s)`                                          |
| `ERC20InsufficientAllowance`       | `(address spender, uint256 allowance, uint256 needed)` |
| `ERC20InsufficientBalance`         | `(address sender, uint256 balance, uint256 needed)`    |
| `ERC20InvalidApprover`             | `(address approver)`                                   |
| `ERC20InvalidReceiver`             | `(address receiver)`                                   |
| `ERC20InvalidSender`               | `(address sender)`                                     |
| `ERC20InvalidSpender`              | `(address spender)`                                    |
| `ERC2612ExpiredSignature`          | `(uint256 deadline)`                                   |
| `ERC2612InvalidSigner`             | `(address signer, address owner)`                      |
| `EnforcedPause`                    | `()`                                                   |
| `ExpectedPause`                    | `()`                                                   |
| `InvalidAccountNonce`              | `(address account, uint256 currentNonce)`              |
| `InvalidAmount`                    | `()`                                                   |
| `InvalidShortString`               | `()`                                                   |
| `StringTooLong`                    | `(string str)`                                         |
| `ZeroAddressDetected`              | `()`                                                   |

## UnifyVaultController

### Functions

| Function Name             | Inputs                                                                                      | Outputs               | State Mutability |
| :------------------------ | :------------------------------------------------------------------------------------------ | :-------------------- | :--------------- |
| `BOT_ROLE`                | `()`                                                                                        | `(bytes32 )`          | `view`           |
| `BPS_DENOMINATOR`         | `()`                                                                                        | `(uint256 )`          | `view`           |
| `DEAD_SHARES`             | `()`                                                                                        | `(uint256 )`          | `view`           |
| `DEFAULT_ADMIN_ROLE`      | `()`                                                                                        | `(bytes32 )`          | `view`           |
| `GUARDIAN_ROLE`           | `()`                                                                                        | `(bytes32 )`          | `view`           |
| `collectProtocolFee`      | `(address , uint256 )`                                                                      | `()`                  | `pure`           |
| `dailyDepositCap`         | `()`                                                                                        | `(uint256 )`          | `view`           |
| `dailyDepositTotal`       | `()`                                                                                        | `(uint256 )`          | `view`           |
| `dailyRedeemCap`          | `()`                                                                                        | `(uint256 )`          | `view`           |
| `dailyRedeemTotal`        | `()`                                                                                        | `(uint256 )`          | `view`           |
| `deposit`                 | `(address asset, uint256 amount, uint256 minSharesOut, address receiver)`                   | `(tuple )`            | `nonpayable`     |
| `directory`               | `()`                                                                                        | `(address )`          | `view`           |
| `emergencyPause`          | `()`                                                                                        | `()`                  | `nonpayable`     |
| `estimateMint`            | `(address asset, uint256 amount)`                                                           | `(uint256 )`          | `view`           |
| `estimateRedemption`      | `(address asset, uint256 shares)`                                                           | `(uint256 )`          | `view`           |
| `feeManager`              | `()`                                                                                        | `(address )`          | `view`           |
| `getDepositFeeBps`        | `()`                                                                                        | `(uint256 )`          | `view`           |
| `getDepositQuote`         | `(address asset, uint256 amount, uint256 minSharesOut, address receiver)`                   | `(tuple )`            | `view`           |
| `getRedeemFeeBps`         | `()`                                                                                        | `(uint256 )`          | `view`           |
| `getRoleAdmin`            | `(bytes32 role)`                                                                            | `(bytes32 )`          | `view`           |
| `grantRole`               | `(bytes32 role, address account)`                                                           | `()`                  | `nonpayable`     |
| `hasRole`                 | `(bytes32 role, address account)`                                                           | `(bool )`             | `view`           |
| `largeDepositThreshold`   | `()`                                                                                        | `(uint256 )`          | `view`           |
| `largeRedeemThreshold`    | `()`                                                                                        | `(uint256 )`          | `view`           |
| `maxDeposit`              | `()`                                                                                        | `(uint256 )`          | `view`           |
| `maxDepositPerTx`         | `()`                                                                                        | `(uint256 )`          | `view`           |
| `maxRedeemPerTx`          | `()`                                                                                        | `(uint256 )`          | `view`           |
| `oracle`                  | `()`                                                                                        | `(address )`          | `view`           |
| `paused`                  | `()`                                                                                        | `(bool )`             | `view`           |
| `portfolioManager`        | `()`                                                                                        | `(address )`          | `view`           |
| `previewDeposit`          | `(address asset, uint256 amount)`                                                           | `(uint256 )`          | `view`           |
| `previewRedeem`           | `(address asset, uint256 shares)`                                                           | `(uint256 )`          | `view`           |
| `rebalance`               | `()`                                                                                        | `()`                  | `pure`           |
| `redeem`                  | `(address asset, uint256 shares, uint256 minAssetsOut, address receiver, uint256 deadline)` | `(uint256 netAssets)` | `nonpayable`     |
| `renounceRole`            | `(bytes32 role, address callerConfirmation)`                                                | `()`                  | `nonpayable`     |
| `resume`                  | `()`                                                                                        | `()`                  | `nonpayable`     |
| `revokeRole`              | `(bytes32 role, address account)`                                                           | `()`                  | `nonpayable`     |
| `setDepositLimits`        | `(uint256 maxPerTx, uint256 dailyCap)`                                                      | `()`                  | `nonpayable`     |
| `setMaxDeposit`           | `(uint256 maxDeposit_)`                                                                     | `()`                  | `nonpayable`     |
| `setMonitoringThresholds` | `(uint256 largeDepositThreshold_, uint256 largeRedeemThreshold_)`                           | `()`                  | `nonpayable`     |
| `setRedeemLimits`         | `(uint256 maxPerTx, uint256 dailyCap)`                                                      | `()`                  | `nonpayable`     |
| `setSwapSlippageBps`      | `(uint256 slippageBps_)`                                                                    | `()`                  | `nonpayable`     |
| `strategyManager`         | `()`                                                                                        | `(address )`          | `view`           |
| `supportsInterface`       | `(bytes4 interfaceId)`                                                                      | `(bool )`             | `view`           |
| `swapAdapter`             | `()`                                                                                        | `(address )`          | `view`           |
| `swapSlippageBps`         | `()`                                                                                        | `(uint256 )`          | `view`           |
| `token`                   | `()`                                                                                        | `(address )`          | `view`           |
| `treasury`                | `()`                                                                                        | `(address )`          | `view`           |
| `vault`                   | `()`                                                                                        | `(address )`          | `view`           |

### Events

| Event Name                    | Parameters                                                                                                                                                    |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DepositCollateralReceived`   | `(address indexed asset, address indexed user, address indexed receiver, uint256 requestedAmount, uint256 receivedAmount, uint256 timestamp)`                 |
| `DepositCompleted`            | `(address indexed receiver, address indexed asset, uint256 grossDeposit, uint256 protocolFee, uint256 netDeposit, uint256 sharesMinted)`                      |
| `DepositExecuted`             | `(address indexed user, uint256 depositAmount, uint256 fee, address[] targetAssets, uint256[] assetsBought, uint256 sharesMinted, uint256 navAfter)`          |
| `DepositLimitsUpdated`        | `(uint256 maxPerTx, uint256 dailyCap, address indexed caller)`                                                                                                |
| `DepositRequested`            | `(address indexed asset, address indexed receiver, uint256 amount, uint256 minSharesOut)`                                                                     |
| `EmergencyPause`              | `(address indexed actor, string reason)`                                                                                                                      |
| `EmergencyPaused`             | `(address indexed caller)`                                                                                                                                    |
| `EmergencyResume`             | `(address indexed actor)`                                                                                                                                     |
| `EmergencyResumed`            | `(address indexed caller)`                                                                                                                                    |
| `FeeCollected`                | `(address indexed asset, uint256 amount)`                                                                                                                     |
| `LargeDeposit`                | `(address indexed user, address indexed asset, uint256 amount, uint256 shares)`                                                                               |
| `LargeRedeem`                 | `(address indexed user, address indexed asset, uint256 shares, uint256 amount)`                                                                               |
| `MaxDepositUpdated`           | `(uint256 oldMax, uint256 newMax, address indexed caller)`                                                                                                    |
| `MonitoringThresholdsUpdated` | `(uint256 largeDepositThreshold, uint256 largeRedeemThreshold, address indexed caller)`                                                                       |
| `Paused`                      | `(address account)`                                                                                                                                           |
| `ProtocolFeeCollected`        | `(address indexed payer, address indexed asset, uint256 feeAmount)`                                                                                           |
| `RedeemCompleted`             | `(address indexed owner, address indexed receiver, address indexed asset, uint256 sharesBurned, uint256 grossAssets, uint256 protocolFee, uint256 netAssets)` |
| `RedeemExecuted`              | `(address indexed user, uint256 sharesBurned, address[] targetAssets, uint256[] assetsSold, uint256 fee, uint256 usdcReturned, uint256 navAfter)`             |
| `RedeemLimitsUpdated`         | `(uint256 maxPerTx, uint256 dailyCap, address indexed caller)`                                                                                                |
| `RedeemRequested`             | `(address indexed receiver, uint256 shares, uint256 minCollateralOut)`                                                                                        |
| `RoleAdminChanged`            | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`                                                                     |
| `RoleGranted`                 | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                                                     |
| `RoleRevoked`                 | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                                                     |
| `SwapSlippageUpdated`         | `(uint256 oldBps, uint256 newBps, address indexed caller)`                                                                                                    |
| `Unpaused`                    | `(address account)`                                                                                                                                           |

### Custom Errors

| Error Name                         | Parameters                                           |
| :--------------------------------- | :--------------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                                 |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`              |
| `AssetNotSupported`                | `(bytes32 assetId)`                                  |
| `DailyDepositCapExceeded`          | `(uint256 newTotal, uint256 cap)`                    |
| `DailyRedeemCapExceeded`           | `(uint256 newTotal, uint256 cap)`                    |
| `DeadlineExpired`                  | `(uint256 deadline, uint256 timestamp)`              |
| `DepositExceedsTxLimit`            | `(uint256 amount, uint256 limit)`                    |
| `EnforcedPause`                    | `()`                                                 |
| `ExpectedPause`                    | `()`                                                 |
| `FeeManagerNotAvailable`           | `()`                                                 |
| `InsufficientReserves`             | `(address asset, uint256 requested, uint256 actual)` |
| `MathCalculationOverflow`          | `()`                                                 |
| `NotAContract`                     | `(address target)`                                   |
| `NotImplemented`                   | `()`                                                 |
| `OraclePriceNegative`              | `(address asset, int256 price)`                      |
| `OraclePriceStale`                 | `(address asset, uint256 priceAge, uint256 limit)`   |
| `RedeemExceedsTxLimit`             | `(uint256 shares, uint256 limit)`                    |
| `ReentrancyGuardReentrantCall`     | `()`                                                 |
| `SafeERC20FailedOperation`         | `(address token)`                                    |
| `SlippageLimitExceeded`            | `(uint256 expected, uint256 actual)`                 |
| `ZeroAddressDetected`              | `()`                                                 |

## UnifyVaultTimelock

### Functions

| Function Name            | Inputs                                                                                                      | Outputs      | State Mutability |
| :----------------------- | :---------------------------------------------------------------------------------------------------------- | :----------- | :--------------- |
| `CANCELLER_ROLE`         | `()`                                                                                                        | `(bytes32 )` | `view`           |
| `DEFAULT_ADMIN_ROLE`     | `()`                                                                                                        | `(bytes32 )` | `view`           |
| `EXECUTOR_ROLE`          | `()`                                                                                                        | `(bytes32 )` | `view`           |
| `PROPOSER_ROLE`          | `()`                                                                                                        | `(bytes32 )` | `view`           |
| `TIMELOCK_DELAY`         | `()`                                                                                                        | `(uint256 )` | `view`           |
| `cancel`                 | `(bytes32 id)`                                                                                              | `()`         | `nonpayable`     |
| `execute`                | `(address target, uint256 value, bytes payload, bytes32 predecessor, bytes32 salt)`                         | `()`         | `payable`        |
| `executeBatch`           | `(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt)`                | `()`         | `payable`        |
| `getMinDelay`            | `()`                                                                                                        | `(uint256 )` | `view`           |
| `getOperationState`      | `(bytes32 id)`                                                                                              | `(uint8 )`   | `view`           |
| `getRoleAdmin`           | `(bytes32 role)`                                                                                            | `(bytes32 )` | `view`           |
| `getTimestamp`           | `(bytes32 id)`                                                                                              | `(uint256 )` | `view`           |
| `grantRole`              | `(bytes32 role, address account)`                                                                           | `()`         | `nonpayable`     |
| `hasRole`                | `(bytes32 role, address account)`                                                                           | `(bool )`    | `view`           |
| `hashOperation`          | `(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt)`                            | `(bytes32 )` | `pure`           |
| `hashOperationBatch`     | `(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt)`                | `(bytes32 )` | `pure`           |
| `isOperation`            | `(bytes32 id)`                                                                                              | `(bool )`    | `view`           |
| `isOperationDone`        | `(bytes32 id)`                                                                                              | `(bool )`    | `view`           |
| `isOperationPending`     | `(bytes32 id)`                                                                                              | `(bool )`    | `view`           |
| `isOperationReady`       | `(bytes32 id)`                                                                                              | `(bool )`    | `view`           |
| `onERC1155BatchReceived` | `(address , address , uint256[] , uint256[] , bytes )`                                                      | `(bytes4 )`  | `nonpayable`     |
| `onERC1155Received`      | `(address , address , uint256 , uint256 , bytes )`                                                          | `(bytes4 )`  | `nonpayable`     |
| `onERC721Received`       | `(address , address , uint256 , bytes )`                                                                    | `(bytes4 )`  | `nonpayable`     |
| `renounceRole`           | `(bytes32 role, address callerConfirmation)`                                                                | `()`         | `nonpayable`     |
| `revokeRole`             | `(bytes32 role, address account)`                                                                           | `()`         | `nonpayable`     |
| `schedule`               | `(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt, uint256 delay)`             | `()`         | `nonpayable`     |
| `scheduleBatch`          | `(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt, uint256 delay)` | `()`         | `nonpayable`     |
| `supportsInterface`      | `(bytes4 interfaceId)`                                                                                      | `(bool )`    | `view`           |
| `updateDelay`            | `(uint256 newDelay)`                                                                                        | `()`         | `nonpayable`     |

### Events

| Event Name         | Parameters                                                                                                                   |
| :----------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `CallExecuted`     | `(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)`                                     |
| `CallSalt`         | `(bytes32 indexed id, bytes32 salt)`                                                                                         |
| `CallScheduled`    | `(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)` |
| `Cancelled`        | `(bytes32 indexed id)`                                                                                                       |
| `MinDelayChange`   | `(uint256 oldDuration, uint256 newDuration)`                                                                                 |
| `RoleAdminChanged` | `(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)`                                    |
| `RoleGranted`      | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                    |
| `RoleRevoked`      | `(bytes32 indexed role, address indexed account, address indexed sender)`                                                    |
| `TimelockExecuted` | `(bytes32 indexed id, address indexed target, uint256 value, bytes data)`                                                    |
| `TimelockQueued`   | `(bytes32 indexed id, address indexed target, uint256 value, bytes data, uint256 eta)`                                       |

### Custom Errors

| Error Name                         | Parameters                                            |
| :--------------------------------- | :---------------------------------------------------- |
| `AccessControlBadConfirmation`     | `()`                                                  |
| `AccessControlUnauthorizedAccount` | `(address account, bytes32 neededRole)`               |
| `FailedCall`                       | `()`                                                  |
| `TimelockInsufficientDelay`        | `(uint256 delay, uint256 minDelay)`                   |
| `TimelockInvalidOperationLength`   | `(uint256 targets, uint256 payloads, uint256 values)` |
| `TimelockUnauthorizedCaller`       | `(address caller)`                                    |
| `TimelockUnexecutedPredecessor`    | `(bytes32 predecessorId)`                             |
| `TimelockUnexpectedOperationState` | `(bytes32 operationId, bytes32 expectedStates)`       |
