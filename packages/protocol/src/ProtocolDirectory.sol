// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/access/AccessControl.sol';
import './interfaces/IProtocolDirectory.sol';
import './errors/Errors.sol';
import './events/Events.sol';
import './libraries/AddressValidationLib.sol';
import './libraries/AccessRoles.sol';

/**
 * @title ProtocolDirectory
 * @notice Canonical registry for managing dynamic addresses of core UnifyVault modules
 */
contract ProtocolDirectory is AccessControl, IProtocolDirectory {
  // Mappings from module hashes to active contract target addresses
  mapping(bytes32 => address) private _addresses;

  // One-way registry freeze flag
  bool private _frozen;

  /**
   * @notice Modifier to revert if the registry has been permanently frozen
   */
  modifier whenNotFrozen() {
    if (_frozen) {
      revert Errors.RegistryIsFrozen();
    }
    _;
  }

  /**
   * @notice Constructor initializing roles and granting administrator permissions to the deployer
   */
  constructor() {
    _grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
  }

  /**
   * @notice Registers a new module address in the directory
   * @dev Only callable by accounts holding the GOVERNANCE_ROLE
   * @param id The bytes32 identifier of the module (e.g. ModuleIds.ORACLE)
   * @param target The target contract address to register
   */
  function registerAddress(
    bytes32 id,
    address target
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) whenNotFrozen {
    AddressValidationLib.validateNonZeroAddress(target);
    if (_addresses[id] != address(0)) {
      revert Errors.EntryAlreadyExists(id);
    }

    _addresses[id] = target;
    emit Events.AddressRegistered(id, target, msg.sender);
  }

  /**
   * @notice Updates the registered target address of an existing module
   * @dev Only callable by accounts holding the GOVERNANCE_ROLE
   * @param id The bytes32 identifier of the module
   * @param target The new target contract address
   */
  function updateAddress(
    bytes32 id,
    address target
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) whenNotFrozen {
    AddressValidationLib.validateNonZeroAddress(target);
    address oldTarget = _addresses[id];
    if (oldTarget == address(0)) {
      revert Errors.EntryDoesNotExist(id);
    }
    if (oldTarget == target) {
      revert Errors.IdenticalAddressSubmitted();
    }

    _addresses[id] = target;
    emit Events.AddressUpdated(id, oldTarget, target, msg.sender);
  }

  /**
   * @notice Removes a registered module entry from the directory
   * @dev Only callable by accounts holding the GOVERNANCE_ROLE
   * @param id The bytes32 identifier of the module to remove
   */
  function removeAddress(
    bytes32 id
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) whenNotFrozen {
    address oldTarget = _addresses[id];
    if (oldTarget == address(0)) {
      revert Errors.EntryDoesNotExist(id);
    }

    delete _addresses[id];
    emit Events.AddressRemoved(id, oldTarget, msg.sender);
  }

  /**
   * @notice Freezes the registry permanently, disabling further updates
   * @dev Only callable by accounts holding the GOVERNANCE_ROLE
   */
  function freeze() external override onlyRole(AccessRoles.GOVERNANCE_ROLE) whenNotFrozen {
    _frozen = true;
    emit Events.RegistryFrozen(msg.sender);
  }

  /**
   * @notice Returns the registered address of a module or reverts if unregistered
   * @param name The bytes32 identifier of the module
   * @return target The registered contract address
   */
  function getAddress(bytes32 name) public view override returns (address) {
    address target = _addresses[name];
    if (target == address(0)) {
      revert Errors.EntryDoesNotExist(name);
    }
    return target;
  }

  /**
   * @notice Checks if a module identifier exists in the registry
   * @param name The bytes32 identifier to check
   * @return result True if registered, false otherwise
   */
  function exists(bytes32 name) external view override returns (bool) {
    return _addresses[name] != address(0);
  }

  /**
   * @notice Returns true if the registry is permanently frozen
   */
  function isFrozen() external view override returns (bool) {
    return _frozen;
  }
}
