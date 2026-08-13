// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IPortfolioManager
 * @notice Interface for UnifyVault PortfolioManager coordinating backing valuation, UV Price Engine, and asset allocations
 */
interface IPortfolioManager {
  // Events
  event UVPriceUpdated(uint256 backingValueUSD, uint256 currentUVPrice, uint256 timestamp);
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

  function calculateUVPrice()
    external
    view
    returns (uint256 totalBackingUSD, uint256 tokenPriceUSD);

  function calculateNAV()
    external
    view
    returns (uint256 totalPortfolioValueUSD, uint256 navPerShare);

  function backingValueUSD() external view returns (uint256);

  function totalPortfolioValueUSD() external view returns (uint256);

  function getUVPrice() external view returns (uint256 totalBackingUSD, uint256 tokenPriceUSD);

  function currentUVPrice() external view returns (uint256 price);

  function nav() external view returns (uint256 totalPortfolioValueUSD, uint256 navPerShare);

  function sharePrice() external view returns (uint256 pricePerShare);

  function assetValueUSD(address asset) external view returns (uint256 valueUSD);

  function allocation()
    external
    view
    returns (address[] memory targetAssets, uint256[] memory weightsBps);

  function previewDeposit(
    address depositAsset,
    uint256 depositAmount
  ) external view returns (DepositPreview memory preview);

  function previewRedeem(
    uint256 sharesToBurn,
    address payoutAsset
  ) external view returns (RedeemPreview memory preview);
}
