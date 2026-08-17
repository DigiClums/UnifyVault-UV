// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IUnifyVaultModule {
  function moduleId() external view returns (bytes32);
  function moduleVersion() external view returns (uint64);
}
