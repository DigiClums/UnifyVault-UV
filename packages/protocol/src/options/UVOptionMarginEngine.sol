// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IUVOptionMarginEngine.sol';
import '../interfaces/IUVOptionMarketFactory.sol';
import '../interfaces/IOracleManager.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVOptionMarginEngine
 * @notice Margin & Defined-Risk Collateral Engine with integer ceilDiv and zero under-collateralization.
 */
contract UVOptionMarginEngine is AccessControl, IUVOptionMarginEngine {
  bytes32 public constant GOVERNANCE_ROLE = AccessRoles.GOVERNANCE_ROLE;

  IUVOptionMarketFactory public marketFactory;
  IOracleManager public oracleManager;
  bytes32 public uvbeAssetId;

  RiskParameters private _riskParams;

  error ZeroAddress();
  error InvalidParameters();

  constructor(address admin, address _marketFactory, address _oracleManager, bytes32 _uvbeAssetId) {
    if (admin == address(0) || _marketFactory == address(0) || _oracleManager == address(0)) {
      revert ZeroAddress();
    }

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(GOVERNANCE_ROLE, admin);

    marketFactory = IUVOptionMarketFactory(_marketFactory);
    oracleManager = IOracleManager(_oracleManager);
    uvbeAssetId = _uvbeAssetId;

    _riskParams = RiskParameters({
      mcrBps: 14000, // 140%
      haircutBps: 2000, // 20%
      maintenanceMarginBps: 11000, // 110%
      liquidationThresholdBps: 10500 // 105%
    });
  }

  function getRiskParameters() external view override returns (RiskParameters memory) {
    return _riskParams;
  }

  function setRiskParameters(
    uint256 mcrBps,
    uint256 haircutBps,
    uint256 maintenanceBps,
    uint256 liquidationBps
  ) external onlyRole(GOVERNANCE_ROLE) {
    if (mcrBps < maintenanceBps || maintenanceBps < liquidationBps || haircutBps >= 10000) {
      revert InvalidParameters();
    }

    _riskParams = RiskParameters({
      mcrBps: mcrBps,
      haircutBps: haircutBps,
      maintenanceMarginBps: maintenanceBps,
      liquidationThresholdBps: liquidationBps
    });

    emit RiskParametersUpdated(mcrBps, haircutBps, maintenanceBps);
  }

  function calculateRequiredCollateral(
    bytes32 seriesId,
    uint256 quantityLots
  )
    external
    view
    override
    returns (uint256 requiredCollateralUvbe, uint256 maintenanceCollateralUvbe, uint256 maxLossUsd)
  {
    IUVOptionMarketFactory.OptionSeries memory s = marketFactory.getSeries(seriesId);

    // 1. Calculate Max Loss in USD (18 decimals)
    if (s.optionType == 0) {
      // Capped Defined-Risk CALL
      maxLossUsd =
        (s.strike * s.maxPriceDeviationCapBps * s.lotSize * quantityLots) / (10000 * 1e18);
    } else {
      // Defined-Risk PUT
      maxLossUsd = (s.strike * s.lotSize * quantityLots) / 1e18;
    }

    // 2. Fetch live UVBE price
    uint256 uvbePriceUsd = oracleManager.getNormalizedPrice(uvbeAssetId);
    if (uvbePriceUsd == 0) uvbePriceUsd = 1e18;

    // 3. Integer ceilDiv calculation
    uint256 effectivePrice = (uvbePriceUsd * (10000 - _riskParams.haircutBps)) / 10000;
    uint256 numerator = maxLossUsd * _riskParams.mcrBps * 1e18;
    uint256 denominator = effectivePrice * 10000;

    // ceilDiv(x, y) = (x + y - 1) / y
    requiredCollateralUvbe = (numerator + denominator - 1) / denominator;

    // Maintenance margin (110%)
    uint256 maintNumerator = maxLossUsd * _riskParams.maintenanceMarginBps * 1e18;
    maintenanceCollateralUvbe = (maintNumerator + denominator - 1) / denominator;
  }

  function isPositionLiquidatable(bytes32 /* positionId */) external pure override returns (bool) {
    return false; // V1 is fully collateralized defined-risk; no intraday liquidation required
  }
}
