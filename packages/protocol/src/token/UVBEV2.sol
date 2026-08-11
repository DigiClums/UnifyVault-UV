// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../interfaces/IToken.sol';
import '../interfaces/ICostBasisManagerV2.sol';

/**
 * @title UVBEV2
 * @notice Index ownership token V2 representing shares of UnifyVault's BTC-ETH vault
 * @dev Inherits ERC20, ERC20Permit, AccessControl, Pausable.
 * Enforces locked pre-transfer cost basis updates via CostBasisManagerV2.
 */
contract UVBEV2 is ERC20, ERC20Permit, AccessControl, Pausable, IToken {
  bytes32 public constant GOVERNANCE_ROLE = AccessRoles.GOVERNANCE_ROLE;
  bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');
  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');

  error InvalidAmount();

  ICostBasisManagerV2 public costBasisManager;

  event CostBasisManagerUpdated(address indexed oldCBM, address indexed newCBM);

  constructor(
    address admin
  ) ERC20('UnifyVault BTC-ETH V2', 'UVBEV2') ERC20Permit('UnifyVault BTC-ETH V2') {
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(GOVERNANCE_ROLE, admin);
    _grantRole(GUARDIAN_ROLE, admin);
    _grantRole(CONTROLLER_ROLE, admin);
  }

  /**
   * @notice Configures or updates the CostBasisManagerV2 module
   */
  function setCostBasisManager(address newCBM) external onlyRole(GOVERNANCE_ROLE) {
    address oldCBM = address(costBasisManager);
    costBasisManager = ICostBasisManagerV2(newCBM);
    emit CostBasisManagerUpdated(oldCBM, newCBM);
  }

  /**
   * @notice Mints new shares to a recipient address
   * @param to The recipient address
   * @param amount The number of tokens to mint
   */
  function mint(
    address to,
    uint256 amount
  ) external override onlyRole(CONTROLLER_ROLE) whenNotPaused {
    if (to == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (amount == 0) {
      revert InvalidAmount();
    }
    _mint(to, amount);
  }

  /**
   * @notice Burns existing shares from an address
   * @param from The address whose tokens will be burned
   * @param amount The number of tokens to burn
   */
  function burn(
    address from,
    uint256 amount
  ) external override onlyRole(CONTROLLER_ROLE) whenNotPaused {
    if (from == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (amount == 0) {
      revert InvalidAmount();
    }
    _burn(from, amount);
  }

  /**
   * @notice Returns 18 decimal places for index share token
   */
  function decimals() public pure override returns (uint8) {
    return 18;
  }

  /**
   * @notice Pauses transfers, mints, and burns
   */
  function pause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses transfers, mints, and burns
   */
  function unpause() external onlyRole(GOVERNANCE_ROLE) {
    _unpause();
  }

  // --- Internal Hooks ---

  /**
   * @dev Hook that is called before any transfer of tokens (including minting and burning)
   * LOCKED ARCHITECTURE ORDER:
   * 1. Read senderBalanceBefore BEFORE super._update().
   * 2. Call CostBasisManagerV2 accounting BEFORE super._update().
   * 3. Only after accounting succeeds, call super._update().
   * 4. If accounting reverts, token movement MUST revert.
   */
  function _update(address from, address to, uint256 value) internal override(ERC20) whenNotPaused {
    uint256 senderBalanceBefore = (from != address(0)) ? balanceOf(from) : 0;

    if (address(costBasisManager) != address(0)) {
      costBasisManager.onTokenTransfer(from, to, value, senderBalanceBefore);
    }

    super._update(from, to, value);
  }
}
