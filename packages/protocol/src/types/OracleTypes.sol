// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @notice Configuration settings for Chainlink oracle price adapters
 */
struct OracleFeedConfig {
  address activeProvider; // Address of primary IOracleProvider
  uint32 heartbeat; // Max allowed age (in seconds)
  bool isFallbackActive; // Fallback switch
  address fallbackProvider; // Fallback IOracleProvider address
}

/**
 * @notice Struct holding historical price query records
 */
struct PriceRecord {
  uint256 price;
  uint256 timestamp;
  bool isValid;
}

/**
 * @notice Standardized pricing data returned by oracle providers
 */
struct ProviderPrice {
  uint256 price; // Price scaled to the feed's decimals
  uint8 decimals; // Decimals of the returned price (e.g. 8 for Chainlink, 18 for Redstone)
  uint256 updatedAt; // The timestamp of the last update
  uint256 roundId; // The oracle round ID
  bytes32 providerId; // A unique identifier of the provider (e.g. keccak256("Chainlink"))
}
