// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/IUVOptionPositionManager.sol';
import '../interfaces/IUVOptionMarketFactory.sol';
import '../interfaces/IUVOptionPricingEngine.sol';
import '../interfaces/IUVOptionMarginEngine.sol';
import '../interfaces/IUVLiquidityVault.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVOptionPositionManager
 * @notice Authoritative position ledger and trade orchestrator.
 */
contract UVOptionPositionManager is AccessControl, IUVOptionPositionManager {
  bytes32 public constant SETTLEMENT_VAULT_ROLE = keccak256('SETTLEMENT_VAULT_ROLE');

  IUVOptionMarketFactory public marketFactory;
  IUVOptionPricingEngine public pricingEngine;
  IUVOptionMarginEngine public marginEngine;
  IUVLiquidityVault public liquidityVault;

  uint256 private _positionNonce;
  mapping(bytes32 => Position) private _positions;
  mapping(address => bytes32[]) private _traderPositions;

  error SeriesNotActive();
  error SeriesExpired();
  error PositionNotFound();
  error PositionAlreadyClosed();
  error Unauthorized();
  error ZeroAddress();

  constructor(
    address admin,
    address _marketFactory,
    address _pricingEngine,
    address _marginEngine,
    address _liquidityVault
  ) {
    if (
      admin == address(0) ||
      _marketFactory == address(0) ||
      _pricingEngine == address(0) ||
      _marginEngine == address(0) ||
      _liquidityVault == address(0)
    ) {
      revert ZeroAddress();
    }

    _grantRole(DEFAULT_ADMIN_ROLE, admin);

    marketFactory = IUVOptionMarketFactory(_marketFactory);
    pricingEngine = IUVOptionPricingEngine(_pricingEngine);
    marginEngine = IUVOptionMarginEngine(_marginEngine);
    liquidityVault = IUVLiquidityVault(_liquidityVault);
  }

  function openPosition(
    bytes32 seriesId,
    bool isLong,
    uint256 quantityLots
  ) external override returns (bytes32 positionId) {
    IUVOptionMarketFactory.OptionSeries memory s = marketFactory.getSeries(seriesId);
    if (!s.active) revert SeriesNotActive();
    if (block.timestamp >= s.expiry) revert SeriesExpired();

    positionId = keccak256(
      abi.encodePacked(seriesId, msg.sender, block.timestamp, ++_positionNonce)
    );

    if (isLong) {
      // 1. Long Buyer Flow
      (, uint256 premiumUvbe, , ) = pricingEngine.getOptionQuote(seriesId);
      uint256 totalCostUvbe = (premiumUvbe * s.lotSize * quantityLots) / 1e18;

      liquidityVault.depositPremium(seriesId, msg.sender, totalCostUvbe);

      _positions[positionId] = Position({
        positionId: positionId,
        seriesId: seriesId,
        trader: msg.sender,
        isLong: true,
        quantityLots: quantityLots,
        entryPremiumUvbe: totalCostUvbe,
        lockedCollateralUvbe: 0,
        isOpen: true,
        isSettled: false
      });
    } else {
      // 2. Short Writer Flow
      (uint256 requiredCollateralUvbe, , ) = marginEngine.calculateRequiredCollateral(
        seriesId,
        quantityLots
      );

      liquidityVault.lockCollateral(positionId, seriesId, msg.sender, requiredCollateralUvbe);

      _positions[positionId] = Position({
        positionId: positionId,
        seriesId: seriesId,
        trader: msg.sender,
        isLong: false,
        quantityLots: quantityLots,
        entryPremiumUvbe: 0,
        lockedCollateralUvbe: requiredCollateralUvbe,
        isOpen: true,
        isSettled: false
      });
    }

    _traderPositions[msg.sender].push(positionId);
    emit PositionOpened(positionId, seriesId, msg.sender, isLong, quantityLots);
  }

  function closePosition(bytes32 positionId, uint256 quantityLots) external override {
    Position storage pos = _positions[positionId];
    if (pos.trader != msg.sender) revert Unauthorized();
    if (!pos.isOpen) revert PositionAlreadyClosed();

    IUVOptionMarketFactory.OptionSeries memory s = marketFactory.getSeries(pos.seriesId);
    if (block.timestamp >= s.expiry) revert SeriesExpired();

    if (pos.isLong) {
      // Long Sell Back Flow
      (, uint256 premiumUvbe, , ) = pricingEngine.getOptionQuote(pos.seriesId);
      uint256 payoutUvbe = (premiumUvbe * s.lotSize * quantityLots) / 1e18;

      pos.quantityLots -= quantityLots;
      if (pos.quantityLots == 0) pos.isOpen = false;

      liquidityVault.transferSeriesSettlementPayout(pos.seriesId, msg.sender, payoutUvbe);
      emit PositionClosed(positionId, quantityLots, payoutUvbe);
    } else {
      // Short Buyback Flow
      (, uint256 premiumUvbe, , ) = pricingEngine.getOptionQuote(pos.seriesId);
      uint256 buybackCost = (premiumUvbe * s.lotSize * quantityLots) / 1e18;

      uint256 releasedCollateral = (pos.lockedCollateralUvbe * quantityLots) / pos.quantityLots;
      pos.lockedCollateralUvbe -= releasedCollateral;
      pos.quantityLots -= quantityLots;
      if (pos.quantityLots == 0) pos.isOpen = false;

      // Deposit buyback into series equity and release collateral
      liquidityVault.depositPremium(pos.seriesId, msg.sender, buybackCost);
      liquidityVault.releaseCollateral(positionId, pos.seriesId, msg.sender, releasedCollateral);

      emit PositionClosed(positionId, quantityLots, releasedCollateral);
    }
  }

  function markPositionSettled(
    bytes32 positionId
  ) external override onlyRole(SETTLEMENT_VAULT_ROLE) {
    Position storage pos = _positions[positionId];
    if (pos.positionId == bytes32(0)) revert PositionNotFound();
    pos.isOpen = false;
    pos.isSettled = true;
    emit PositionMarkedSettled(positionId);
  }

  function getPosition(bytes32 positionId) external view override returns (Position memory) {
    Position memory pos = _positions[positionId];
    if (pos.positionId == bytes32(0)) revert PositionNotFound();
    return pos;
  }

  function getTraderPositions(address trader) external view override returns (bytes32[] memory) {
    return _traderPositions[trader];
  }
}
