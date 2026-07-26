// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../interfaces/ICostBasisManager.sol';

/**
 * @title CostBasisManager
 * @notice Accounting layer that tracks each user's investment cost basis.
 * @dev Serves as the foundation for High Water Mark, Realized Profit, Performance Fee,
 * Partial Redemption, and Multi-Deposit support.
 */
contract CostBasisManager is ICostBasisManager, AccessControl {
  mapping(address => CostBasis) public override costBasis;

  // Custom errors
  error ZeroAmount();
  error InsufficientShares(uint256 requested, uint256 actual);

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
   * @notice Records a user deposit in the accounting layer
   * @dev Can only be called by Controller (accounts with CONTROLLER_ROLE)
   * @param user Address of the investor
   * @param assets Amount of assets deposited
   * @param shares Amount of shares minted
   */
  function recordDeposit(
    address user,
    uint256 assets,
    uint256 shares
  ) external override onlyRole(AccessRoles.CONTROLLER_ROLE) {
    if (user == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (assets == 0 || shares == 0) {
      revert ZeroAmount();
    }

    CostBasis storage cb = costBasis[user];
    cb.investedAssets += assets;
    cb.sharesOwned += shares;

    emit DepositRecorded(user, assets, shares);
  }

  /**
   * @notice Records a user redemption in the accounting layer, calculating proportional cost basis removed
   * @dev Can only be called by Controller (accounts with CONTROLLER_ROLE)
   * @param user Address of the investor
   * @param sharesRedeemed Amount of shares being redeemed
   * @return costRemoved Proportional cost basis removed from user's account
   */
  function recordRedemption(
    address user,
    uint256 sharesRedeemed
  ) external override onlyRole(AccessRoles.CONTROLLER_ROLE) returns (uint256 costRemoved) {
    if (user == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (sharesRedeemed == 0) {
      revert ZeroAmount();
    }

    CostBasis storage cb = costBasis[user];
    uint256 currentShares = cb.sharesOwned;
    uint256 currentInvested = cb.investedAssets;

    if (sharesRedeemed > currentShares) {
      revert InsufficientShares(sharesRedeemed, currentShares);
    }

    if (sharesRedeemed == currentShares) {
      costRemoved = currentInvested;
      cb.investedAssets = 0;
      cb.sharesOwned = 0;
    } else {
      costRemoved = (currentInvested * sharesRedeemed) / currentShares;
      cb.investedAssets = currentInvested - costRemoved;
      cb.sharesOwned = currentShares - sharesRedeemed;
    }

    emit RedemptionRecorded(user, costRemoved, sharesRedeemed);
    return costRemoved;
  }

  /**
   * @notice Returns the total invested assets recorded for a user
   * @param user Address of the user
   * @return Amount of invested assets
   */
  function investedAssets(address user) external view override returns (uint256) {
    return costBasis[user].investedAssets;
  }

  /**
   * @notice Returns the total shares owned recorded for a user
   * @param user Address of the user
   * @return Amount of shares owned
   */
  function sharesOwned(address user) external view override returns (uint256) {
    return costBasis[user].sharesOwned;
  }
}
