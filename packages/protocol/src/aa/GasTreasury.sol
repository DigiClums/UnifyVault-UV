// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';
import './UnifyVaultPaymaster.sol';

/**
 * @title GasTreasury
 * @notice Dedicated infrastructure reserve treasury for UnifyVault gas sponsorship.
 *
 * STRICT ACCOUNTING INVARIANT:
 * This contract holds standalone native ETH solely for funding Account Abstraction paymaster operations.
 * It is completely separated from:
 * - Protocol Treasury (Treasury.sol)
 * - Vault Collateral (CustodyVault.sol)
 * - Investor assets & NAV calculation
 * - P2P Escrow collateral
 * - User cost basis (CostBasisManagerV2.sol)
 */
contract GasTreasury is Ownable {
  address public refillOperator;
  address public paymaster;

  uint256 public maxRefillPerTx;
  uint256 public dailyRefillLimit;
  uint256 public currentDayRefillTotal;
  uint256 public currentDayWindowStart;

  bool public isPaused;

  event PaymasterRefilled(address indexed paymaster, uint256 amount, uint256 newDailyTotal);
  event RefillOperatorUpdated(address indexed oldOperator, address indexed newOperator);
  event PaymasterAddressUpdated(address indexed oldPaymaster, address indexed newPaymaster);
  event LimitsUpdated(uint256 maxPerTx, uint256 dailyLimit);
  event EmergencyFundsWithdrawn(address indexed to, uint256 amount);
  event EmergencyPaused(bool paused);

  error OnlyOperatorOrOwner();
  error TreasuryPaused();
  error InvalidPaymaster();
  error ExceedsMaxRefillPerTx(uint256 amount, uint256 limit);
  error ExceedsDailyRefillLimit(uint256 requested, uint256 limit);
  error InsufficientTreasuryBalance(uint256 requested, uint256 available);

  modifier onlyOperatorOrOwner() {
    if (msg.sender != owner() && msg.sender != refillOperator) {
      revert OnlyOperatorOrOwner();
    }
    _;
  }

  modifier whenNotPaused() {
    if (isPaused) revert TreasuryPaused();
    _;
  }

  constructor(
    address _owner,
    address _refillOperator,
    address _paymaster,
    uint256 _maxRefillPerTx,
    uint256 _dailyRefillLimit
  ) Ownable(_owner) {
    refillOperator = _refillOperator;
    paymaster = _paymaster;
    maxRefillPerTx = _maxRefillPerTx > 0 ? _maxRefillPerTx : 0.5 ether;
    dailyRefillLimit = _dailyRefillLimit > 0 ? _dailyRefillLimit : 2.0 ether;
    currentDayWindowStart = block.timestamp;
  }

  /**
   * @notice Refills the UnifyVaultPaymaster gas deposit on EntryPoint.
   * Callable by designated automated relayer or owner.
   */
  function refillPaymaster(uint256 amount) external onlyOperatorOrOwner whenNotPaused {
    if (paymaster == address(0)) revert InvalidPaymaster();
    if (amount > maxRefillPerTx) revert ExceedsMaxRefillPerTx(amount, maxRefillPerTx);
    if (address(this).balance < amount) {
      revert InsufficientTreasuryBalance(amount, address(this).balance);
    }

    // Update 24h rolling limit
    if (block.timestamp >= currentDayWindowStart + 1 days) {
      currentDayWindowStart = block.timestamp;
      currentDayRefillTotal = 0;
    }

    if (currentDayRefillTotal + amount > dailyRefillLimit) {
      revert ExceedsDailyRefillLimit(currentDayRefillTotal + amount, dailyRefillLimit);
    }

    currentDayRefillTotal += amount;

    // Send ETH to Paymaster deposit
    UnifyVaultPaymaster(payable(paymaster)).deposit{ value: amount }();

    emit PaymasterRefilled(paymaster, amount, currentDayRefillTotal);
  }

  /**
   * @notice Checks if the Paymaster deposit balance is below a given threshold.
   */
  function checkPaymasterNeedsRefill(uint256 minThreshold) external view returns (bool, uint256) {
    if (paymaster == address(0)) return (false, 0);
    uint256 balance = UnifyVaultPaymaster(payable(paymaster)).getDeposit();
    return (balance < minThreshold, balance);
  }

  // ==========================================
  // ADMIN CONFIGURATION (onlyOwner)
  // ==========================================

  function setRefillOperator(address _newOperator) external onlyOwner {
    address old = refillOperator;
    refillOperator = _newOperator;
    emit RefillOperatorUpdated(old, _newOperator);
  }

  function setPaymaster(address _newPaymaster) external onlyOwner {
    address old = paymaster;
    paymaster = _newPaymaster;
    emit PaymasterAddressUpdated(old, _newPaymaster);
  }

  function setLimits(uint256 _maxRefillPerTx, uint256 _dailyRefillLimit) external onlyOwner {
    maxRefillPerTx = _maxRefillPerTx;
    dailyRefillLimit = _dailyRefillLimit;
    emit LimitsUpdated(_maxRefillPerTx, _dailyRefillLimit);
  }

  function setPaused(bool _paused) external onlyOwner {
    isPaused = _paused;
    emit EmergencyPaused(_paused);
  }

  function withdrawEmergency(address payable _to, uint256 _amount) external onlyOwner {
    require(_to != address(0), 'Invalid recipient');
    require(_amount <= address(this).balance, 'Amount exceeds balance');
    (bool sent, ) = _to.call{ value: _amount }('');
    require(sent, 'ETH transfer failed');
    emit EmergencyFundsWithdrawn(_to, _amount);
  }

  receive() external payable {}
}
