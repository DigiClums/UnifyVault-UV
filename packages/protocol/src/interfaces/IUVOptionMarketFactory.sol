// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVOptionMarketFactory {
  struct OptionSeries {
    bytes32 seriesId;
    bytes32 underlyingIndexId;
    uint256 strike; // 18 decimals
    uint256 expiry; // UTC Timestamp
    uint256 lotSize; // 18 decimals (e.g. 0.01e18)
    uint8 optionType; // CALL = 0, PUT = 1
    uint256 maxPriceDeviationCapBps; // e.g. 5000 (50% above strike)
    bool active;
  }

  struct ExpiryConfig {
    uint256 dailyExpiryHourUtc;
    uint256 dailyExpiryMinuteUtc;
    uint256 weeklyExpiryDay;
    uint256 monthlyExpiryWeek;
  }

  event SeriesCreated(bytes32 indexed seriesId, uint256 strike, uint256 expiry, uint8 optionType);
  event SeriesDeactivated(bytes32 indexed seriesId);
  event ExpiryConfigUpdated(uint256 dailyHour, uint256 dailyMin, uint256 weeklyDay);

  function getOptionSeries(bytes32 underlyingIndexId) external view returns (OptionSeries[] memory);
  function getSeries(bytes32 seriesId) external view returns (OptionSeries memory);
  function getExpiryConfig() external view returns (ExpiryConfig memory);
  function createSeries(
    bytes32 underlyingIndexId,
    uint256 strike,
    uint256 expiry,
    uint256 lotSize,
    uint8 optionType,
    uint256 maxPriceDeviationCapBps
  ) external returns (bytes32 seriesId);
  function createStrikeLadder(
    bytes32 underlyingIndexId,
    uint256 expiry,
    uint256 lotSize,
    uint256 centerStrike,
    uint256 interval,
    uint256 count
  ) external returns (bytes32[] memory seriesIds);
  function deactivateSeries(bytes32 seriesId) external;
}
