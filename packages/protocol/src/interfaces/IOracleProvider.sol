// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '../types/OracleTypes.sol';

/**
 * @title IOracleProvider
 * @notice Standard interface for individual pricing oracle source adapters (e.g. Chainlink, Redstone, Pyth)
 * @dev Replaces the legacy address-based interface with a normalized, bytes32 asset ID API.
 */
interface IOracleProvider {
  /**
   * @notice Returns the latest raw price for the given asset (no 18-decimal normalization)
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported by the provider
   * @dev Reverts with `Errors.OracleProviderPriceNegative` if the retrieved price is negative or zero
   * @param assetId The bytes32 identifier of the asset (e.g. keccak256 hash of the token symbol or Pyth Price ID)
   * @return price The raw asset price
   */
  function getLatestPrice(bytes32 assetId) external view returns (uint256 price);

  /**
   * @notice Returns the latest complete round data and metadata in a standardized structure
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported
   * @param assetId The bytes32 identifier of the asset
   * @return round The complete ProviderPrice struct containing raw price and metadata
   */
  function getLatestRound(bytes32 assetId) external view returns (ProviderPrice memory round);

  /**
   * @notice Returns the decimal precision of the raw price values returned by this provider
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported
   * @param assetId The bytes32 identifier of the asset
   * @return decimals The number of decimal places of the provider's raw price feed
   */
  function getDecimals(bytes32 assetId) external view returns (uint8 decimals);

  /**
   * @notice Returns the timestamp of the last on-chain update for the given asset
   * @dev Reverts with `Errors.AssetNotSupported` if the asset is not supported
   * @param assetId The bytes32 identifier of the asset
   * @return updatedAt The unix timestamp of the last update
   */
  function getUpdatedAt(bytes32 assetId) external view returns (uint256 updatedAt);

  /**
   * @notice Checks if the pricing feed for a given asset is currently active, fresh, and valid
   * @dev Will return false instead of reverting if the asset is not supported or the feed is stale/invalid
   * @param assetId The bytes32 identifier of the asset
   * @return healthy True if the feed is online, price is positive, and within safety parameters
   */
  function isHealthy(bytes32 assetId) external view returns (bool healthy);
}
