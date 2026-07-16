// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IVault
 * @notice Interface for the UnifyVault Custody Vault
 */
interface IVault {
  function deposit(address asset, uint256 amount) external;
  function withdraw(address asset, uint256 amount, address recipient) external;
  function getAssetBalance(address asset) external view returns (uint256);
}
