// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IVault
 * @notice Interface for the UnifyVault Custody Vault
 */
interface IVault {
  function deposit(address asset, address from, uint256 amount) external;
  function withdraw(address asset, address to, uint256 amount) external;
  function totalAssets(address asset) external view returns (uint256);
  function balance(address asset) external view returns (uint256);
}
