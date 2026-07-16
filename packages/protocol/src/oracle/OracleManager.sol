// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracle.sol';
import '../interfaces/IOracleProvider.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title OracleManager
 * @notice Canonical pricing coordinator for the UnifyVault Protocol
 * @dev Orchestrates multiple IOracleProvider adapters, normalizes pricing to 18 decimals, and applies fallbacks
 */
contract OracleManager is AccessControl, IOracle {
  struct AssetConfig {
    address primaryProvider;
    address fallbackProvider;
    uint32 heartbeat;
    bool enabled;
  }

  bytes32 public constant PROVIDER_ID = keccak256('ORACLE_MANAGER');

  mapping(bytes32 => AssetConfig) private _assets;

  // Events
  event PrimaryProviderUpdated(
    bytes32 indexed assetId,
    address oldProvider,
    address newProvider,
    address indexed caller
  );
  event FallbackProviderUpdated(
    bytes32 indexed assetId,
    address oldProvider,
    address newProvider,
    address indexed caller
  );
  event ProviderEnabled(bytes32 indexed assetId, address indexed caller);
  event ProviderDisabled(bytes32 indexed assetId, address indexed caller);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
  }

  // --- IOracle Implementation ---

  /**
   * @notice Returns the normalized, consolidated valuation price for a given asset (18 decimals)
   * @dev Resolves address asset to bytes32 assetId and routes internally
   * @param asset The address of the underlying collateral asset
   * @return price The normalized asset price scaled to 18 decimals
   */
  function getAssetPrice(address asset) external view override returns (uint256 price) {
    bytes32 assetId = bytes32(uint256(uint160(asset)));
    return getNormalizedPrice(assetId);
  }

  /**
   * @notice Evaluates if the price feed is currently active and within safety parameters
   * @param asset The address of the underlying collateral asset
   * @return isFresh True if the price feed is fresh and has not expired past its heartbeat
   */
  function isPriceFresh(address asset) external view override returns (bool isFresh) {
    bytes32 assetId = bytes32(uint256(uint160(asset)));
    return isHealthy(assetId);
  }

  /**
   * @notice Returns the metadata details of the active provider feed for an asset
   * @param asset The address of the underlying collateral asset
   * @return provider The address of the active oracle provider
   * @return heartbeat The configured heartbeat timeout threshold
   */
  function getFeedMetadata(
    address asset
  ) external view override returns (address provider, uint256 heartbeat) {
    bytes32 assetId = bytes32(uint256(uint160(asset)));
    AssetConfig memory config = _assets[assetId];
    if (config.primaryProvider == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }
    return (config.primaryProvider, uint256(config.heartbeat));
  }

  // --- Coordinator Pricing API ---

  /**
   * @notice Returns the latest complete round data and metadata in a standardized structure
   * @dev Automatically triggers the fallback provider if the primary provider fails validation
   * @param assetId The bytes32 identifier of the asset
   * @return round The complete ProviderPrice struct containing the normalized price and metadata
   */
  function getPrice(bytes32 assetId) public view returns (ProviderPrice memory round) {
    AssetConfig memory config = _assets[assetId];
    if (config.primaryProvider == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }

    // 1. Attempt Primary Provider call
    try IOracleProvider(config.primaryProvider).getLatestRound(assetId) returns (
      ProviderPrice memory rawRound
    ) {
      if (block.timestamp >= rawRound.updatedAt) {
        if (block.timestamp - rawRound.updatedAt <= config.heartbeat) {
          if (rawRound.price > 0) {
            return _normalizePrice(rawRound);
          }
        }
      }
    } catch {}

    // 2. Attempt Fallback Provider call
    if (config.fallbackProvider != address(0)) {
      try IOracleProvider(config.fallbackProvider).getLatestRound(assetId) returns (
        ProviderPrice memory rawRound
      ) {
        if (block.timestamp >= rawRound.updatedAt) {
          if (block.timestamp - rawRound.updatedAt <= config.heartbeat) {
            if (rawRound.price > 0) {
              return _normalizePrice(rawRound);
            }
          }
        }
      } catch {}
    }

    revert Errors.AssetNotSupported(assetId);
  }

  /**
   * @notice Returns the latest normalized price for the given asset, scaled to 18 decimals
   * @param assetId The bytes32 identifier of the asset
   * @return price The asset price scaled to 18 decimals
   */
  function getNormalizedPrice(bytes32 assetId) public view returns (uint256 price) {
    ProviderPrice memory round = getPrice(assetId);
    return round.price;
  }

  /**
   * @notice Checks if the pricing feed for a given asset is currently active, fresh, and valid
   * @param assetId The bytes32 identifier of the asset
   * @return healthy True if either primary or fallback feed is healthy
   */
  function isHealthy(bytes32 assetId) public view returns (bool healthy) {
    AssetConfig memory config = _assets[assetId];
    if (config.primaryProvider == address(0) || !config.enabled) {
      return false;
    }

    // Check primary
    try IOracleProvider(config.primaryProvider).getLatestRound(assetId) returns (
      ProviderPrice memory rawRound
    ) {
      if (block.timestamp >= rawRound.updatedAt) {
        if (block.timestamp - rawRound.updatedAt <= config.heartbeat) {
          if (rawRound.price > 0) {
            return true;
          }
        }
      }
    } catch {}

    // Check fallback
    if (config.fallbackProvider != address(0)) {
      try IOracleProvider(config.fallbackProvider).getLatestRound(assetId) returns (
        ProviderPrice memory rawRound
      ) {
        if (block.timestamp >= rawRound.updatedAt) {
          if (block.timestamp - rawRound.updatedAt <= config.heartbeat) {
            if (rawRound.price > 0) {
              return true;
            }
          }
        }
      } catch {}
    }

    return false;
  }

  /**
   * @notice Returns the primary provider address for an asset
   * @param assetId The bytes32 identifier of the asset
   * @return provider The address of the primary provider
   */
  function getProvider(bytes32 assetId) external view returns (address provider) {
    return _assets[assetId].primaryProvider;
  }

  /**
   * @notice Returns the fallback provider address for an asset
   * @param assetId The bytes32 identifier of the asset
   * @return fallbackProvider The address of the fallback provider
   */
  function getFallbackProvider(bytes32 assetId) external view returns (address fallbackProvider) {
    return _assets[assetId].fallbackProvider;
  }

  // --- Governance Configurations ---

  /**
   * @notice Registers or configures provider configurations for an asset
   * @param assetId The bytes32 identifier of the asset
   * @param primaryProvider The primary oracle provider contract address
   * @param fallbackProvider The fallback oracle provider contract address (optional, address(0) to disable)
   * @param heartbeat The allowed heartbeat timeout interval (in seconds)
   * @param enabled The status of the asset routing
   */
  function configureAsset(
    bytes32 assetId,
    address primaryProvider,
    address fallbackProvider,
    uint32 heartbeat,
    bool enabled
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (primaryProvider == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (heartbeat == 0) {
      revert Errors.HeartbeatIntervalOutofBounds();
    }

    AssetConfig storage config = _assets[assetId];
    address oldPrimary = config.primaryProvider;
    address oldFallback = config.fallbackProvider;

    config.primaryProvider = primaryProvider;
    config.fallbackProvider = fallbackProvider;
    config.heartbeat = heartbeat;
    config.enabled = enabled;

    if (oldPrimary != primaryProvider) {
      emit PrimaryProviderUpdated(assetId, oldPrimary, primaryProvider, msg.sender);
    }
    if (oldFallback != fallbackProvider) {
      emit FallbackProviderUpdated(assetId, oldFallback, fallbackProvider, msg.sender);
    }
    if (enabled) {
      emit ProviderEnabled(assetId, msg.sender);
    } else {
      emit ProviderDisabled(assetId, msg.sender);
    }
  }

  /**
   * @notice Configures only the enabled state of an asset
   * @param assetId The bytes32 identifier of the asset
   * @param enabled The new enablement status
   */
  function setAssetEnabled(
    bytes32 assetId,
    bool enabled
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AssetConfig storage config = _assets[assetId];
    if (config.primaryProvider == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }
    config.enabled = enabled;
    if (enabled) {
      emit ProviderEnabled(assetId, msg.sender);
    } else {
      emit ProviderDisabled(assetId, msg.sender);
    }
  }

  /**
   * @notice Returns the full AssetConfig configuration for an asset (telemetry helper)
   * @param assetId The bytes32 identifier of the asset
   * @return config The full AssetConfig struct
   */
  function getAssetConfig(bytes32 assetId) external view returns (AssetConfig memory config) {
    return _assets[assetId];
  }

  // --- Private Normalization Helper ---

  /**
   * @notice Scales provider price raw decimals into the standard 18 decimal format
   */
  function _normalizePrice(
    ProviderPrice memory rawRound
  ) internal pure returns (ProviderPrice memory) {
    uint8 decimals = rawRound.decimals;
    if (decimals == 0 || decimals > 24) {
      revert Errors.MathCalculationOverflow();
    }

    uint256 normalizedPrice = rawRound.price;
    if (decimals < 18) {
      normalizedPrice = rawRound.price * (10 ** (18 - decimals));
    } else if (decimals > 18) {
      normalizedPrice = rawRound.price / (10 ** (decimals - 18));
    }

    rawRound.price = normalizedPrice;
    rawRound.decimals = 18;
    return rawRound;
  }
}
