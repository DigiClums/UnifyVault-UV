// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ICostBasisManager
 * @notice Interface for the CostBasisManager module tracking user investment cost basis
 */
interface ICostBasisManager {
  struct CostBasis {
    uint256 investedAssets;
    uint256 sharesOwned;
  }

  // Events
  event DepositRecorded(address indexed user, uint256 assets, uint256 shares);

  event RedemptionRecorded(address indexed user, uint256 assetsRemoved, uint256 sharesRemoved);

  // State-changing functions
  function recordDeposit(address user, uint256 assets, uint256 shares) external;

  function recordRedemption(
    address user,
    uint256 sharesRedeemed
  ) external returns (uint256 costRemoved);

  // View functions
  function investedAssets(address user) external view returns (uint256);

  function sharesOwned(address user) external view returns (uint256);

  function costBasis(
    address user
  ) external view returns (uint256 investedAssets, uint256 sharesOwned);
}
