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

/**
 * @title UnifyVaultControllerV2GapMock
 * @notice Demonstrates exact V2 upgrade procedure consuming 1 slot from __gap:
 * - Slot 16: uint256 private _newVariableV2 (consumed from __gap)
 * - Slots 17-60: uint256[44] private __gap (reduced from 45 to 44)
 * - Total base slots remain exactly 61 (slots 0 to 60)
 */
contract UnifyVaultControllerV2GapMock is
  Initializable,
  AccessControlUpgradeable,
  ReentrancyGuard,
  PausableUpgradeable,
  UUPSUpgradeable
{
  // Slots 0 - 4
  address private _directory;
  address private _oracle;
  address private _vault;
  address private _treasury;
  address private _token;

  // Slots 5 - 8
  uint256 private _maxDepositPerTx;
  uint256 private _maxRedeemPerTx;
  uint256 private _dailyDepositCap;
  uint256 private _dailyRedeemCap;

  // Slots 9 - 12
  uint256 private _currentDepositDay;
  uint256 private _dailyDepositTotal;
  uint256 private _currentRedeemDay;
  uint256 private _dailyRedeemTotal;

  // Slots 13 - 14
  uint256 private _largeDepositThreshold;
  uint256 private _largeRedeemThreshold;

  // Slot 15
  uint256 private _swapSlippageBps;

  // Slot 16: NEW V2 VARIABLE (consumes 1 slot from __gap)
  uint256 private _newVariableV2;

  // Slots 17 to 60: Remaining storage gap reduced from 45 to 44
  uint256[44] private __gap;

  function version() external pure returns (string memory) {
    return '2.0.0-gap-consumed';
  }

  function directory() external view returns (address) {
    return _directory;
  }

  function oracle() external view returns (address) {
    return _oracle;
  }

  function vault() external view returns (address) {
    return _vault;
  }

  function treasury() external view returns (address) {
    return _treasury;
  }

  function token() external view returns (address) {
    return _token;
  }

  function maxDepositPerTx() external view returns (uint256) {
    return _maxDepositPerTx;
  }

  function maxRedeemPerTx() external view returns (uint256) {
    return _maxRedeemPerTx;
  }

  function dailyDepositCap() external view returns (uint256) {
    return _dailyDepositCap;
  }

  function dailyRedeemCap() external view returns (uint256) {
    return _dailyRedeemCap;
  }

  function currentDepositDay() external view returns (uint256) {
    return _currentDepositDay;
  }

  function dailyDepositTotal() external view returns (uint256) {
    return _dailyDepositTotal;
  }

  function currentRedeemDay() external view returns (uint256) {
    return _currentRedeemDay;
  }

  function dailyRedeemTotal() external view returns (uint256) {
    return _dailyRedeemTotal;
  }

  function largeDepositThreshold() external view returns (uint256) {
    return _largeDepositThreshold;
  }

  function largeRedeemThreshold() external view returns (uint256) {
    return _largeRedeemThreshold;
  }

  function swapSlippageBps() external view returns (uint256) {
    return _swapSlippageBps;
  }

  function newVariableV2() external view returns (uint256) {
    return _newVariableV2;
  }

  function setNewVariableV2(uint256 val) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _newVariableV2 = val;
  }

  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyRole(AccessRoles.GOVERNANCE_ROLE) {}
}
