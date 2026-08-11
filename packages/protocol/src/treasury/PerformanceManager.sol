// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/IPerformanceManager.sol';
import '../interfaces/ICostBasisManagerV2.sol';
import '../interfaces/IPortfolioManager.sol';
import '../interfaces/IOracle.sol';
import '../interfaces/IProtocolDirectory.sol';
import '../libraries/AccessRoles.sol';
import '../constants/ModuleIds.sol';

/**
 * @title PerformanceManager
 * @notice Canonical Performance and PnL Analytics Engine for UnifyVault V2
 * @dev Integrates PortfolioManager, CostBasisManager, and OracleManager to produce
 * standard on-chain portfolio performance metrics (Current Value, Invested Capital, PnLs, ROI, Holding Period).
 */
contract PerformanceManager is AccessControl, IPerformanceManager {
  address public immutable directory;

  address public portfolioManager;
  address public costBasisManager;
  address public oracleManager;
  address public indexToken;

  event ModulesSynchronized(
    address indexed portfolioManager,
    address indexed costBasisManager,
    address indexed oracleManager,
    address indexToken
  );

  constructor(address admin, address directoryAddress) {
    if (admin == address(0)) revert ZeroAddressDetected();
    if (directoryAddress == address(0)) revert ZeroAddressDetected();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    directory = directoryAddress;
  }

  // --- External Governance Functions ---

  /**
   * @notice Synchronizes module dependency contract addresses from ProtocolDirectory
   */
  function syncModules() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    address newPM = IProtocolDirectory(directory).getAddress(ModuleIds.PORTFOLIO_MANAGER);
    address newCBM = IProtocolDirectory(directory).getAddress(ModuleIds.COST_BASIS_MANAGER);
    address newOM = IProtocolDirectory(directory).getAddress(ModuleIds.ORACLE);
    address newToken = IProtocolDirectory(directory).getAddress(ModuleIds.TOKEN);

    if (newPM != address(0)) portfolioManager = newPM;
    if (newCBM != address(0)) costBasisManager = newCBM;
    if (newOM != address(0)) oracleManager = newOM;
    if (newToken != address(0)) indexToken = newToken;

    emit ModulesSynchronized(portfolioManager, costBasisManager, oracleManager, indexToken);
  }

  /**
   * @notice Explicitly sets dependent module addresses
   */
  function setModules(
    address pm,
    address cbm,
    address om,
    address token
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (pm != address(0)) portfolioManager = pm;
    if (cbm != address(0)) costBasisManager = cbm;
    if (om != address(0)) oracleManager = om;
    if (token != address(0)) indexToken = token;

    emit ModulesSynchronized(portfolioManager, costBasisManager, oracleManager, indexToken);
  }

  // --- IPerformanceManager View Functions ---

  /**
   * @notice Returns the current USD value of user index share holdings (18 decimals)
   */
  function currentValue(address account) public view override returns (uint256) {
    if (indexToken == address(0) || portfolioManager == address(0)) return 0;
    uint256 userShares = IERC20(indexToken).balanceOf(account);
    if (userShares == 0) return 0;

    (, uint256 navPerShare) = IPortfolioManager(portfolioManager).calculateNAV();
    return (userShares * navPerShare) / 1e18;
  }

  /**
   * @notice Returns current active invested capital in USD (18 decimals)
   */
  function investedCapital(address account) public view override returns (uint256) {
    if (costBasisManager == address(0)) return 0;
    return ICostBasisManagerV2(costBasisManager).costBasis(account);
  }

  /**
   * @notice Returns net profit (realized PnL + unrealized PnL) in USD (18 decimals)
   */
  function netProfit(address account) public view override returns (int256) {
    Performance memory perf = performance(account);
    return perf.netPnL;
  }

  /**
   * @notice Returns Return on Investment (ROI) in Basis Points (1 BPS = 0.01%)
   */
  function roi(address account) public view override returns (int256) {
    Performance memory perf = performance(account);
    return perf.roiBps;
  }

  /**
   * @notice Returns full aggregate Performance struct for account
   */
  function performance(address account) public view override returns (Performance memory perf) {
    if (account == address(0)) revert ZeroAddressDetected();

    perf.investedCapitalUSD = investedCapital(account);
    perf.currentValueUSD = currentValue(account);

    if (costBasisManager != address(0)) {
      perf.realizedPnL = ICostBasisManagerV2(costBasisManager).realizedPnL(account);

      uint256 firstDeposit = ICostBasisManagerV2(costBasisManager).firstDepositTimestamp(account);
      uint256 userShares = indexToken != address(0) ? IERC20(indexToken).balanceOf(account) : 0;

      if (userShares > 0 && firstDeposit > 0 && block.timestamp >= firstDeposit) {
        perf.holdingPeriod = block.timestamp - firstDeposit;
      } else {
        perf.holdingPeriod = 0;
      }
    }

    if (perf.investedCapitalUSD > 0 && perf.currentValueUSD > 0) {
      perf.unrealizedPnL = int256(perf.currentValueUSD) - int256(perf.investedCapitalUSD);
    } else if (perf.investedCapitalUSD > 0 && perf.currentValueUSD == 0) {
      perf.unrealizedPnL = -int256(perf.investedCapitalUSD);
    } else {
      perf.unrealizedPnL = 0;
    }

    perf.netPnL = perf.realizedPnL + perf.unrealizedPnL;

    if (perf.investedCapitalUSD > 0) {
      perf.roiBps = (perf.netPnL * 10000) / int256(perf.investedCapitalUSD);
    } else {
      perf.roiBps = 0;
    }
  }
}
