// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUVLiquidityVault {
  event PremiumDeposited(bytes32 indexed seriesId, address indexed buyer, uint256 amountUvbe);
  event CollateralLocked(
    bytes32 indexed positionId,
    bytes32 indexed seriesId,
    address indexed writer,
    uint256 amountUvbe
  );
  event CollateralReleased(
    bytes32 indexed positionId,
    bytes32 indexed seriesId,
    address indexed recipient,
    uint256 amountUvbe
  );
  event SeriesSettlementPaid(
    bytes32 indexed seriesId,
    address indexed recipient,
    uint256 amountUvbe
  );
  event SnapshotLiabilityTransitioned(bytes32 indexed seriesId, uint256 totalPayoutObligation);

  function depositPremium(bytes32 seriesId, address buyer, uint256 amountUvbe) external;
  function lockCollateral(
    bytes32 positionId,
    bytes32 seriesId,
    address writer,
    uint256 amountUvbe
  ) external;
  function releaseCollateral(
    bytes32 positionId,
    bytes32 seriesId,
    address recipient,
    uint256 amountUvbe
  ) external;
  function transitionSnapshotLiability(bytes32 seriesId, uint256 totalPayoutObligation) external;
  function transferSeriesSettlementPayout(
    bytes32 seriesId,
    address recipient,
    uint256 amountUvbe
  ) external;

  function totalLockedCollateral() external view returns (uint256);
  function totalPendingSettlementLiabilities() external view returns (uint256);
  function totalSeriesEquity(bytes32 seriesId) external view returns (uint256);
  function seriesLockedCollateral(bytes32 seriesId) external view returns (uint256);
  function seriesPendingSettlementLiabilities(bytes32 seriesId) external view returns (uint256);
}
