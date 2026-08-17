// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '../../src/controller/UnifyVaultControllerUpgradeable.sol';

/**
 * @title UnifyVaultControllerV2Mock
 * @notice Mock V2 implementation used strictly to test UUPS upgradeability and state preservation
 */
contract UnifyVaultControllerV2Mock is UnifyVaultControllerUpgradeable {
  function version() external pure returns (string memory) {
    return '2.0.0-mock';
  }

  function mockHarmlessV2Function() external pure returns (uint256) {
    return 42;
  }
}
