// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @title IProtocolDirectory
 * @notice Central registry interface to dynamically resolve addresses of protocol modules
 */
interface IProtocolDirectory {
  /**
   * @notice Returns the registered address of a module or reverts if unregistered
   * @param name The bytes32 identifier of the module
   */
  function getAddress(bytes32 name) external view returns (address);

  /**
   * @notice Checks if a module identifier exists in the registry
   * @param name The bytes32 identifier to check
   */
  function exists(bytes32 name) external view returns (bool);

  /**
   * @notice Returns true if the registry is permanently frozen
   */
  function isFrozen() external view returns (bool);

  /**
   * @notice Registers a new module address in the directory
   * @param name The bytes32 identifier of the module
   * @param destination The target contract address to register
   */
  function registerAddress(bytes32 name, address destination) external;

  /**
   * @notice Updates the registered target address of an existing module
   * @param name The bytes32 identifier of the module
   * @param destination The new target contract address
   */
  function updateAddress(bytes32 name, address destination) external;

  /**
   * @notice Removes a registered module entry from the directory
   * @param name The bytes32 identifier of the module to remove
   */
  function removeAddress(bytes32 name) external;

  /**
   * @notice Freezes the registry permanently, disabling further updates
   */
  function freeze() external;
}
