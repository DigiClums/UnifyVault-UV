// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracle.sol';
import '../interfaces/IOracleProvider.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../events/Events.sol';

/**
 * @title OracleManager
 * @notice Canonical pricing coordinator and institutional circuit breaker for UnifyVault Protocol
 * @dev Orchestrates multiple IOracleProvider adapters, normalizes pricing to 18 decimals,
 * enforces stale & invalid price protection, max deviation circuit breakers, and automatic fallback routing.
 */
contract OracleManager is AccessControl, IOracle {
  struct AssetConfig {
    address primaryProvider;
    address fallbackProvider;
    uint32 heartbeat;
    bool enabled;
  }

  bytes32 public constant PROVIDER_ID = keccak256('ORACLE_MANAGER');
  uint256 public constant DEFAULT_MAX_DEVIATION_BPS = 1000; // 10% default max deviation
  uint256 public constant MAX_ALLOWED_DEVIATION_BPS = 5000; // 50% safety cap for max deviation config
  uint256 public constant BPS_DENOMINATOR = 10000;

  mapping(bytes32 => AssetConfig) private _assets;
  mapping(bytes32 => uint256) private _maxDeviationBps;
  mapping(bytes32 => uint256) private _lastValidPrices;

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
  event MaxDeviationUpdated(bytes32 indexed assetId, uint256 oldBps, uint256 newBps, address indexed caller);
  event CircuitBreakerReset(bytes32 indexed assetId, uint256 oldPrice, uint256 newPrice, address indexed caller);
  event OracleFailure(address indexed asset, string reason);
  event OracleFallback(address indexed asset, address indexed fallbackProvider, uint256 price);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
  }

  // --- IOracle Implementation ---

  /**
   * @notice Returns the normalized, consolidated valuation price for a given asset (18 decimals)
   * @dev Resolves address asset to bytes32 assetId and routes internally through circuit breaker
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

  // --- Coordinator Pricing API with Circuit Breaker ---

  /**
   * @notice Returns the latest complete round data and metadata with full circuit breaker protection
   * @dev Validates stale time, zero/negative pricing, and max price deviation.
   * Automatically triggers fallback provider if primary fails validation.
   * Reverts on unsafe pricing if both primary and fallback fail.
   * @param assetId The bytes32 identifier of the asset
   * @return round The complete ProviderPrice struct containing the normalized price and metadata
   */
  function getPrice(bytes32 assetId) public view returns (ProviderPrice memory round) {
    AssetConfig memory config = _assets[assetId];
    if (config.primaryProvider == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }

    address assetAddr = address(uint160(uint256(assetId)));
    uint256 maxDev = _maxDeviationBps[assetId];
    if (maxDev == 0) {
      maxDev = DEFAULT_MAX_DEVIATION_BPS;
    }
    uint256 lastPrice = _lastValidPrices[assetId];

    // 1. Attempt Primary Provider call
    try IOracleProvider(config.primaryProvider).getLatestRound(assetId) returns (
      ProviderPrice memory rawRound
    ) {
      if (_validateRound(rawRound, config.heartbeat, lastPrice, maxDev)) {
        return _normalizePrice(rawRound);
      }
    } catch {}

    // 2. Attempt Fallback Provider call if Primary failed
    if (config.fallbackProvider != address(0)) {
      try IOracleProvider(config.fallbackProvider).getLatestRound(assetId) returns (
        ProviderPrice memory fallbackRound
      ) {
        if (_validateRound(fallbackRound, config.heartbeat, lastPrice, maxDev)) {
          ProviderPrice memory normalized = _normalizePrice(fallbackRound);
          return normalized;
        }
      } catch {}
    }

    // 3. Revert on unsafe pricing
    revert Errors.UnsafePricing(assetAddr);
  }

  /**
   * @notice State-changing version of getPrice that updates lastValidPrices and emits fallback/failure events
   * @param assetId The bytes32 identifier of the asset
   * @return price Normalized price scaled to 18 decimals
   */
  function getValidatedPrice(bytes32 assetId) external returns (uint256 price) {
    AssetConfig memory config = _assets[assetId];
    if (config.primaryProvider == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }

    address assetAddr = address(uint160(uint256(assetId)));
    uint256 maxDev = _maxDeviationBps[assetId];
    if (maxDev == 0) {
      maxDev = DEFAULT_MAX_DEVIATION_BPS;
    }
    uint256 lastPrice = _lastValidPrices[assetId];
    bool primaryValid = false;

    // 1. Attempt Primary Provider call
    try IOracleProvider(config.primaryProvider).getLatestRound(assetId) returns (
      ProviderPrice memory rawRound
    ) {
      if (_validateRound(rawRound, config.heartbeat, lastPrice, maxDev)) {
        ProviderPrice memory normalized = _normalizePrice(rawRound);
        _lastValidPrices[assetId] = normalized.price;
        return normalized.price;
      } else {
        emit OracleFailure(assetAddr, "Primary oracle validation or circuit breaker failed");
      }
    } catch {
      emit OracleFailure(assetAddr, "Primary oracle call reverted");
    }

    // 2. Attempt Fallback Provider call
    if (config.fallbackProvider != address(0)) {
      try IOracleProvider(config.fallbackProvider).getLatestRound(assetId) returns (
        ProviderPrice memory fallbackRound
      ) {
        if (_validateRound(fallbackRound, config.heartbeat, lastPrice, maxDev)) {
          ProviderPrice memory normalized = _normalizePrice(fallbackRound);
          _lastValidPrices[assetId] = normalized.price;
          emit OracleFallback(assetAddr, config.fallbackProvider, normalized.price);
          return normalized.price;
        } else {
          emit OracleFailure(assetAddr, "Fallback oracle validation failed");
        }
      } catch {
        emit OracleFailure(assetAddr, "Fallback oracle call reverted");
      }
    }

    emit OracleFailure(assetAddr, "All oracle providers failed circuit breaker");
    revert Errors.UnsafePricing(assetAddr);
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

    uint256 maxDev = _maxDeviationBps[assetId];
    if (maxDev == 0) {
      maxDev = DEFAULT_MAX_DEVIATION_BPS;
    }
    uint256 lastPrice = _lastValidPrices[assetId];

    // Check primary
    try IOracleProvider(config.primaryProvider).getLatestRound(assetId) returns (
      ProviderPrice memory rawRound
    ) {
      if (_validateRound(rawRound, config.heartbeat, lastPrice, maxDev)) {
        return true;
      }
    } catch {}

    // Check fallback
    if (config.fallbackProvider != address(0)) {
      try IOracleProvider(config.fallbackProvider).getLatestRound(assetId) returns (
        ProviderPrice memory rawRound
      ) {
        if (_validateRound(rawRound, config.heartbeat, lastPrice, maxDev)) {
          return true;
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

  /**
   * @notice Returns the configured max deviation BPS for an asset
   */
  function getMaxDeviationBps(bytes32 assetId) external view returns (uint256) {
    uint256 dev = _maxDeviationBps[assetId];
    return dev == 0 ? DEFAULT_MAX_DEVIATION_BPS : dev;
  }

  /**
   * @notice Returns the last valid price recorded for an asset
   */
  function getLastValidPrice(bytes32 assetId) external view returns (uint256) {
    return _lastValidPrices[assetId];
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
   * @notice Sets the maximum allowed price deviation in basis points for an asset
   * @param assetId The bytes32 identifier of the asset
   * @param deviationBps Max deviation in BPS (e.g. 1000 = 10%, max cap 5000 = 50%)
   */
  function setMaxDeviationBps(
    bytes32 assetId,
    uint256 deviationBps
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (deviationBps > MAX_ALLOWED_DEVIATION_BPS) {
      revert Errors.MathCalculationOverflow();
    }
    uint256 oldDev = _maxDeviationBps[assetId];
    _maxDeviationBps[assetId] = deviationBps;
    emit MaxDeviationUpdated(assetId, oldDev, deviationBps, msg.sender);
  }

  /**
   * @notice Resets circuit breaker by manually overriding the last valid price (emergency governance recovery)
   * @param assetId The bytes32 identifier of the asset
   * @param manualPrice The verified price to set as lastValidPrice
   */
  function resetCircuitBreaker(
    bytes32 assetId,
    uint256 manualPrice
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (manualPrice == 0) revert Errors.MathCalculationOverflow();
    uint256 oldPrice = _lastValidPrices[assetId];
    _lastValidPrices[assetId] = manualPrice;
    emit CircuitBreakerReset(assetId, oldPrice, manualPrice, msg.sender);
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

  // --- Internal Validation & Circuit Breaker Helpers ---

  /**
   * @dev Validates round price for freshness, positive pricing, and max deviation limits
   */
  function _validateRound(
    ProviderPrice memory rawRound,
    uint32 heartbeat,
    uint256 lastPrice,
    uint256 maxDevBps
  ) internal view returns (bool) {
    // 1. Invalid price check (non-positive)
    if (rawRound.price <= 0) {
      return false;
    }

    // 2. Stale timestamp check
    if (rawRound.updatedAt > block.timestamp + 15) {
      return false;
    }
    uint256 age = block.timestamp > rawRound.updatedAt ? block.timestamp - rawRound.updatedAt : 0;
    if (age > heartbeat) {
      return false;
    }

    // 3. Max deviation check against lastValidPrice
    if (lastPrice > 0) {
      ProviderPrice memory normalized = _normalizePrice(rawRound);
      uint256 diff = normalized.price > lastPrice
        ? normalized.price - lastPrice
        : lastPrice - normalized.price;
      uint256 deviationBps = (diff * BPS_DENOMINATOR) / lastPrice;
      if (deviationBps > maxDevBps) {
        return false;
      }
    }

    return true;
  }

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
