// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title CustodyVault
 * @notice Passive collateral vault for UnifyVault Protocol
 * @dev Safeguards COLLATERAL assets without containing protocol economics or mint/burn capabilities
 */
contract CustodyVault is AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  struct AssetConfig {
    uint8 decimals;
    bool enabled;
  }

  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
  bytes32 public constant CONTROLLER_ROLE = keccak256('CONTROLLER_ROLE');

  mapping(address => AssetConfig) private _assets;

  // Events
  event AssetRegistered(address indexed asset, uint8 decimals, address indexed caller);
  event AssetEnabled(address indexed asset, address indexed caller);
  event AssetDisabled(address indexed asset, address indexed caller);
  event AssetRemoved(address indexed asset, address indexed caller);

  event DepositExecuted(
    address indexed asset,
    address indexed from,
    uint256 amount,
    address indexed caller
  );
  event WithdrawalExecuted(
    address indexed asset,
    address indexed to,
    uint256 amount,
    address indexed caller
  );

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
    _grantRole(GUARDIAN_ROLE, msg.sender);
    _grantRole(CONTROLLER_ROLE, msg.sender);
  }

  // --- Deposit & Withdraw Flow ---

  /**
   * @notice Custodies deposit from Controller address
   */
  function deposit(
    address asset,
    address from,
    uint256 amount
  ) external nonReentrant whenNotPaused onlyRole(CONTROLLER_ROLE) {
    if (asset == address(0) || from == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (!_assets[asset].enabled) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (amount == 0) {
      revert Errors.MathCalculationOverflow();
    }

    IERC20(asset).safeTransferFrom(from, address(this), amount);

    emit DepositExecuted(asset, from, amount, msg.sender);
  }

  /**
   * @notice Transfers custody back to Controller destination
   */
  function withdraw(
    address asset,
    address to,
    uint256 amount
  ) external nonReentrant whenNotPaused onlyRole(CONTROLLER_ROLE) {
    if (asset == address(0) || to == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (!_assets[asset].enabled) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (amount == 0) {
      revert Errors.MathCalculationOverflow();
    }

    uint256 vaultBal = IERC20(asset).balanceOf(address(this));
    if (vaultBal < amount) {
      revert Errors.InsufficientReserves(asset, amount, vaultBal);
    }

    IERC20(asset).safeTransfer(to, amount);

    emit WithdrawalExecuted(asset, to, amount, msg.sender);
  }

  // --- Governance Actions ---

  /**
   * @notice Registers a new collateral asset in the registry
   */
  function registerAsset(
    address asset,
    uint8 decimals
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) {
      revert Errors.ZeroAddressDetected();
    }
    if (decimals == 0) {
      revert Errors.MathCalculationOverflow();
    }
    if (_assets[asset].decimals != 0) {
      revert Errors.EntryAlreadyExists(bytes32(uint256(uint160(asset))));
    }

    _assets[asset] = AssetConfig({ decimals: decimals, enabled: true });

    emit AssetRegistered(asset, decimals, msg.sender);
    emit AssetEnabled(asset, msg.sender);
  }

  /**
   * @notice Disables asset from accepting deposits or withdrawals
   */
  function disableAsset(address asset) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AssetConfig storage config = _assets[asset];
    if (config.decimals == 0) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (!config.enabled) {
      revert Errors.IdenticalAddressSubmitted();
    }
    config.enabled = false;

    emit AssetDisabled(asset, msg.sender);
  }

  /**
   * @notice Re-enables a disabled asset configuration
   */
  function enableAsset(address asset) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AssetConfig storage config = _assets[asset];
    if (config.decimals == 0) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (config.enabled) {
      revert Errors.IdenticalAddressSubmitted();
    }
    config.enabled = true;

    emit AssetEnabled(asset, msg.sender);
  }

  /**
   * @notice Removes an asset from the registry completely
   */
  function removeAsset(address asset) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AssetConfig memory config = _assets[asset];
    if (config.decimals == 0) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }

    delete _assets[asset];

    emit AssetRemoved(asset, msg.sender);
  }

  // --- Guardian Actions ---

  /**
   * @notice Pauses vault operations
   */
  function pause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses vault operations
   */
  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }

  // --- View Functions ---

  /**
   * @notice Returns the actual ERC20 token balance custody balance (O(1))
   */
  function balance(address asset) public view returns (uint256) {
    if (!_assets[asset].enabled) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    return IERC20(asset).balanceOf(address(this));
  }

  /**
   * @notice Returns the token balance without enforcing enable validations (helper)
   */
  function totalAssetBalance(address asset) external view returns (uint256) {
    return IERC20(asset).balanceOf(address(this));
  }

  /**
   * @notice Validates if an asset is active and enabled
   */
  function isSupported(address asset) external view returns (bool) {
    return _assets[asset].enabled;
  }

  /**
   * @notice Returns decimals and enabling status
   */
  function assetConfig(address asset) external view returns (AssetConfig memory) {
    AssetConfig memory config = _assets[asset];
    if (config.decimals == 0) {
      revert Errors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    return config;
  }
}
