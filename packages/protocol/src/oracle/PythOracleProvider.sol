// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracleProvider.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

interface IPyth {
  struct Price {
    int64 price;
    uint64 conf;
    int32 expo;
    uint256 publishTime;
  }

  function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
}

/**
 * @title PythOracleProvider
 * @notice Production-grade oracle adapter translating Pyth Network price feeds
 * into the protocol's IOracleProvider interface
 */
contract PythOracleProvider is AccessControl, IOracleProvider {
  struct FeedConfig {
    bytes32 priceId;
    address pythContract;
    uint32 heartbeat;
    bool enabled;
  }

  bytes32 public constant PROVIDER_ID = keccak256('PYTH_ORACLE_PROVIDER');

  mapping(bytes32 => FeedConfig) private _feeds;

  event FeedRegistered(
    bytes32 indexed assetId,
    bytes32 priceId,
    address indexed pythContract,
    uint32 heartbeat,
    address indexed caller
  );
  event FeedUpdated(
    bytes32 indexed assetId,
    bytes32 oldPriceId,
    bytes32 newPriceId,
    uint32 oldHeartbeat,
    uint32 newHeartbeat,
    address indexed caller
  );
  event FeedRemoved(bytes32 indexed assetId, bytes32 indexed priceId, address indexed caller);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
  }

  // --- IOracleProvider Implementation ---

  function getLatestPrice(bytes32 assetId) external view override returns (uint256 price) {
    ProviderPrice memory round = getLatestRound(assetId);
    return round.price;
  }

  function getLatestRound(
    bytes32 assetId
  ) public view override returns (ProviderPrice memory round) {
    FeedConfig memory config = _feeds[assetId];
    if (config.pythContract == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }

    IPyth pyth = IPyth(config.pythContract);
    IPyth.Price memory pythPrice = pyth.getPriceUnsafe(config.priceId);

    if (pythPrice.price <= 0) {
      revert Errors.OracleProviderPriceNegative(assetId, pythPrice.price);
    }

    if (pythPrice.publishTime == 0 || block.timestamp - pythPrice.publishTime > config.heartbeat) {
      revert Errors.OracleProviderPriceStale(
        assetId,
        block.timestamp - pythPrice.publishTime,
        config.heartbeat
      );
    }

    uint8 decimals = 8;
    if (pythPrice.expo < 0) {
      decimals = uint8(uint32(-pythPrice.expo));
    }

    return
      ProviderPrice({
        price: uint256(uint64(pythPrice.price)),
        decimals: decimals,
        updatedAt: pythPrice.publishTime,
        roundId: uint80(pythPrice.publishTime),
        providerId: PROVIDER_ID
      });
  }

  function getDecimals(bytes32 assetId) external view override returns (uint8 decimals) {
    ProviderPrice memory round = getLatestRound(assetId);
    return round.decimals;
  }

  function getUpdatedAt(bytes32 assetId) external view override returns (uint256 updatedAt) {
    FeedConfig memory config = _feeds[assetId];
    if (config.pythContract == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }
    IPyth pyth = IPyth(config.pythContract);
    IPyth.Price memory pythPrice = pyth.getPriceUnsafe(config.priceId);
    return pythPrice.publishTime;
  }

  function isHealthy(bytes32 assetId) external view override returns (bool healthy) {
    FeedConfig memory config = _feeds[assetId];
    if (config.pythContract == address(0) || !config.enabled) {
      return false;
    }

    try IPyth(config.pythContract).getPriceUnsafe(config.priceId) returns (
      IPyth.Price memory pythPrice
    ) {
      if (pythPrice.price <= 0) return false;
      if (pythPrice.publishTime == 0 || block.timestamp - pythPrice.publishTime > config.heartbeat)
        return false;
      return true;
    } catch {
      return false;
    }
  }

  // --- Governance Actions ---

  function registerFeed(
    bytes32 assetId,
    bytes32 priceId,
    address pythContract,
    uint32 heartbeat
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (pythContract == address(0)) revert Errors.ZeroAddressDetected();
    if (heartbeat == 0) revert Errors.HeartbeatIntervalOutofBounds();
    if (_feeds[assetId].pythContract != address(0)) revert Errors.EntryAlreadyExists(assetId);

    _feeds[assetId] = FeedConfig({
      priceId: priceId,
      pythContract: pythContract,
      heartbeat: heartbeat,
      enabled: true
    });

    emit FeedRegistered(assetId, priceId, pythContract, heartbeat, msg.sender);
  }

  function updateFeed(
    bytes32 assetId,
    bytes32 newPriceId,
    uint32 newHeartbeat
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig storage config = _feeds[assetId];
    bytes32 oldPriceId = config.priceId;
    if (config.pythContract == address(0)) revert Errors.AssetNotSupported(assetId);
    if (newHeartbeat == 0) revert Errors.HeartbeatIntervalOutofBounds();

    uint32 oldHeartbeat = config.heartbeat;
    config.priceId = newPriceId;
    config.heartbeat = newHeartbeat;

    emit FeedUpdated(assetId, oldPriceId, newPriceId, oldHeartbeat, newHeartbeat, msg.sender);
  }

  function removeFeed(bytes32 assetId) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig memory config = _feeds[assetId];
    if (config.pythContract == address(0)) revert Errors.AssetNotSupported(assetId);

    delete _feeds[assetId];
    emit FeedRemoved(assetId, config.priceId, msg.sender);
  }

  function getFeedConfig(bytes32 assetId) external view returns (FeedConfig memory config) {
    return _feeds[assetId];
  }
}
