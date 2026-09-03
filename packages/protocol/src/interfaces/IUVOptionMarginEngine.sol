// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVOptionMarginEngine {
  struct RiskParameters {
    uint256 mcrBps; // e.g. 14000 (140%)
    uint256 haircutBps; // e.g. 2000 (20%)
    uint256 maintenanceMarginBps; // e.g. 11000 (110%)
    uint256 liquidationThresholdBps; // e.g. 10500 (105%)
  }

  event RiskParametersUpdated(uint256 mcrBps, uint256 haircutBps, uint256 maintenanceBps);

  function getRiskParameters() external view returns (RiskParameters memory);
  function calculateRequiredCollateral(
    bytes32 seriesId,
    uint256 quantityLots
  )
    external
    view
    returns (uint256 requiredCollateralUvbe, uint256 maintenanceCollateralUvbe, uint256 maxLossUsd);
  function isPositionLiquidatable(bytes32 positionId) external view returns (bool);
}
