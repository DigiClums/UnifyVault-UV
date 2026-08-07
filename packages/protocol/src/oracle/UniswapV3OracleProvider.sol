// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IOracleProvider.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

interface IUniswapV3Pool {
  function observe(
    uint32[] calldata secondsAgos
  )
    external
    view
    returns (
      int56[] memory tickCumulatives,
      uint160[] memory secondsPerLiquidityCumulativeX128s
    );

  function token0() external view returns (address);
  function token1() external view returns (address);
}

/**
 * @title UniswapV3OracleProvider
 * @notice Oracle provider adapter computing TWAP (Time-Weighted Average Price) spot quotes from Uniswap V3 pools
 */
contract UniswapV3OracleProvider is AccessControl, IOracleProvider {
  struct FeedConfig {
    address poolAddress;
    address baseToken;
    address quoteToken;
    uint32 twapWindow; // Seconds for TWAP (e.g. 1800s = 30 min)
    uint8 decimals;
    bool enabled;
  }

  bytes32 public constant PROVIDER_ID = keccak256('UNISWAP_V3_ORACLE_PROVIDER');

  mapping(bytes32 => FeedConfig) private _feeds;

  event FeedRegistered(
    bytes32 indexed assetId,
    address indexed poolAddress,
    address baseToken,
    address quoteToken,
    uint32 twapWindow,
    address indexed caller
  );
  event FeedRemoved(bytes32 indexed assetId, address indexed poolAddress, address indexed caller);

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
    if (config.poolAddress == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }

    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = config.twapWindow;
    secondsAgos[1] = 0;

    (int56[] memory tickCumulatives, ) = IUniswapV3Pool(config.poolAddress).observe(secondsAgos);

    int56 timeWeightedTick = (tickCumulatives[1] - tickCumulatives[0]) / int56(int32(config.twapWindow));

    uint256 price = _getQuoteAtTick(timeWeightedTick, 10 ** config.decimals, config.baseToken, config.quoteToken);

    if (price == 0) {
      revert Errors.OracleProviderPriceNegative(assetId, 0);
    }

    return
      ProviderPrice({
        price: price,
        decimals: config.decimals,
        updatedAt: block.timestamp,
        roundId: uint80(block.timestamp),
        providerId: PROVIDER_ID
      });
  }

  function getDecimals(bytes32 assetId) external view override returns (uint8 decimals) {
    FeedConfig memory config = _feeds[assetId];
    if (config.poolAddress == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }
    return config.decimals;
  }

  function getUpdatedAt(bytes32 assetId) external view override returns (uint256 updatedAt) {
    FeedConfig memory config = _feeds[assetId];
    if (config.poolAddress == address(0) || !config.enabled) {
      revert Errors.AssetNotSupported(assetId);
    }
    return block.timestamp;
  }

  function isHealthy(bytes32 assetId) external view override returns (bool healthy) {
    FeedConfig memory config = _feeds[assetId];
    if (config.poolAddress == address(0) || !config.enabled) {
      return false;
    }

    try this.getLatestRound(assetId) returns (ProviderPrice memory round) {
      return round.price > 0;
    } catch {
      return false;
    }
  }

  // --- Governance Actions ---

  function registerFeed(
    bytes32 assetId,
    address poolAddress,
    address baseToken,
    address quoteToken,
    uint32 twapWindow,
    uint8 decimals
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (poolAddress == address(0) || baseToken == address(0) || quoteToken == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (twapWindow == 0) {
      revert Errors.HeartbeatIntervalOutofBounds();
    }
    if (_feeds[assetId].poolAddress != address(0)) {
      revert Errors.EntryAlreadyExists(assetId);
    }

    _feeds[assetId] = FeedConfig({
      poolAddress: poolAddress,
      baseToken: baseToken,
      quoteToken: quoteToken,
      twapWindow: twapWindow,
      decimals: decimals,
      enabled: true
    });

    emit FeedRegistered(assetId, poolAddress, baseToken, quoteToken, twapWindow, msg.sender);
  }

  function removeFeed(bytes32 assetId) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    FeedConfig memory config = _feeds[assetId];
    if (config.poolAddress == address(0)) {
      revert Errors.AssetNotSupported(assetId);
    }

    delete _feeds[assetId];
    emit FeedRemoved(assetId, config.poolAddress, msg.sender);
  }

  function getFeedConfig(bytes32 assetId) external view returns (FeedConfig memory config) {
    return _feeds[assetId];
  }

  // --- Helper tick math for TWAP price estimation ---

  function _getQuoteAtTick(
    int56 tick,
    uint256 baseAmount,
    address baseToken,
    address quoteToken
  ) internal pure returns (uint256 quoteAmount) {
    if (tick == 0) return baseAmount;
    
    // Simplistic tick to ratio approximation for 1.0001^tick
    int24 tick24 = int24(tick);
    uint160 sqrtPriceX96;
    if (tick24 > 0) {
      sqrtPriceX96 = uint160(79228162514264337593543950336 + uint256(int256(tick24)) * 39614081257132);
    } else {
      sqrtPriceX96 = uint160(79228162514264337593543950336 - uint256(int256(-tick24)) * 39614081257132);
    }

    uint256 priceX96 = (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) >> 96;
    if (baseToken < quoteToken) {
      quoteAmount = (baseAmount * priceX96) >> 96;
    } else {
      quoteAmount = (baseAmount << 96) / (priceX96 == 0 ? 1 : priceX96);
    }
  }
}
