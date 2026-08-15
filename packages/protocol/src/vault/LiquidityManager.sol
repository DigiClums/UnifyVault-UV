// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '../interfaces/ILiquidityManager.sol';
import '../interfaces/IProtocolDirectory.sol';
import '../libraries/AccessRoles.sol';
import '../constants/ModuleIds.sol';

/**
 * @title LiquidityManager
 * @notice Operational and reserve liquidity management module for UnifyVault V2
 * @dev Manages operational and reserve accounting within existing CustodyVault architecture.
 * Does NOT execute automatic token transfers or introduce new vaults.
 */
contract LiquidityManager is AccessControl, ILiquidityManager {
  uint256 public constant BPS_DENOMINATOR = 10000;

  // Default thresholds (10% target, 5% refill threshold, 15% excess sweep threshold)
  uint256 public constant DEFAULT_OPERATIONAL_TARGET_BPS = 1000; // 10%
  uint256 public constant DEFAULT_REFILL_THRESHOLD_BPS = 500; // 5%
  uint256 public constant DEFAULT_EXCESS_THRESHOLD_BPS = 1500; // 15%

  address public immutable directory;
  address public custodyVault;

  mapping(address => uint256) private _operationalBalances;
  mapping(address => uint256) private _reserveBalances;
  mapping(address => ThresholdConfig) private _thresholds;

  /**
   * @notice Constructor for LiquidityManager
   * @param admin Address granted DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE
   * @param directoryAddress Address of ProtocolDirectory
   */
  constructor(address admin, address directoryAddress) {
    if (admin == address(0)) revert ZeroAddressDetected();
    if (directoryAddress == address(0)) revert ZeroAddressDetected();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    _grantRole(AccessRoles.CONTROLLER_ROLE, admin);

    directory = directoryAddress;
  }

  // --- Governance Functions ---

  /**
   * @notice Synchronizes CustodyVault address from ProtocolDirectory
   */
  function syncModules() external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    address newVault = IProtocolDirectory(directory).getAddress(ModuleIds.VAULT);
    if (newVault != address(0)) {
      custodyVault = newVault;
      emit VaultSynchronized(custodyVault);
    }
  }

  /**
   * @notice Configures custom liquidity thresholds for a specific asset
   * @param asset Asset address
   * @param operationalTargetBps Target operational percentage in BPS (e.g. 1000 = 10%)
   * @param refillThresholdBps Refill threshold percentage in BPS (e.g. 500 = 5%)
   * @param excessThresholdBps Excess sweep threshold percentage in BPS (e.g. 1500 = 15%)
   */
  function setThresholds(
    address asset,
    uint256 operationalTargetBps,
    uint256 refillThresholdBps,
    uint256 excessThresholdBps
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) revert ZeroAddressDetected();
    if (
      refillThresholdBps > operationalTargetBps ||
      operationalTargetBps > excessThresholdBps ||
      excessThresholdBps > BPS_DENOMINATOR
    ) {
      revert InvalidThresholdConfiguration();
    }

    _thresholds[asset] = ThresholdConfig({
      operationalTargetBps: operationalTargetBps,
      refillThresholdBps: refillThresholdBps,
      excessThresholdBps: excessThresholdBps,
      isCustom: true
    });

    emit ThresholdsConfigured(
      asset,
      operationalTargetBps,
      refillThresholdBps,
      excessThresholdBps,
      msg.sender
    );
  }

  /**
   * @notice Resets custom thresholds for an asset to default values
   * @param asset Asset address
   */
  function resetThresholds(address asset) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) revert ZeroAddressDetected();
    delete _thresholds[asset];
    emit ThresholdsConfigured(
      asset,
      DEFAULT_OPERATIONAL_TARGET_BPS,
      DEFAULT_REFILL_THRESHOLD_BPS,
      DEFAULT_EXCESS_THRESHOLD_BPS,
      msg.sender
    );
  }

  /**
   * @notice Directly sets/syncs accounting balances for an asset
   * @param asset Asset address
   * @param opBalance Operational liquidity balance
   * @param resBalance Reserve liquidity balance
   */
  function setLiquidityBalances(
    address asset,
    uint256 opBalance,
    uint256 resBalance
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) revert ZeroAddressDetected();
    _operationalBalances[asset] = opBalance;
    _reserveBalances[asset] = resBalance;
    emit LiquidityBalancesSynced(asset, opBalance, resBalance, msg.sender);
  }

  // --- Execution Functions (Callable by Governance / Multisig / Controller) ---

  /**
   * @notice Refills operational liquidity from reserve accounting balance
   * @param asset Asset address
   * @param amount Amount to transfer from reserve to operational accounting
   */
  function refillOperationalLiquidity(
    address asset,
    uint256 amount
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) revert ZeroAddressDetected();
    if (amount == 0) revert ZeroAmountDetected();

    uint256 currentReserve = _reserveBalances[asset];
    if (currentReserve < amount) {
      revert InsufficientReserveBalance(asset, amount, currentReserve);
    }

    _reserveBalances[asset] = currentReserve - amount;
    _operationalBalances[asset] += amount;

    emit OperationalLiquidityRefilled(
      asset,
      amount,
      _operationalBalances[asset],
      _reserveBalances[asset],
      msg.sender
    );
  }

  /**
   * @notice Sweeps excess operational liquidity to reserve accounting balance
   * @param asset Asset address
   * @param amount Amount to transfer from operational to reserve accounting
   */
  function sweepReserveLiquidity(
    address asset,
    uint256 amount
  ) external override onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) revert ZeroAddressDetected();
    if (amount == 0) revert ZeroAmountDetected();

    uint256 currentOperational = _operationalBalances[asset];
    if (currentOperational < amount) {
      revert InsufficientOperationalBalance(asset, amount, currentOperational);
    }

    _operationalBalances[asset] = currentOperational - amount;
    _reserveBalances[asset] += amount;

    emit ReserveLiquiditySwept(
      asset,
      amount,
      _operationalBalances[asset],
      _reserveBalances[asset],
      msg.sender
    );
  }

  /**
   * @notice Accounting helper called on new asset deposits
   * @param asset Asset address
   * @param amount Deposited amount
   */
  function recordDeposit(address asset, uint256 amount) external override {
    if (
      !hasRole(AccessRoles.GOVERNANCE_ROLE, msg.sender) &&
      !hasRole(AccessRoles.CONTROLLER_ROLE, msg.sender)
    ) {
      revert AccessControlUnauthorizedAccount(msg.sender, AccessRoles.CONTROLLER_ROLE);
    }
    if (asset == address(0)) revert ZeroAddressDetected();
    if (amount == 0) return;

    // Allocate incoming deposit to operational liquidity
    _operationalBalances[asset] += amount;
  }

  /**
   * @notice Accounting helper called on asset redemptions/withdrawals
   * @param asset Asset address
   * @param amount Withdrawn amount
   */
  function recordWithdrawal(address asset, uint256 amount) external override {
    if (
      !hasRole(AccessRoles.GOVERNANCE_ROLE, msg.sender) &&
      !hasRole(AccessRoles.CONTROLLER_ROLE, msg.sender)
    ) {
      revert AccessControlUnauthorizedAccount(msg.sender, AccessRoles.CONTROLLER_ROLE);
    }
    if (asset == address(0)) revert ZeroAddressDetected();
    if (amount == 0) return;

    uint256 opBal = _operationalBalances[asset];
    if (opBal >= amount) {
      _operationalBalances[asset] = opBal - amount;
    } else {
      _operationalBalances[asset] = 0;
      uint256 remainder = amount - opBal;
      uint256 resBal = _reserveBalances[asset];
      if (resBal >= remainder) {
        _reserveBalances[asset] = resBal - remainder;
      } else {
        _reserveBalances[asset] = 0;
      }
    }
  }

  // --- Liquidity Assessment & Monitoring Functions ---

  /**
   * @notice Checks liquidity status for an asset and emits events if thresholds are breached
   * @param asset Asset address
   * @return needsRefill True if operational liquidity is below refill threshold
   * @return needsSweep True if operational liquidity is above excess threshold
   * @return amount Amount required to refill to target OR amount to sweep to reserve
   */
  function checkLiquidity(
    address asset
  ) external override returns (bool needsRefill, bool needsSweep, uint256 amount) {
    uint256 targetOperationalBalance;
    (needsRefill, needsSweep, amount, targetOperationalBalance) = assessLiquidity(asset);

    uint256 opBal = _operationalBalances[asset];
    if (needsRefill) {
      emit RefillRequired(asset, opBal, targetOperationalBalance, amount);
    } else if (needsSweep) {
      emit ReserveSweepRequired(asset, opBal, targetOperationalBalance, amount);
    }
  }

  /**
   * @notice Pure view function calculating operational liquidity status against thresholds
   * @param asset Asset address
   * @return needsRefill True if operational liquidity ratio < refillThresholdBps
   * @return needsSweep True if operational liquidity ratio > excessThresholdBps
   * @return amount Calculated refill or sweep deficit/surplus amount
   * @return targetOperationalBalance Calculated target operational balance
   */
  function assessLiquidity(
    address asset
  )
    public
    view
    override
    returns (bool needsRefill, bool needsSweep, uint256 amount, uint256 targetOperationalBalance)
  {
    uint256 opBal = _operationalBalances[asset];
    uint256 resBal = _reserveBalances[asset];
    uint256 totalBal = opBal + resBal;

    if (totalBal == 0) {
      return (false, false, 0, 0);
    }

    (uint256 targetBps, uint256 refillBps, uint256 excessBps) = getThresholds(asset);

    targetOperationalBalance = (totalBal * targetBps) / BPS_DENOMINATOR;
    uint256 opRatioBps = (opBal * BPS_DENOMINATOR) / totalBal;

    if (opRatioBps < refillBps) {
      needsRefill = true;
      amount = targetOperationalBalance > opBal ? targetOperationalBalance - opBal : 0;
    } else if (opRatioBps > excessBps) {
      needsSweep = true;
      amount = opBal > targetOperationalBalance ? opBal - targetOperationalBalance : 0;
    }
  }

  /**
   * @notice Returns operational, reserve, and total balance accounting for an asset
   * @param asset Asset address
   * @return operationalBalance Operational balance
   * @return reserveBalance Reserve balance
   * @return totalBalance Aggregate balance
   */
  function getLiquidityBalances(
    address asset
  )
    external
    view
    override
    returns (uint256 operationalBalance, uint256 reserveBalance, uint256 totalBalance)
  {
    operationalBalance = _operationalBalances[asset];
    reserveBalance = _reserveBalances[asset];
    totalBalance = operationalBalance + reserveBalance;
  }

  /**
   * @notice Returns active threshold configuration (custom or default) for an asset
   * @param asset Asset address
   * @return operationalTargetBps Operational target BPS
   * @return refillThresholdBps Refill threshold BPS
   * @return excessThresholdBps Excess sweep threshold BPS
   */
  function getThresholds(
    address asset
  )
    public
    view
    override
    returns (uint256 operationalTargetBps, uint256 refillThresholdBps, uint256 excessThresholdBps)
  {
    ThresholdConfig memory config = _thresholds[asset];
    if (config.isCustom) {
      return (config.operationalTargetBps, config.refillThresholdBps, config.excessThresholdBps);
    }
    return (
      DEFAULT_OPERATIONAL_TARGET_BPS,
      DEFAULT_REFILL_THRESHOLD_BPS,
      DEFAULT_EXCESS_THRESHOLD_BPS
    );
  }
}
