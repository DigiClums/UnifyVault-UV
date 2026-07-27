// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../interfaces/IHighWaterMarkManager.sol';

/**
 * @title HighWaterMarkManager
 * @notice System tracking user High Water Marks (HWM) for performance fee calculations.
 * @dev Guarantees that performance fees are never charged twice on previously realized gains.
 */
contract HighWaterMarkManager is IHighWaterMarkManager, AccessControl {
  mapping(address => PerformanceState) public override performanceState;

  // Custom errors
  error HighWaterMarkNotIncreased(uint256 currentValue, uint256 newValue);

  /**
   * @notice Constructor initializing AccessControl roles
   * @param admin Address granted DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, and CONTROLLER_ROLE.
   *              If address(0) is passed, msg.sender is used as admin.
   */
  constructor(address admin) {
    address initialAdmin = admin == address(0) ? msg.sender : admin;
    _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, initialAdmin);
    _grantRole(AccessRoles.CONTROLLER_ROLE, initialAdmin);
  }

  /**
   * @notice Returns the current High Water Mark recorded for a user
   * @param user Address of the user
   * @return Current HWM value
   */
  function highWaterMark(address user) external view override returns (uint256) {
    return performanceState[user].highWaterMark;
  }

  /**
   * @notice Updates a user's High Water Mark to a new higher value
   * @dev Can only be called by Controller (accounts with CONTROLLER_ROLE).
   *      Reverts if newValue is less than or equal to current HWM.
   * @param user Address of the user
   * @param newValue New HWM value (must be strictly greater than current HWM)
   */
  function updateHighWaterMark(
    address user,
    uint256 newValue
  ) external override onlyRole(AccessRoles.CONTROLLER_ROLE) {
    if (user == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }

    uint256 currentVal = performanceState[user].highWaterMark;
    if (newValue <= currentVal) {
      revert HighWaterMarkNotIncreased(currentVal, newValue);
    }

    performanceState[user].highWaterMark = newValue;
    emit HighWaterMarkUpdated(user, currentVal, newValue);
  }

  /**
   * @notice Resets a user's High Water Mark back to zero
   * @dev Can only be called by Controller (accounts with CONTROLLER_ROLE)
   * @param user Address of the user
   */
  function resetHighWaterMark(
    address user
  ) external override onlyRole(AccessRoles.CONTROLLER_ROLE) {
    if (user == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }

    delete performanceState[user];
    emit HighWaterMarkReset(user);
  }
}
