// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../libraries/FeeLib.sol';
import '../interfaces/ICostBasisManager.sol';
import '../interfaces/IHighWaterMarkManager.sol';
import '../interfaces/IRealizedProfitEngine.sol';
import '../interfaces/IFeeManager.sol';
import '../interfaces/IPerformanceFeeSettler.sol';

/**
 * @title PerformanceFeeSettler
 * @notice Module that orchestrates performance fee settlement during redemptions
 * @dev Coordinates CostBasisManager, HighWaterMarkManager, RealizedProfitEngine, and FeeManager.
 * Does not mutate accounting state until settlement parameters are validated.
 */
contract PerformanceFeeSettler is IPerformanceFeeSettler, AccessControl {
  ICostBasisManager public immutable costBasisManager;
  IHighWaterMarkManager public immutable highWaterMarkManager;
  IRealizedProfitEngine public immutable profitEngine;
  IFeeManager public immutable feeManager;

  // Custom errors
  error ZeroAmount();

  /**
   * @notice Constructor for PerformanceFeeSettler
   * @param admin Address granted DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, and CONTROLLER_ROLE
   * @param _costBasisManager Address of CostBasisManager
   * @param _highWaterMarkManager Address of HighWaterMarkManager
   * @param _profitEngine Address of RealizedProfitEngine
   * @param _feeManager Address of FeeManager
   */
  constructor(
    address admin,
    address _costBasisManager,
    address _highWaterMarkManager,
    address _profitEngine,
    address _feeManager
  ) {
    if (admin == address(0)) revert ProtocolErrors.ZeroAddressDetected();
    if (_costBasisManager == address(0)) revert ProtocolErrors.ZeroAddressDetected();
    if (_highWaterMarkManager == address(0)) revert ProtocolErrors.ZeroAddressDetected();
    if (_profitEngine == address(0)) revert ProtocolErrors.ZeroAddressDetected();
    if (_feeManager == address(0)) revert ProtocolErrors.ZeroAddressDetected();

    address initialAdmin = admin == address(0) ? msg.sender : admin;
    _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, initialAdmin);
    _grantRole(AccessRoles.CONTROLLER_ROLE, initialAdmin);

    costBasisManager = ICostBasisManager(_costBasisManager);
    highWaterMarkManager = IHighWaterMarkManager(_highWaterMarkManager);
    profitEngine = IRealizedProfitEngine(_profitEngine);
    feeManager = IFeeManager(_feeManager);
  }

  /**
   * @notice Previews the settlement breakdown without modifying any state
   * @param user Address of the investor
   * @param sharesRedeemed Amount of shares being redeemed
   * @param grossAssetsReceived Gross collateral asset value received from redemption
   * @return result SettlementResult struct containing costRemoved, realizedProfit, chargeableProfit, performanceFee, netAssetsToUser, newHighWaterMark
   */
  function previewSettlement(
    address user,
    uint256 sharesRedeemed,
    uint256 grossAssetsReceived
  ) public view override returns (SettlementResult memory result) {
    if (user == address(0)) revert ProtocolErrors.ZeroAddressDetected();
    if (sharesRedeemed == 0) revert ZeroAmount();

    (uint256 investedAssets, uint256 sharesOwned) = costBasisManager.costBasis(user);
    uint256 hwm = highWaterMarkManager.highWaterMark(user);
    uint256 feeBps = feeManager.performanceFeeBps();

    IRealizedProfitEngine.RedemptionContext memory ctx = IRealizedProfitEngine.RedemptionContext({
      assetsReceived: grossAssetsReceived,
      investedAssets: investedAssets,
      sharesOwned: sharesOwned,
      sharesRedeemed: sharesRedeemed,
      highWaterMark: hwm
    });

    IRealizedProfitEngine.ProfitResult memory pResult = profitEngine.calculateRealizedProfit(ctx);

    uint256 performanceFee = FeeLib.calculatePerformanceFee(pResult.chargeableProfit, feeBps);

    uint256 netAssets =
      grossAssetsReceived > performanceFee ? grossAssetsReceived - performanceFee : 0;

    uint256 newHWM;
    if (sharesRedeemed == sharesOwned) {
      newHWM = 0; // Reset HWM on full exit
    } else if (pResult.chargeableProfit > 0) {
      newHWM = hwm + pResult.chargeableProfit;
    } else {
      newHWM = hwm;
    }

    result.costRemoved = pResult.costRemoved;
    result.realizedProfit = pResult.realizedProfit;
    result.chargeableProfit = pResult.chargeableProfit;
    result.performanceFee = performanceFee;
    result.netAssetsToUser = netAssets;
    result.newHighWaterMark = newHWM;
  }

  /**
   * @notice Executes settlement, recording redemption on CostBasisManager and updating HighWaterMarkManager
   * @dev Can only be called by Controller (accounts with CONTROLLER_ROLE)
   * @param user Address of the investor
   * @param sharesRedeemed Amount of shares being redeemed
   * @param grossAssetsReceived Gross collateral asset value received from redemption
   * @return result SettlementResult struct containing settlement details
   */
  function executeSettlement(
    address user,
    uint256 sharesRedeemed,
    uint256 grossAssetsReceived
  )
    external
    override
    onlyRole(AccessRoles.CONTROLLER_ROLE)
    returns (SettlementResult memory result)
  {
    result = previewSettlement(user, sharesRedeemed, grossAssetsReceived);

    (, uint256 sharesOwned) = costBasisManager.costBasis(user);

    // Update CostBasisManager
    costBasisManager.recordRedemption(user, sharesRedeemed);

    // Update HighWaterMarkManager
    if (sharesRedeemed == sharesOwned) {
      highWaterMarkManager.resetHighWaterMark(user);
    } else if (result.chargeableProfit > 0) {
      highWaterMarkManager.updateHighWaterMark(user, result.newHighWaterMark);
    }

    emit PerformanceFeeSettled(
      user,
      grossAssetsReceived,
      result.costRemoved,
      result.realizedProfit,
      result.chargeableProfit,
      result.performanceFee,
      result.netAssetsToUser
    );
  }
}
