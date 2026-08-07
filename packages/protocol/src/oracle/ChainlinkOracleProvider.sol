// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracleProvider.sol';
import '../interfaces/AggregatorV3Interface.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title ChainlinkOracleProvider
 * @notice Production-grade oracle adapter translating Chainlink AggregatorV3 feeds into the protocol's abstraction
 */
contract ChainlinkOracleProvider is AccessControl, IOracleProvider {
  struct FeedConfig {
    address feedAddress;
    uint32 heartbeat;
    bool enabled;
  }

  bytes32 public constant PROVIDER_ID = keccak256('CHAINLINK_ORACLE_PROVIDER');

  mapping(bytes32 => FeedConfig) private _feeds;

  // Events matching requested format: assetId, previous/old value, new value, caller
  event FeedRegistered(
    bytes32 indexed assetId,
    address indexed feedAddress,
    uint32 heartbeat,
    address indexed caller
  );
  event FeedUpdated(
    bytes32 indexed assetId,
    address oldFeedAddress,
    address newFeedAddress,
    uint32 oldHeartbeat,
    uint32 newHeartbeat,
    address indexed caller
  );
  event FeedRemoved(
    bytes32 indexed assetId,
    address indexed oldFeedAddress,
    address indexed caller
  );
  event HeartbeatUpdated(
    bytes32 indexed assetId,
    uint32 oldHeartbeat,
    uint32 newHeartbeat,
    address indexed caller
  );
  event FeedEnabledSet(
    bytes32 indexed assetId,
    bool oldStatus,
    bool newStatus,
    address indexed caller
  );

  // Local custom errors
  error IncompleteRound(bytes32 assetId);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
  }

  // --- IOracleProvider Implementation ---

  /**
   * @notice Returns the latest raw price for the given asset (no 18-decimal normalization)
   * @param assetId The bytes32 identifier of the asset
   * @return price The raw price value from the Chainlink feed
   */
  function getLatestPrice(bytes32 assetId) external view override returns (uint256 price) {
    ProviderPrice memory round = getLatestRound(assetId);
    return round.price;
  }

  /**
   * @notice Returns the latest complete round data and metadata in a standardized structure
   * @dev Does not normalize price decimals to 18 (returns raw values)
   * @param assetId The bytes32 identifier of the asset
   * @return round The complete ProviderPrice struct containing raw price and metadata
   */
  function getLatestRound(
    bytes32 assetId
  ) public view override returns (ProviderPrice memory round) {
    FeedConfig memory config = _feeds[assetId];
    if (config.feedAddress == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (!config.enabled) {
      revert Errors.AssetNotSupported(assetId); // behaves as unsupported if disabled
    }

    AggregatorV3Interface aggregator = AggregatorV3Interface(config.feedAddress);

    (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = aggregator
      .latestRoundData();

    // 1. Validation: price must be strictly positive
    if (answer <= 0) {
      revert Errors.OracleProviderPriceNegative(assetId, answer);
    }

    // 2. Validation: incomplete rounds check
    if (answeredInRound < roundId) {
      revert IncompleteRound(assetId);
    }

    // 3. Validation: stale check
    if (updatedAt == 0 || block.timestamp - updatedAt > config.heartbeat) {
      revert Errors.OracleProviderPriceStale(
        assetId,
        block.timestamp - updatedAt,
        config.heartbeat
      );
    }

    uint8 feedDecimals = aggregator.decimals();

    return
      ProviderPrice({
        price: uint256(answer),
        decimals: feedDecimals,
        updatedAt: updatedAt,
        roundId: roundId,
        providerId: PROVIDER_ID
      });
  }

  /**
   * @notice Returns the decimal precision of the raw price values returned by this provider
   * @param assetId The bytes32 identifier of the asset
   * @return decimals The number of decimal places of the provider's raw price feed
   */
  function getDecimals(bytes32 assetId) external view override returns (uint8 decimals) {
    FeedConfig memory config = _feeds[assetId];
    if (config.feedAddress == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }
    return AggregatorV3Interface(config.feedAddress).decimals();
  }

  /**
   * @notice Returns the timestamp of the last on-chain update for the given asset
   * @param assetId The bytes32 identifier of the asset
   * @return updatedAt The unix timestamp of the last update
   */
  function getUpdatedAt(bytes32 assetId) external view override returns (uint256 updatedAt) {
    FeedConfig memory config = _feeds[assetId];
    if (config.feedAddress == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }
    (, , , uint256 updateTime, ) = AggregatorV3Interface(config.feedAddress).latestRoundData();
    return updateTime;
  }

  /**
   * @notice Checks if the pricing feed for a given asset is currently active, fresh, and valid
   * @dev Catches internal reverts to safely return false if the feed fails validation
   * @param assetId The bytes32 identifier of the asset
   * @return healthy True if the feed is online, price is positive, and within safety parameters
   */
  function isHealthy(bytes32 assetId) external view override returns (bool healthy) {
    FeedConfig memory config = _feeds[assetId];
    if (config.feedAddress == address(0) || !config.enabled) {
      return false;
    }

    try AggregatorV3Interface(config.feedAddress).latestRoundData() returns (
      uint80 roundId,
      int256 answer,
      uint256,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
      if (answer <= 0) return false;
      if (answeredInRound < roundId) return false;
      if (updatedAt == 0 || block.timestamp - updatedAt > config.heartbeat) return false;
      return true;
    } catch {
      return false;
    }
  }

  // --- Governance Actions ---

  /**
   * @notice Registers a new Chainlink feed for an asset identifier
   * @param assetId The bytes32 identifier of the asset
   * @param feedAddress The address of the Chainlink aggregator contract
   * @param heartbeat The allowed heartbeat timeout interval (in seconds)
   */
  function registerFeed(
    bytes32 assetId,
    address feedAddress,
    uint32 heartbeat
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (feedAddress == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (heartbeat == 0) {
      revert Errors.HeartbeatIntervalOutofBounds();
    }
    if (_feeds[assetId].feedAddress != address(0)) {
      revert Errors.EntryAlreadyExists(assetId);
    }

    _feeds[assetId] = FeedConfig({ feedAddress: feedAddress, heartbeat: heartbeat, enabled: true });

    emit FeedRegistered(assetId, feedAddress, heartbeat, msg.sender);
  }

  /**
   * @notice Updates an existing feed configuration
   * @param assetId The bytes32 identifier of the asset
   * @param newFeedAddress The new aggregator address
   * @param newHeartbeat The new heartbeat timeout limit
   */
  function updateFeed(
    bytes32 assetId,
    address newFeedAddress,
    uint32 newHeartbeat
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig storage config = _feeds[assetId];
    address oldFeed = config.feedAddress;
    if (oldFeed == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (newFeedAddress == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (newHeartbeat == 0) {
      revert Errors.HeartbeatIntervalOutofBounds();
    }

    uint32 oldHeartbeat = config.heartbeat;
    config.feedAddress = newFeedAddress;
    config.heartbeat = newHeartbeat;

    emit FeedUpdated(assetId, oldFeed, newFeedAddress, oldHeartbeat, newHeartbeat, msg.sender);
  }

  /**
   * @notice Removes a registered feed configuration
   * @param assetId The bytes32 identifier of the asset to remove
   */
  function removeFeed(bytes32 assetId) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig memory config = _feeds[assetId];
    if (config.feedAddress == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }

    delete _feeds[assetId];
    emit FeedRemoved(assetId, config.feedAddress, msg.sender);
  }

  /**
   * @notice Updates only the heartbeat setting of a registered feed
   * @param assetId The bytes32 identifier of the asset
   * @param newHeartbeat The new heartbeat threshold
   */
  function updateHeartbeat(
    bytes32 assetId,
    uint32 newHeartbeat
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig storage config = _feeds[assetId];
    if (config.feedAddress == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }
    if (newHeartbeat == 0) {
      revert Errors.HeartbeatIntervalOutofBounds();
    }

    uint32 oldHeartbeat = config.heartbeat;
    config.heartbeat = newHeartbeat;

    emit HeartbeatUpdated(assetId, oldHeartbeat, newHeartbeat, msg.sender);
  }

  /**
   * @notice Enables or disables an existing feed mapping
   * @param assetId The bytes32 identifier of the asset
   * @param enabled The new enablement status
   */
  function setFeedEnabled(
    bytes32 assetId,
    bool enabled
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig storage config = _feeds[assetId];
    if (config.feedAddress == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }
    bool oldEnabled = config.enabled;
    config.enabled = enabled;

    emit FeedEnabledSet(assetId, oldEnabled, enabled, msg.sender);
  }

  /**
   * @notice Returns the configuration of a registered feed (helper/telemetry view)
   * @param assetId The bytes32 identifier of the asset
   * @return config The full FeedConfig structure details
   */
  function getFeedConfig(bytes32 assetId) external view returns (FeedConfig memory config) {
    return _feeds[assetId];
  }
}
