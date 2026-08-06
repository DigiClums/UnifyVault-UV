// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracleProvider.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

interface IPythStructs {
  struct Price {
    int64 price;
    uint64 conf;
    int32 expo;
    uint256 publishTime;
  }
}

interface IPyth {
  function getPriceUnsafe(bytes32 id) external view returns (IPythStructs.Price memory price);
  function getPriceNoOlderThan(
    bytes32 id,
    uint256 age
  ) external view returns (IPythStructs.Price memory price);
}

/**
 * @title PythOracleProvider
 * @notice Production Oracle Provider adapter for Pyth Network feeds
 * @dev Implements IOracleProvider interface to serve as primary/fallback oracle in OracleManager
 */
contract PythOracleProvider is AccessControl, IOracleProvider {
  bytes32 public constant PROVIDER_ID = keccak256('PYTH_ORACLE_PROVIDER');
  IPyth public immutable pyth;

  struct PythFeedConfig {
    bytes32 pythPriceId;
    uint8 decimals;
    uint32 heartbeat;
    bool isRegistered;
  }

  mapping(bytes32 => PythFeedConfig) private _feeds;

  event PythFeedRegistered(
    bytes32 indexed assetId,
    bytes32 indexed pythPriceId,
    uint8 decimals,
    uint32 heartbeat,
    address indexed caller
  );

  constructor(address pythContract) {
    if (pythContract == address(0)) revert Errors.ZeroAddressDetected();
    pyth = IPyth(pythContract);
    _grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
  }

  function registerFeed(
    bytes32 assetId,
    bytes32 pythPriceId,
    uint8 decimals,
    uint32 heartbeat
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (pythPriceId == bytes32(0)) revert Errors.ZeroAddressDetected();
    if (heartbeat == 0) revert Errors.HeartbeatIntervalOutofBounds();

    _feeds[assetId] = PythFeedConfig({
      pythPriceId: pythPriceId,
      decimals: decimals,
      heartbeat: heartbeat,
      isRegistered: true
    });

    emit PythFeedRegistered(assetId, pythPriceId, decimals, heartbeat, msg.sender);
  }

  function getLatestPrice(bytes32 assetId) external view override returns (uint256 price) {
    ProviderPrice memory round = getLatestRound(assetId);
    return round.price;
  }

  function getLatestRound(
    bytes32 assetId
  ) public view override returns (ProviderPrice memory round) {
    PythFeedConfig memory config = _feeds[assetId];
    if (!config.isRegistered) revert Errors.AssetNotSupported(assetId);

    try pyth.getPriceUnsafe(config.pythPriceId) returns (IPythStructs.Price memory p) {
      if (p.price <= 0) revert Errors.OracleProviderPriceNegative(assetId, p.price);

      return
        ProviderPrice({
          price: uint256(uint64(p.price)),
          decimals: config.decimals,
          updatedAt: p.publishTime,
          roundId: p.publishTime,
          providerId: PROVIDER_ID
        });
    } catch {
      revert Errors.AssetNotSupported(assetId);
    }
  }

  function getDecimals(bytes32 assetId) external view override returns (uint8 decimals) {
    PythFeedConfig memory config = _feeds[assetId];
    if (!config.isRegistered) revert Errors.AssetNotSupported(assetId);
    return config.decimals;
  }

  function getUpdatedAt(bytes32 assetId) external view override returns (uint256 updatedAt) {
    ProviderPrice memory round = getLatestRound(assetId);
    return round.updatedAt;
  }

  function isHealthy(bytes32 assetId) external view override returns (bool healthy) {
    PythFeedConfig memory config = _feeds[assetId];
    if (!config.isRegistered) return false;

    try pyth.getPriceUnsafe(config.pythPriceId) returns (IPythStructs.Price memory p) {
      if (p.price <= 0) return false;
      if (p.publishTime == 0) return false;
      if (block.timestamp - p.publishTime > config.heartbeat) return false;
      return true;
    } catch {
      return false;
    }
  }
}
