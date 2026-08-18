// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../interfaces/IUVBEStakingMLM.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVBERewardReserve
 * @notice Dedicated custody vault holding already-minted UVBE for staking & MLM rewards
 * @dev Contains zero mint/burn permissions. Disburses funds strictly upon authorized calls from UVBERewardDistributor.
 */
contract UVBERewardReserve is IUVBERewardReserve, AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  address public immutable override token;
  address public override distributor;

  error UnauthorizedDistributor(address caller);
  error ModuleAlreadyInitialized();
  error ZeroAddress();
  error ZeroAmount();
  error InsufficientReserveBalance(uint256 requested, uint256 available);

  event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
  event RewardReserveFunded(address indexed funder, uint256 amount, uint256 newReserveBalance);
  event RewardDisbursed(address indexed recipient, uint256 amount, uint256 remainingReserve);
  event RewardTransferredToVault(address indexed vault, uint256 amount, uint256 remainingReserve);

  modifier onlyDistributor() {
    if (msg.sender != distributor) revert UnauthorizedDistributor(msg.sender);
    _;
  }

  constructor(address admin, address tokenAddress) {
    if (admin == address(0) || tokenAddress == address(0)) revert ZeroAddress();

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    _grantRole(AccessRoles.GUARDIAN_ROLE, admin);

    token = tokenAddress;
  }

  /**
   * @notice Sets the authorized UVBERewardDistributor contract exactly once, freezing it permanently
   * @param newDistributor Address of the distributor
   */
  function setDistributor(address newDistributor) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (distributor != address(0)) revert ModuleAlreadyInitialized();
    if (newDistributor == address(0)) revert ZeroAddress();
    distributor = newDistributor;
    emit DistributorUpdated(address(0), newDistributor);
  }

  /**
   * @notice Permissionlessly deposits already-minted UVBE into the reward reserve
   * @param amount Tokens to deposit
   */
  function depositRewardFunds(uint256 amount) external override nonReentrant whenNotPaused {
    if (amount == 0) revert ZeroAmount();

    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    uint256 currentBalance = IERC20(token).balanceOf(address(this));

    emit RewardReserveFunded(msg.sender, amount, currentBalance);
  }

  /**
   * @notice Disburses UVBE rewards to a user upon verified claim
   * @param recipient Target address
   * @param amount Tokens to disburse
   */
  function disburseReward(
    address recipient,
    uint256 amount
  ) external override onlyDistributor nonReentrant whenNotPaused {
    if (recipient == address(0)) revert ZeroAddress();
    if (amount == 0) revert ZeroAmount();

    uint256 available = IERC20(token).balanceOf(address(this));
    if (amount > available) revert InsufficientReserveBalance(amount, available);

    IERC20(token).safeTransfer(recipient, amount);
    uint256 remaining = available - amount;

    emit RewardDisbursed(recipient, amount, remaining);
  }

  /**
   * @notice Transfers UVBE from reserve directly to UVBEStakingVault for internal restaking
   * @param vault Target staking vault address
   * @param amount Tokens to transfer
   */
  function transferToVault(
    address vault,
    uint256 amount
  ) external override onlyDistributor nonReentrant whenNotPaused {
    if (vault == address(0)) revert ZeroAddress();
    if (amount == 0) revert ZeroAmount();

    uint256 available = IERC20(token).balanceOf(address(this));
    if (amount > available) revert InsufficientReserveBalance(amount, available);

    IERC20(token).safeTransfer(vault, amount);
    uint256 remaining = available - amount;

    emit RewardTransferredToVault(vault, amount, remaining);
  }

  /**
   * @notice Returns total liquid UVBE held in the reward reserve
   */
  function getAvailableReserve() external view override returns (uint256) {
    return IERC20(token).balanceOf(address(this));
  }

  /**
   * @notice Emergency circuit breaker pause
   */
  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  /**
   * @notice Circuit breaker unpause
   */
  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }
}
