// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library ERC7201StorageSlot {
  function core() internal pure returns (bytes32) {
    return keccak256(abi.encode(uint256(keccak256("unifyvault.storage.core")) - 1)) & ~bytes32(uint256(0xff));
  }
}
