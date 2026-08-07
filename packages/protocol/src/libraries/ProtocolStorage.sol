// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '../types/VaultTypes.sol';
import '../types/OracleTypes.sol';
import '../types/TreasuryTypes.sol';

/**
 * @title ProtocolStorage
 * @notice Implements ERC-7201 namespace storage pattern to prevent proxy layout collisions
 */
library ProtocolStorage {
  // keccak256(abi.encode(uint256(keccak256("unifyvault.storage.controller")) - 1)) & ~0xff
  bytes32 public constant CONTROLLER_STORAGE_SLOT =
    0x9fb434c442cf89e02316e6d1ebf40f0c05fe0506eb9d494191d927a419eb3100;

  // keccak256(abi.encode(uint256(keccak256("unifyvault.storage.vault")) - 1)) & ~0xff
  bytes32 public constant VAULT_STORAGE_SLOT =
    0x4f128c7042af89c02316e6d1ebf40f0c05fe0506eb9d494191d927a419eb3100;

  struct ControllerStorage {
    bool isPaused;
    uint24 mintFeeBps;
    uint24 burnFeeBps;
    uint24 maxFeeBps;
    address directory;
    mapping(address => bool) supportedCollateral;
  }

  struct VaultStorage {
    mapping(address => uint256) assetBalances;
    uint256 totalAssetsValue;
    VaultAllocation[] allocations;
  }

  function controllerStorage() internal pure returns (ControllerStorage storage ds) {
    bytes32 position = CONTROLLER_STORAGE_SLOT;
    assembly {
      ds.slot := position
    }
  }

  function vaultStorage() internal pure returns (VaultStorage storage ds) {
    bytes32 position = VAULT_STORAGE_SLOT;
    assembly {
      ds.slot := position
    }
  }
}
