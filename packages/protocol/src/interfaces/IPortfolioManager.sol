// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IPortfolioManager
 * @notice Interface for UnifyVault PortfolioManager coordinating portfolio accounting, NAV, and asset allocations
 */
interface IPortfolioManager {
  // Events
  event NAVUpdated(uint256 totalPortfolioValueUSD, uint256 navPerShare, uint256 timestamp);
  event AllocationCalculated(
    address indexed depositAsset,
    uint256 depositAmount,
    address[] targetAssets,
    uint256[] allocationAmounts
  );
  event StrategySynchronized(address indexed strategyManager);

  // Custom Errors
  error ZeroAddressDetected();
  error ZeroAmountDetected();
  error AssetNotSupportedByOracle(address asset);
  error InvalidStrategyManager();
  error InvalidVault();
  error InvalidOracle();
  error InvalidToken();
  error ZeroShareSupplyWithNonZeroValue();

  // Structs
  struct DepositPreview {
    uint256 sharesToMint;
    uint256 depositValueUSD;
    address[] targetAssets;
    uint256[] allocationAmounts;
  }

  struct RedeemPreview {
    uint256 payoutAmount;
    uint256 userShareUSDValue;
  }

  // View Calculation Functions
  function calculateAllocation(
    address depositAsset,
    uint256 depositAmount
  ) external view returns (address[] memory targetAssets, uint256[] memory allocationAmounts);

  function calculatePortfolioValue() external view returns (uint256 totalPortfolioValueUSD);

  function calculateNAV()
    external
    view
    returns (uint256 totalPortfolioValueUSD, uint256 navPerShare);

  function previewDeposit(
    address depositAsset,
    uint256 depositAmount
  ) external view returns (DepositPreview memory preview);

  function previewRedeem(
    uint256 sharesToBurn,
    address payoutAsset
  ) external view returns (RedeemPreview memory preview);
}
