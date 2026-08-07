// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title ITreasury
 * @notice Interface for the UnifyVault Treasury Module
 */
interface ITreasury {
  function collectFee(address asset, uint256 amount) external;
  function withdraw(address asset, address recipient, uint256 amount) external;
  function balance(address asset) external view returns (uint256);
  function totalAssetBalance(address asset) external view returns (uint256);
}
