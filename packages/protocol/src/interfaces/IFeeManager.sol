// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IFeeManager
 * @notice Interface for the UnifyVault FeeManager Module
 */
interface IFeeManager {
  function depositFeeBps() external view returns (uint256);
  function redeemFeeBps() external view returns (uint256);
  function performanceFeeBps() external view returns (uint256);
  function treasury() external view returns (address);

  function setDepositFeeBps(uint256 newFeeBps) external;
  function setRedeemFeeBps(uint256 newFeeBps) external;
  function setPerformanceFeeBps(uint256 newFeeBps) external;
  function setTreasury(address newTreasury) external;
}
