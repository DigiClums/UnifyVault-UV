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
 * @title UVBERewardReserve (Legacy / Compatibility Adapter)
 * @notice Optional accounting adapter referencing protocol-owned capital in UVBEStakingVault
 * @dev In the redesigned architecture, all protocol-owned staking capital is custodied in UVBEStakingVault.
 * This contract exists only for backwards-compatible view queries and legacy test compatibility.
 */
contract UVBERewardReserve is AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  address public immutable token;
  address public vault;
  address public distributor;

  error UnauthorizedDistributor(address caller);
  error ModuleAlreadyInitialized();
  error ZeroAddress();
  error ZeroAmount();
  error InsufficientReserveBalance(uint256 requested, uint256 available);

  event VaultUpdated(address indexed oldVault, address indexed newVault);
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

  function setVault(address newVault) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (vault != address(0)) revert ModuleAlreadyInitialized();
    if (newVault == address(0)) revert ZeroAddress();
    vault = newVault;
    emit VaultUpdated(address(0), newVault);
  }

  function setDistributor(address newDistributor) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (distributor != address(0)) revert ModuleAlreadyInitialized();
    if (newDistributor == address(0)) revert ZeroAddress();
    distributor = newDistributor;
    emit DistributorUpdated(address(0), newDistributor);
  }

  function depositRewardFunds(uint256 amount) external nonReentrant whenNotPaused {
    if (amount == 0) revert ZeroAmount();
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    emit RewardReserveFunded(msg.sender, amount, IERC20(token).balanceOf(address(this)));
  }

  function disburseReward(
    address recipient,
    uint256 amount
  ) external onlyDistributor nonReentrant whenNotPaused {
    if (recipient == address(0)) revert ZeroAddress();
    if (amount == 0) revert ZeroAmount();
    uint256 available = IERC20(token).balanceOf(address(this));
    if (amount > available) revert InsufficientReserveBalance(amount, available);
    IERC20(token).safeTransfer(recipient, amount);
    emit RewardDisbursed(recipient, amount, available - amount);
  }

  function transferToVault(
    address targetVault,
    uint256 amount
  ) external onlyDistributor nonReentrant whenNotPaused {
    if (targetVault == address(0)) revert ZeroAddress();
    if (amount == 0) revert ZeroAmount();
    uint256 available = IERC20(token).balanceOf(address(this));
    if (amount > available) revert InsufficientReserveBalance(amount, available);
    IERC20(token).safeTransfer(targetVault, amount);
    emit RewardTransferredToVault(targetVault, amount, available - amount);
  }

  function getAvailableReserve() external view returns (uint256) {
    if (vault != address(0)) {
      return IUVBEStakingVault(vault).getAvailableProtocolCapital();
    }
    return IERC20(token).balanceOf(address(this));
  }
}
