// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracleProvider.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title MockOracleProvider
 * @notice Production-quality mock oracle provider for simulating price feeds under all conditions
 * @dev Inherits AccessControl to allow Governance or Test Operators to configure mock states
 */
contract MockOracleProvider is AccessControl, IOracleProvider {
  bytes32 public constant TEST_OPERATOR_ROLE = keccak256('TEST_OPERATOR_ROLE');
  bytes32 public constant PROVIDER_ID = keccak256('MOCK_ORACLE_PROVIDER');

  struct MockFeed {
    ProviderPrice priceData;
    bool isRegistered;
    bool isHealthy;
    bool isOffline;
  }

  mapping(bytes32 => MockFeed) private _feeds;

  // Events matching requested format: assetId, old value, new value, caller
  event PriceSet(
    bytes32 indexed assetId,
    uint256 oldPrice,
    uint256 newPrice,
    address indexed caller
  );
  event TimestampSet(
    bytes32 indexed assetId,
    uint256 oldTimestamp,
    uint256 newTimestamp,
    address indexed caller
  );
  event RoundIdSet(
    bytes32 indexed assetId,
    uint256 oldRoundId,
    uint256 newRoundId,
    address indexed caller
  );
  event HealthSet(bytes32 indexed assetId, bool oldHealth, bool newHealth, address indexed caller);
  event DecimalsSet(
    bytes32 indexed assetId,
    uint8 oldDecimals,
    uint8 newDecimals,
    address indexed caller
  );
  event OfflineStatusSet(
    bytes32 indexed assetId,
    bool oldStatus,
    bool newStatus,
    address indexed caller
  );
  event AssetRegistered(
    bytes32 indexed assetId,
    uint256 price,
    uint8 decimals,
    uint256 updatedAt,
    uint256 roundId,
    address indexed caller
  );
  event AssetRemoved(bytes32 indexed assetId, address indexed caller);

  modifier onlyAuthorized() {
    if (
      !hasRole(AccessRoles.GOVERNANCE_ROLE, msg.sender) && !hasRole(TEST_OPERATOR_ROLE, msg.sender)
    ) {
      revert AccessControlUnauthorizedAccount(msg.sender, TEST_OPERATOR_ROLE);
    }
    _;
  }

  constructor() {
    _grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
    _grantRole(TEST_OPERATOR_ROLE, msg.sender);
  }

  // --- IOracleProvider Implementation ---

  /**
   * @notice Returns the latest raw price for the given asset (no 18-decimal normalization)
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported by the provider
   * @dev Reverts with `Errors.OracleProviderPriceNegative` if the retrieved price is negative or zero
   * @param assetId The bytes32 identifier of the asset (e.g. hash of symbol or Pyth Price ID)
   * @return price The raw asset price
   */
  function getLatestPrice(bytes32 assetId) external view override returns (uint256 price) {
    MockFeed memory feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (feed.isOffline) {
      revert Errors.EntryDoesNotExist(assetId); // simulate offline reversion
    }

    int256 signedPrice = int256(feed.priceData.price);
    if (signedPrice <= 0) {
      revert Errors.OracleProviderPriceNegative(assetId, signedPrice);
    }

    return feed.priceData.price;
  }

  /**
   * @notice Returns the latest complete round data and metadata in a standardized structure
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported
   * @param assetId The bytes32 identifier of the asset
   * @return round The complete ProviderPrice struct containing raw price and metadata
   */
  function getLatestRound(
    bytes32 assetId
  ) external view override returns (ProviderPrice memory round) {
    MockFeed memory feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (feed.isOffline) {
      revert Errors.EntryDoesNotExist(assetId);
    }
    return feed.priceData;
  }

  /**
   * @notice Returns the decimal precision of the raw price values returned by this provider
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported
   * @param assetId The bytes32 identifier of the asset
   * @return decimals The number of decimal places of the provider's raw price feed
   */
  function getDecimals(bytes32 assetId) external view override returns (uint8 decimals) {
    MockFeed memory feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (feed.isOffline) {
      revert Errors.EntryDoesNotExist(assetId);
    }
    return feed.priceData.decimals;
  }

  /**
   * @notice Returns the timestamp of the last on-chain update for the given asset
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported
   * @param assetId The bytes32 identifier of the asset
   * @return updatedAt The unix timestamp of the last update
   */
  function getUpdatedAt(bytes32 assetId) external view override returns (uint256 updatedAt) {
    MockFeed memory feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (feed.isOffline) {
      revert Errors.EntryDoesNotExist(assetId);
    }
    return feed.priceData.updatedAt;
  }

  /**
   * @notice Checks if the pricing feed for a given asset is currently active, fresh, and valid
   * @dev Will return false instead of reverting if the asset is not supported or the feed is stale/invalid
   * @param assetId The bytes32 identifier of the asset
   * @return healthy True if the feed is online, price is positive, and within safety parameters
   */
  function isHealthy(bytes32 assetId) external view override returns (bool healthy) {
    MockFeed memory feed = _feeds[assetId];
    if (!feed.isRegistered || feed.isOffline) {
      return false;
    }
    // Negative/zero price is unhealthy
    if (int256(feed.priceData.price) <= 0) {
      return false;
    }
    // Stale timestamp (older than 1 hour / 3600 seconds) is unhealthy
    if (block.timestamp > feed.priceData.updatedAt) {
      if (block.timestamp - feed.priceData.updatedAt > 3600) {
        return false;
      }
    }
    return feed.isHealthy;
  }

  // --- Governance/Operator Configuration Endpoints ---

  /**
   * @notice Registers a new asset and sets its initial pricing parameters
   * @param assetId The bytes32 identifier of the asset
   * @param price The initial price value
   * @param decimals The decimal precision of the price value
   * @param updatedAt The initial timestamp of the price update
   * @param roundId The initial round ID of the price update
   */
  function registerAsset(
    bytes32 assetId,
    uint256 price,
    uint8 decimals,
    uint256 updatedAt,
    uint256 roundId
  ) external onlyAuthorized {
    if (_feeds[assetId].isRegistered) {
      revert Errors.EntryAlreadyExists(assetId);
    }

    _feeds[assetId] = MockFeed({
      priceData: ProviderPrice({
        price: price,
        decimals: decimals,
        updatedAt: updatedAt,
        roundId: roundId,
        providerId: PROVIDER_ID
      }),
      isRegistered: true,
      isHealthy: true,
      isOffline: false
    });

    emit AssetRegistered(assetId, price, decimals, updatedAt, roundId, msg.sender);
  }

  /**
   * @notice Removes a registered asset from the mock oracle
   * @param assetId The bytes32 identifier of the asset
   */
  function removeAsset(bytes32 assetId) external onlyAuthorized {
    if (!_feeds[assetId].isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }

    delete _feeds[assetId];
    emit AssetRemoved(assetId, msg.sender);
  }

  /**
   * @notice Sets the price for a registered asset
   * @param assetId The bytes32 identifier of the asset
   * @param price The new price value
   */
  function setPrice(bytes32 assetId, uint256 price) external onlyAuthorized {
    MockFeed storage feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    uint256 oldPrice = feed.priceData.price;
    feed.priceData.price = price;

    emit PriceSet(assetId, oldPrice, price, msg.sender);
  }

  /**
   * @notice Sets the timestamp for a registered asset
   * @param assetId The bytes32 identifier of the asset
   * @param timestamp The new timestamp value
   */
  function setTimestamp(bytes32 assetId, uint256 timestamp) external onlyAuthorized {
    MockFeed storage feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    uint256 oldTimestamp = feed.priceData.updatedAt;
    feed.priceData.updatedAt = timestamp;

    emit TimestampSet(assetId, oldTimestamp, timestamp, msg.sender);
  }

  /**
   * @notice Sets the round ID for a registered asset
   * @param assetId The bytes32 identifier of the asset
   * @param roundId The new round ID value
   */
  function setRoundId(bytes32 assetId, uint256 roundId) external onlyAuthorized {
    MockFeed storage feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    uint256 oldRoundId = feed.priceData.roundId;
    feed.priceData.roundId = roundId;

    emit RoundIdSet(assetId, oldRoundId, roundId, msg.sender);
  }

  /**
   * @notice Sets the health status for a registered asset
   * @param assetId The bytes32 identifier of the asset
   * @param healthy The new health status
   */
  function setHealth(bytes32 assetId, bool healthy) external onlyAuthorized {
    MockFeed storage feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    bool oldHealth = feed.isHealthy;
    feed.isHealthy = healthy;

    emit HealthSet(assetId, oldHealth, healthy, msg.sender);
  }

  /**
   * @notice Sets the decimals configuration for a registered asset
   * @param assetId The bytes32 identifier of the asset
   * @param decimals The new decimals value
   */
  function setDecimals(bytes32 assetId, uint8 decimals) external onlyAuthorized {
    MockFeed storage feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    uint8 oldDecimals = feed.priceData.decimals;
    feed.priceData.decimals = decimals;

    emit DecimalsSet(assetId, oldDecimals, decimals, msg.sender);
  }

  /**
   * @notice Sets the offline simulation status for a registered asset
   * @param assetId The bytes32 identifier of the asset
   * @param offline The new offline status
   */
  function setOffline(bytes32 assetId, bool offline) external onlyAuthorized {
    MockFeed storage feed = _feeds[assetId];
    if (!feed.isRegistered) {
      revert Errors.AssetNotSupported(assetId);
    }
    bool oldOffline = feed.isOffline;
    feed.isOffline = offline;

    emit OfflineStatusSet(assetId, oldOffline, offline, msg.sender);
  }

  /**
   * @notice Returns the full MockFeed configuration details for an asset (helper for assertions)
   * @param assetId The bytes32 identifier of the asset
   * @return feed The full MockFeed structure
   */
  function getMockFeed(bytes32 assetId) external view returns (MockFeed memory feed) {
    return _feeds[assetId];
  }
}
