// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import {Initializable} from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import {UUPSUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import {IUnifyVaultModule} from './IUnifyVaultModule.sol';
import {UnifyVaultStorage} from './UnifyVaultStorage.sol';

/**
 * @title UnifyVaultUpgradeable
 * @notice Upgradeable protocol shell for future UnifyVault versions.
 * @dev Existing protocol contracts remain untouched until an explicit migration plan
 *      proves their storage and behavior can be moved safely behind this proxy.
 */
contract UnifyVaultUpgradeable is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
  bytes32 public constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');
  bytes32 public constant MODULE_MANAGER_ROLE = keccak256('MODULE_MANAGER_ROLE');

  error ZeroAddress();
  error NotContract(address target);
  error InvalidModuleId(bytes32 expected, bytes32 actual);
  error InvalidModuleVersion();
  error ModuleNotRegistered(bytes32 moduleId);
  error ModuleAlreadyRegistered(bytes32 moduleId);
  error ModuleVersionNotIncreasing(uint64 currentVersion, uint64 newVersion);

  event ProtocolDirectoryUpdated(address indexed previousDirectory, address indexed newDirectory);
  event ModuleRegistered(bytes32 indexed moduleId, address indexed implementation, uint64 version);
  event ModuleUpgraded(
    bytes32 indexed moduleId,
    address indexed previousImplementation,
    address indexed newImplementation,
    uint64 version
  );
  event ModuleEnabled(bytes32 indexed moduleId);
  event ModuleDisabled(bytes32 indexed moduleId);
  event ModuleRemoved(bytes32 indexed moduleId, address indexed implementation);
  event UpgradeAuthorized(address indexed implementation, address indexed caller);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address governance, address protocolDirectory) external initializer {
    if (governance == address(0) || protocolDirectory == address(0)) revert ZeroAddress();
    if (protocolDirectory.code.length == 0) revert NotContract(protocolDirectory);

    __AccessControl_init();
    __UUPSUpgradeable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, governance);
    _grantRole(UPGRADER_ROLE, governance);
    _grantRole(MODULE_MANAGER_ROLE, governance);

    UnifyVaultStorage.layout().protocolDirectory = protocolDirectory;
  }

  function protocolDirectory() external view returns (address) {
    return UnifyVaultStorage.layout().protocolDirectory;
  }

  function setProtocolDirectory(address newDirectory) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (newDirectory == address(0)) revert ZeroAddress();
    if (newDirectory.code.length == 0) revert NotContract(newDirectory);

    UnifyVaultStorage.Layout storage l = UnifyVaultStorage.layout();
    address previous = l.protocolDirectory;
    l.protocolDirectory = newDirectory;
    emit ProtocolDirectoryUpdated(previous, newDirectory);
  }

  function registerModule(address module) external onlyRole(MODULE_MANAGER_ROLE) {
    (bytes32 id, uint64 version) = _moduleMetadata(module);
    UnifyVaultStorage.Layout storage l = UnifyVaultStorage.layout();
    if (l.modules[id].implementation != address(0)) revert ModuleAlreadyRegistered(id);

    l.modules[id] = UnifyVaultStorage.ModuleConfig({
      implementation: module,
      version: version,
      enabled: true
    });

    emit ModuleRegistered(id, module, version);
  }

  /// @notice Replaces a registered module without changing the module identifier.
  /// @dev The version must strictly increase, preventing accidental rollback.
  function upgradeModule(address module) external onlyRole(MODULE_MANAGER_ROLE) {
    (bytes32 id, uint64 newVersion) = _moduleMetadata(module);
    UnifyVaultStorage.Layout storage l = UnifyVaultStorage.layout();
    UnifyVaultStorage.ModuleConfig storage current = l.modules[id];
    if (current.implementation == address(0)) revert ModuleNotRegistered(id);
    if (newVersion <= current.version) {
      revert ModuleVersionNotIncreasing(current.version, newVersion);
    }

    address previous = current.implementation;
    current.implementation = module;
    current.version = newVersion;

    emit ModuleUpgraded(id, previous, module, newVersion);
  }

  function enableModule(bytes32 id) external onlyRole(MODULE_MANAGER_ROLE) {
    UnifyVaultStorage.ModuleConfig storage module = _module(id);
    module.enabled = true;
    emit ModuleEnabled(id);
  }

  function disableModule(bytes32 id) external onlyRole(MODULE_MANAGER_ROLE) {
    UnifyVaultStorage.ModuleConfig storage module = _module(id);
    module.enabled = false;
    emit ModuleDisabled(id);
  }

  function removeModule(bytes32 id) external onlyRole(MODULE_MANAGER_ROLE) {
    UnifyVaultStorage.Layout storage l = UnifyVaultStorage.layout();
    address implementation = l.modules[id].implementation;
    if (implementation == address(0)) revert ModuleNotRegistered(id);

    delete l.modules[id];
    emit ModuleRemoved(id, implementation);
  }

  function getModule(bytes32 id) external view returns (address implementation, uint64 version, bool enabled) {
    UnifyVaultStorage.ModuleConfig storage module = UnifyVaultStorage.layout().modules[id];
    if (module.implementation == address(0)) revert ModuleNotRegistered(id);
    return (module.implementation, module.version, module.enabled);
  }

  function isModuleEnabled(bytes32 id) external view returns (bool) {
    return UnifyVaultStorage.layout().modules[id].enabled;
  }

  function _module(bytes32 id) internal view returns (UnifyVaultStorage.ModuleConfig storage module) {
    module = UnifyVaultStorage.layout().modules[id];
    if (module.implementation == address(0)) revert ModuleNotRegistered(id);
  }

  function _moduleMetadata(address module) internal view returns (bytes32 id, uint64 version) {
    if (module == address(0)) revert ZeroAddress();
    if (module.code.length == 0) revert NotContract(module);

    id = IUnifyVaultModule(module).moduleId();
    version = IUnifyVaultModule(module).moduleVersion();
    if (id == bytes32(0)) revert InvalidModuleId(bytes32(0), id);
    if (version == 0) revert InvalidModuleVersion();
  }

  function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
  {
    if (newImplementation == address(0) || newImplementation.code.length == 0) {
      revert NotContract(newImplementation);
    }
    emit UpgradeAuthorized(newImplementation, msg.sender);
  }
}
