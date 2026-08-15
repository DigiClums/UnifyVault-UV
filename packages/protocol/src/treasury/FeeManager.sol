// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../interfaces/IFeeManager.sol';

/**
 * @title FeeManager
 * @notice Centralized manager for protocol fee parameters and treasury configuration
 * @dev Manages deposit, redemption, and performance fees with strict safety caps
 */
contract FeeManager is IFeeManager, AccessControl {
  uint256 public constant MAX_DEPOSIT_FEE_BPS = 500; // 5.00%
  uint256 public constant MAX_REDEEM_FEE_BPS = 500; // 5.00%
  uint256 public constant BPS_DENOMINATOR = 10000;

  uint256 public depositFeeBps;
  uint256 public redeemFeeBps;
  address public treasury;

  // Custom errors
  error FeeExceedsMaxCap(uint256 feeBps, uint256 maxCap);

  // Events
  event DepositFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
  event RedeemFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
  event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

  constructor(address initialTreasury) {
    if (initialTreasury == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);

    treasury = initialTreasury;
    depositFeeBps = 25;
    redeemFeeBps = 200;

    emit TreasuryUpdated(address(0), initialTreasury);
    emit DepositFeeUpdated(0, 25);
    emit RedeemFeeUpdated(0, 200);
  }

  /**
   * @notice Updates the deposit fee BPS
   * @param newFeeBps New deposit fee in basis points (max 500 = 5.00%)
   */
  function setDepositFeeBps(uint256 newFeeBps) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newFeeBps > MAX_DEPOSIT_FEE_BPS) {
      revert FeeExceedsMaxCap(newFeeBps, MAX_DEPOSIT_FEE_BPS);
    }
    uint256 oldFeeBps = depositFeeBps;
    depositFeeBps = newFeeBps;
    emit DepositFeeUpdated(oldFeeBps, newFeeBps);
  }

  /**
   * @notice Updates the redemption fee BPS
   * @param newFeeBps New redemption fee in basis points (max 500 = 5.00%)
   */
  function setRedeemFeeBps(uint256 newFeeBps) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newFeeBps > MAX_REDEEM_FEE_BPS) {
      revert FeeExceedsMaxCap(newFeeBps, MAX_REDEEM_FEE_BPS);
    }
    uint256 oldFeeBps = redeemFeeBps;
    redeemFeeBps = newFeeBps;
    emit RedeemFeeUpdated(oldFeeBps, newFeeBps);
  }

  /**
   * @notice Updates the treasury address
   * @param newTreasury New treasury address
   */
  function setTreasury(address newTreasury) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (newTreasury == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    address oldTreasury = treasury;
    treasury = newTreasury;
    emit TreasuryUpdated(oldTreasury, newTreasury);
  }
}
