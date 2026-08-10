// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/ICostBasisManager.sol';
import '../interfaces/IPortfolioManager.sol';
import '../interfaces/IProtocolDirectory.sol';
import '../libraries/AccessRoles.sol';
import '../constants/ModuleIds.sol';

/**
 * @title CostBasisManager
 * @notice Production-grade Cost Basis, Realized/Unrealized PnL, and Performance Accounting Module for UnifyVault V2
 */
contract CostBasisManager is AccessControl, ICostBasisManager {
  address public immutable directory;

  address public portfolioManager;
  address public indexToken;

  mapping(address => uint256) private _costBasisUSD;
  mapping(address => int256) private _realizedPnLUSD;
  mapping(address => uint256) private _firstDepositTimestamp;

  constructor(address admin, address directoryAddress) {
    if (admin == address(0)) revert ZeroAddressDetected();
    if (directoryAddress == address(0)) revert ZeroAddressDetected();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    directory = directoryAddress;
  }

  // --- External Governance Functions ---

  function syncModules() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    address newPM = IProtocolDirectory(directory).getAddress(ModuleIds.PORTFOLIO_MANAGER);
    address newToken = IProtocolDirectory(directory).getAddress(ModuleIds.TOKEN);

    if (newPM != address(0)) portfolioManager = newPM;
    if (newToken != address(0)) indexToken = newToken;
  }

  function setModules(address pm, address token) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (pm != address(0)) portfolioManager = pm;
    if (token != address(0)) indexToken = token;
  }

  // --- Core Accounting Transactions ---

  /**
   * @notice Records a new deposit, increasing user cost basis by the USD value of deposited assets
   */
  function recordDeposit(
    address user,
    uint256 depositValueUSD,
    uint256 sharesMinted
  ) external override {
    if (user == address(0)) revert ZeroAddressDetected();
    if (depositValueUSD == 0 || sharesMinted == 0) return;

    if (_firstDepositTimestamp[user] == 0) {
      _firstDepositTimestamp[user] = block.timestamp;
    }

    _costBasisUSD[user] += depositValueUSD;

    uint256 totalShares =
      indexToken != address(0) ? IERC20(indexToken).balanceOf(user) : sharesMinted;

    emit CostBasisUpdated(user, _costBasisUSD[user], totalShares, block.timestamp);
  }

  /**
   * @notice Records a redemption, computing pro-rata cost basis reduction and realized gain/loss
   */
  function recordRedeem(
    address user,
    uint256 userSharesBefore,
    uint256 sharesBurned,
    uint256 payoutValueUSD
  ) external override {
    if (user == address(0)) revert ZeroAddressDetected();
    if (sharesBurned == 0 || userSharesBefore == 0) return;
    if (sharesBurned > userSharesBefore) revert InsufficientShares();

    uint256 currentBasis = _costBasisUSD[user];
    uint256 costBasisReduction = (currentBasis * sharesBurned) / userSharesBefore;

    int256 realizedGainLoss = int256(payoutValueUSD) - int256(costBasisReduction);
    _realizedPnLUSD[user] += realizedGainLoss;

    if (costBasisReduction >= currentBasis) {
      _costBasisUSD[user] = 0;
    } else {
      _costBasisUSD[user] -= costBasisReduction;
    }

    uint256 totalSharesAfter =
      indexToken != address(0)
        ? IERC20(indexToken).balanceOf(user)
        : (userSharesBefore - sharesBurned);

    if (_costBasisUSD[user] == 0 || totalSharesAfter == 0) {
      _firstDepositTimestamp[user] = 0;
    }

    emit CostBasisUpdated(user, _costBasisUSD[user], totalSharesAfter, block.timestamp);
    emit RealizedPnLRecorded(user, realizedGainLoss, sharesBurned, block.timestamp);
  }

  // --- View Calculation Functions ---

  function costBasis(address account) external view override returns (uint256 costBasisUSD) {
    return _costBasisUSD[account];
  }

  function averageEntryPrice(
    address account
  ) external view override returns (uint256 entryPriceUSD) {
    uint256 basis = _costBasisUSD[account];
    if (basis == 0 || indexToken == address(0)) return 0;

    uint256 userShares = IERC20(indexToken).balanceOf(account);
    if (userShares == 0) return 0;

    return (basis * 1e18) / userShares;
  }

  function realizedPnL(address account) external view override returns (int256 pnlUSD) {
    return _realizedPnLUSD[account];
  }

  function unrealizedPnL(address account) external view override returns (int256 pnlUSD) {
    uint256 basis = _costBasisUSD[account];
    if (basis == 0 || indexToken == address(0) || portfolioManager == address(0)) return 0;

    uint256 userShares = IERC20(indexToken).balanceOf(account);
    if (userShares == 0) return 0;

    (, uint256 navPerShare) = IPortfolioManager(portfolioManager).calculateNAV();
    uint256 currentValueUSD = (userShares * navPerShare) / 1e18;

    return int256(currentValueUSD) - int256(basis);
  }

  function firstDepositTimestamp(
    address account
  ) external view override returns (uint256 timestamp) {
    return _firstDepositTimestamp[account];
  }

  function portfolioPerformance(
    address account
  )
    external
    view
    override
    returns (uint256 costBasisUSD, uint256 currentValueUSD, int256 pnlUSD, int256 pnlBps)
  {
    costBasisUSD = _costBasisUSD[account];
    if (costBasisUSD == 0 || indexToken == address(0) || portfolioManager == address(0)) {
      return (costBasisUSD, 0, 0, 0);
    }

    uint256 userShares = IERC20(indexToken).balanceOf(account);
    if (userShares == 0) {
      return (costBasisUSD, 0, 0, 0);
    }

    (, uint256 navPerShare) = IPortfolioManager(portfolioManager).calculateNAV();
    currentValueUSD = (userShares * navPerShare) / 1e18;

    pnlUSD = int256(currentValueUSD) - int256(costBasisUSD);
    pnlBps = (pnlUSD * 10000) / int256(costBasisUSD);
  }
}
