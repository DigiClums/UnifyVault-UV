// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UnifyVaultController
 * @notice Protocol coordinator and workflow brain for UnifyVault
 * @dev Coordinates OracleManager, CustodyVault, UVBTCETHToken, and Treasury without storing state or balances.
 */
contract UnifyVaultController is AccessControl, ReentrancyGuard, Pausable {
  error NotImplemented();
  error NotAContract(address target);

  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
  bytes32 public constant BOT_ROLE = keccak256('BOT_ROLE');

  address private immutable _directory;
  address private immutable _oracle;
  address private immutable _vault;
  address private immutable _treasury;
  address private immutable _token;

  // Events
  event DepositRequested(
    address indexed asset,
    address indexed receiver,
    uint256 amount,
    uint256 minSharesOut
  );
  event DepositCompleted(
    address indexed asset,
    address indexed receiver,
    uint256 amount,
    uint256 sharesMinted
  );
  event RedeemRequested(address indexed receiver, uint256 shares, uint256 minCollateralOut);
  event RedeemCompleted(address indexed receiver, uint256 shares, uint256 collateralReturned);
  event FeeCollected(address indexed asset, uint256 amount);
  event EmergencyPaused(address indexed caller);
  event EmergencyResumed(address indexed caller);

  constructor(
    address directory_,
    address oracle_,
    address vault_,
    address treasury_,
    address token_
  ) {
    if (
      directory_ == address(0) ||
      oracle_ == address(0) ||
      vault_ == address(0) ||
      treasury_ == address(0) ||
      token_ == address(0)
    ) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (directory_.code.length == 0) revert NotAContract(directory_);
    if (oracle_.code.length == 0) revert NotAContract(oracle_);
    if (vault_.code.length == 0) revert NotAContract(vault_);
    if (treasury_.code.length == 0) revert NotAContract(treasury_);
    if (token_.code.length == 0) revert NotAContract(token_);

    _directory = directory_;
    _oracle = oracle_;
    _vault = vault_;
    _treasury = treasury_;
    _token = token_;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
    _grantRole(GUARDIAN_ROLE, msg.sender);
    _grantRole(BOT_ROLE, msg.sender);
  }

  // --- Public API Skeleton ---

  function deposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external returns (uint256) {
    revert NotImplemented();
  }

  function redeem(
    uint256 shares,
    uint256 minCollateralOut,
    address receiver
  ) external returns (uint256) {
    revert NotImplemented();
  }

  function previewDeposit(address asset, uint256 amount) external view returns (uint256) {
    revert NotImplemented();
  }

  function previewRedeem(uint256 shares) external view returns (uint256) {
    revert NotImplemented();
  }

  function estimateMint(address asset, uint256 amount) external view returns (uint256) {
    revert NotImplemented();
  }

  function estimateRedemption(uint256 shares) external view returns (uint256) {
    revert NotImplemented();
  }

  function collectProtocolFee(address asset, uint256 amount) external {
    revert NotImplemented();
  }

  function rebalance() external {
    revert NotImplemented();
  }

  // --- Pausing Actions ---

  function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
    emit EmergencyPaused(msg.sender);
  }

  function resume() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
    emit EmergencyResumed(msg.sender);
  }

  // --- View Functions ---

  function directory() external view returns (address) {
    return _directory;
  }

  function oracle() external view returns (address) {
    return _oracle;
  }

  function vault() external view returns (address) {
    return _vault;
  }

  function treasury() external view returns (address) {
    return _treasury;
  }

  function token() external view returns (address) {
    return _token;
  }

  // --- Internal Helper Stubs ---

  function _validateDeposit() private pure {
    revert NotImplemented();
  }

  function _validateRedeem() private pure {
    revert NotImplemented();
  }

  function _fetchOraclePrice() private pure {
    revert NotImplemented();
  }

  function _moveCollateral() private pure {
    revert NotImplemented();
  }

  function _mintShares() private pure {
    revert NotImplemented();
  }

  function _burnShares() private pure {
    revert NotImplemented();
  }

  function _routeFees() private pure {
    revert NotImplemented();
  }
}
