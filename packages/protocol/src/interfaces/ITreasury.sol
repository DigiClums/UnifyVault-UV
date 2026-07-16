// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ITreasury
 * @notice Interface for the UnifyVault Treasury Module
 */
interface ITreasury {
  function collectFee(address asset, uint256 amount) external;
  function allocateOperationalFunds(uint256 amount) external;
  function getOperationalBalance() external view returns (uint256);
  function getProtocolReserveBalance() external view returns (uint256);
}
