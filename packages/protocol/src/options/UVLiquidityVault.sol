// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '../interfaces/IUVLiquidityVault.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVLiquidityVault
 * @notice Isolated custody and 3-Bucket ledger escrow for UV-NIFTY options.
 */
contract UVLiquidityVault is AccessControl, ReentrancyGuard, IUVLiquidityVault {
  using SafeERC20 for IERC20;

  bytes32 public constant POSITION_MANAGER_ROLE = keccak256('POSITION_MANAGER_ROLE');
  bytes32 public constant SETTLEMENT_VAULT_ROLE = keccak256('SETTLEMENT_VAULT_ROLE');

  IERC20 public immutable uvbeToken;

  // Ledger Buckets
  mapping(bytes32 => uint256) private _seriesLockedCollateral;
  mapping(bytes32 => uint256) private _seriesPendingLiabilities;
  mapping(bytes32 => uint256) private _seriesEquity;

  uint256 private _totalLockedCollateral;
  uint256 private _totalPendingLiabilities;

  error InsufficientVaultBalance();
  error InsufficientSeriesLiability();
  error ZeroAddress();

  constructor(address admin, address _uvbeToken) {
    if (admin == address(0) || _uvbeToken == address(0)) revert ZeroAddress();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    uvbeToken = IERC20(_uvbeToken);
  }

  function depositPremium(
    bytes32 seriesId,
    address buyer,
    uint256 amountUvbe
  ) external override onlyRole(POSITION_MANAGER_ROLE) nonReentrant {
    _seriesEquity[seriesId] += amountUvbe;
    uvbeToken.safeTransferFrom(buyer, address(this), amountUvbe);
    emit PremiumDeposited(seriesId, buyer, amountUvbe);
  }

  function lockCollateral(
    bytes32 positionId,
    bytes32 seriesId,
    address writer,
    uint256 amountUvbe
  ) external override onlyRole(POSITION_MANAGER_ROLE) nonReentrant {
    _seriesLockedCollateral[seriesId] += amountUvbe;
    _totalLockedCollateral += amountUvbe;

    uvbeToken.safeTransferFrom(writer, address(this), amountUvbe);
    emit CollateralLocked(positionId, seriesId, writer, amountUvbe);
  }

  function releaseCollateral(
    bytes32 positionId,
    bytes32 seriesId,
    address recipient,
    uint256 amountUvbe
  ) external override onlyRole(POSITION_MANAGER_ROLE) nonReentrant {
    _seriesLockedCollateral[seriesId] -= amountUvbe;
    _totalLockedCollateral -= amountUvbe;

    uvbeToken.safeTransfer(recipient, amountUvbe);
    emit CollateralReleased(positionId, seriesId, recipient, amountUvbe);
  }

  function transitionSnapshotLiability(
    bytes32 seriesId,
    uint256 totalPayoutObligation
  ) external override onlyRole(SETTLEMENT_VAULT_ROLE) {
    _seriesLockedCollateral[seriesId] -= totalPayoutObligation;
    _totalLockedCollateral -= totalPayoutObligation;

    _seriesPendingLiabilities[seriesId] += totalPayoutObligation;
    _totalPendingLiabilities += totalPayoutObligation;

    emit SnapshotLiabilityTransitioned(seriesId, totalPayoutObligation);
  }

  function transferSeriesSettlementPayout(
    bytes32 seriesId,
    address recipient,
    uint256 amountUvbe
  ) external override onlyRole(SETTLEMENT_VAULT_ROLE) nonReentrant {
    if (_seriesPendingLiabilities[seriesId] < amountUvbe) revert InsufficientSeriesLiability();

    _seriesPendingLiabilities[seriesId] -= amountUvbe;
    _totalPendingLiabilities -= amountUvbe;

    uvbeToken.safeTransfer(recipient, amountUvbe);
    emit SeriesSettlementPaid(seriesId, recipient, amountUvbe);
  }

  function totalLockedCollateral() external view override returns (uint256) {
    return _totalLockedCollateral;
  }

  function totalPendingSettlementLiabilities() external view override returns (uint256) {
    return _totalPendingLiabilities;
  }

  function totalSeriesEquity(bytes32 seriesId) external view override returns (uint256) {
    return _seriesEquity[seriesId];
  }

  function seriesLockedCollateral(bytes32 seriesId) external view override returns (uint256) {
    return _seriesLockedCollateral[seriesId];
  }

  function seriesPendingSettlementLiabilities(
    bytes32 seriesId
  ) external view override returns (uint256) {
    return _seriesPendingLiabilities[seriesId];
  }
}
