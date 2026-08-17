// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library UnifyVaultStorage {
  bytes32 internal constant STORAGE_SLOT =
    bytes32(uint256(keccak256("unifyvault.storage.core")) - 1) & ~bytes32(uint256(0xff));

  struct ModuleConfig {
    address implementation;
    uint64 version;
    bool enabled;
  }

  /// @custom:storage-location erc7201:unifyvault.storage.core
  struct Layout {
    address protocolDirectory;
    mapping(bytes32 => ModuleConfig) modules;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
