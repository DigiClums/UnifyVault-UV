// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVOptionPricingEngine {
  event IVUpdated(bytes32 indexed seriesId, uint256 ivBps, uint256 timestamp);

  function updateIVWithSignature(
    bytes32 seriesId,
    uint256 ivBps,
    uint256 updatedAt,
    bytes calldata signature
  ) external;

  function getOptionQuote(
    bytes32 seriesId
  ) external view returns (uint256 premiumUsd, uint256 premiumUvbe, int256 delta, uint256 ivBps);

  function getGreeks(
    bytes32 seriesId
  ) external view returns (int256 delta, int256 gamma, int256 theta, int256 vega);

  function getIV(bytes32 seriesId) external view returns (uint256 ivBps, uint256 updatedAt);
  function isIVValid(bytes32 seriesId) external view returns (bool isValid);
}
