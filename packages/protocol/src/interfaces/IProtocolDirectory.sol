// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IProtocolDirectory
 * @notice Central registry interface to dynamically resolve addresses of protocol modules
 */
interface IProtocolDirectory {
  function getAddress(bytes32 name) external view returns (address);
  function getOracleManager() external view returns (address);
  function getCustodyVault() external view returns (address);
  function getController() external view returns (address);
  function getTreasury() external view returns (address);
  function getIndexToken() external view returns (address);
  function registerAddress(bytes32 name, address destination) external;
}
