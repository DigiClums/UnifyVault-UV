// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

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
