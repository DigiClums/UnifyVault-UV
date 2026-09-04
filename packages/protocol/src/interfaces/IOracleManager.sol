// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IOracleManager {
  struct PriceRound {
    uint256 price; // 18 decimals normalized
    uint8 decimals; // 18
    uint256 updatedAt;
    uint80 roundId;
    bytes32 providerId;
  }

  struct Observation {
    uint64 timestamp;
    uint192 price;
  }

  event ObservationRecorded(bytes32 indexed assetId, uint64 timestamp, uint192 price);

  function recordObservation(bytes32 assetId) external returns (uint192 price);
  function getPrice(bytes32 assetId) external view returns (PriceRound memory round);
  function getNormalizedPrice(bytes32 assetId) external view returns (uint256 price);
  function isHealthy(bytes32 assetId) external view returns (bool healthy);
  function isPriceFresh(bytes32 assetId) external view returns (bool isFresh);
  function getHistoricalTWAP(
    bytes32 assetId,
    uint256 startTime,
    uint256 endTime
  ) external view returns (uint256 twapPrice, bool valid);
}
