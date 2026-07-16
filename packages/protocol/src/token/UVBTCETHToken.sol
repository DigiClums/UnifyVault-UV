// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title UVBTCETHToken
 * @notice Index ownership token representing shares of UnifyVault's BTC-ETH vault
 * @dev Inherits ERC20, ERC20Permit, AccessControl, Pausable. Managed by Controller, Governance, and Guardian roles.
 */
contract UVBTCETHToken is ERC20, ERC20Permit, AccessControl, Pausable {
  bytes32 public constant GOVERNANCE_ROLE = AccessRoles.GOVERNANCE_ROLE;
  bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');
  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');

  error InvalidAmount();

  constructor()
    ERC20('UnifyVault BTC ETH Index', 'UVBTCETH')
    ERC20Permit('UnifyVault BTC ETH Index')
  {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(GOVERNANCE_ROLE, msg.sender);
    _grantRole(GUARDIAN_ROLE, msg.sender);
    _grantRole(CONTROLLER_ROLE, msg.sender);
  }

  /**
   * @notice Mints new shares to a recipient address
   * @dev Restrict to CONTROLLER_ROLE, not paused
   * @param to The recipient address
   * @param amount The number of tokens to mint
   */
  function mint(address to, uint256 amount) external onlyRole(CONTROLLER_ROLE) {
    if (to == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (amount == 0) {
      revert InvalidAmount();
    }
    _mint(to, amount);
  }

  /**
   * @notice Burns existing shares from an address
   * @dev Restrict to CONTROLLER_ROLE, not paused
   * @param from The address whose tokens will be burned
   * @param amount The number of tokens to burn
   */
  function burn(address from, uint256 amount) external onlyRole(CONTROLLER_ROLE) {
    if (from == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (amount == 0) {
      revert InvalidAmount();
    }
    _burn(from, amount);
  }

  /**
   * @notice Pauses transfers, mints, and burns
   * @dev Restrict to GUARDIAN_ROLE
   */
  function pause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses transfers, mints, and burns
   * @dev Restrict to GOVERNANCE_ROLE
   */
  function unpause() external onlyRole(GOVERNANCE_ROLE) {
    _unpause();
  }

  // --- Internal Hooks ---

  /**
   * @dev Hook that is called before any transfer of tokens (including minting and burning)
   * @dev Intercepts transfers whenPaused
   */
  function _update(address from, address to, uint256 value) internal override(ERC20) whenNotPaused {
    super._update(from, to, value);
  }
}
