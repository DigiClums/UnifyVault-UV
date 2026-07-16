// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';

/**
 * @title Treasury
 * @notice Vault for safeguarding protocol-owned assets and fee revenue
 * @dev Separate from CustodyVault. Passive contract that only manages collections, storage, and releases.
 */
contract Treasury is AccessControl, ReentrancyGuard, Pausable {
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

  event FeeCollected(address indexed asset, address indexed from, uint256 amount);
  event TreasuryWithdrawal(
    address indexed asset,
    address indexed recipient,
    uint256 amount,
    address indexed caller
  );

  event NativeReceived(address indexed sender, uint256 amount);
  event NativeWithdrawn(address indexed recipient, uint256 amount, address indexed caller);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, msg.sender);
    _grantRole(GUARDIAN_ROLE, msg.sender);
    _grantRole(CONTROLLER_ROLE, msg.sender);
  }

  /**
   * @notice Receives native ETH
   */
  receive() external payable {
    emit NativeReceived(msg.sender, msg.value);
  }

  // --- Fee Collection Flow ---

  /**
   * @notice Pulls protocol fee from the Controller caller
   */
  function collectFee(
    address asset,
    uint256 amount
  ) external nonReentrant whenNotPaused onlyRole(CONTROLLER_ROLE) {
    if (asset == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (!_assets[asset].enabled) {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (amount == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }

    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

    emit FeeCollected(asset, msg.sender, amount);
  }

  // --- Withdraw Flow ---

  /**
   * @notice Releases custody of protocol-owned ERC20 asset
   */
  function withdraw(
    address asset,
    address recipient,
    uint256 amount
  ) external nonReentrant whenNotPaused onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0) || recipient == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (!_assets[asset].enabled) {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (amount == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }

    uint256 treasuryBal = IERC20(asset).balanceOf(address(this));
    if (treasuryBal < amount) {
      revert ProtocolErrors.InsufficientReserves(asset, amount, treasuryBal);
    }

    IERC20(asset).safeTransfer(recipient, amount);

    emit TreasuryWithdrawal(asset, recipient, amount, msg.sender);
  }

  /**
   * @notice Releases native ETH held in the contract
   */
  function withdrawNative(
    address payable recipient,
    uint256 amount
  ) external nonReentrant whenNotPaused onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (recipient == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (amount == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }

    uint256 nativeBal = address(this).balance;
    if (nativeBal < amount) {
      revert ProtocolErrors.InsufficientReserves(address(0), amount, nativeBal);
    }

    Address.sendValue(recipient, amount);

    emit NativeWithdrawn(recipient, amount, msg.sender);
  }

  // --- Governance Configurations ---

  /**
   * @notice Registers a new fee asset in the registry
   */
  function registerAsset(
    address asset,
    uint8 decimals
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (asset == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }
    if (decimals == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }
    if (_assets[asset].decimals != 0) {
      revert ProtocolErrors.EntryAlreadyExists(bytes32(uint256(uint160(asset))));
    }

    _assets[asset] = AssetConfig({ decimals: decimals, enabled: true });

    emit AssetRegistered(asset, decimals, msg.sender);
    emit AssetEnabled(asset, msg.sender);
  }

  /**
   * @notice Disables asset from accepting fees or withdrawals
   */
  function disableAsset(address asset) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AssetConfig storage config = _assets[asset];
    if (config.decimals == 0) {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (!config.enabled) {
      revert ProtocolErrors.IdenticalAddressSubmitted();
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
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    if (config.enabled) {
      revert ProtocolErrors.IdenticalAddressSubmitted();
    }
    config.enabled = true;

    emit AssetEnabled(asset, msg.sender);
  }

  /**
   * @notice Removes an asset configuration from the registry
   */
  function removeAsset(address asset) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    AssetConfig memory config = _assets[asset];
    if (config.decimals == 0) {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }

    delete _assets[asset];

    emit AssetRemoved(asset, msg.sender);
  }

  // --- Guardian Actions ---

  /**
   * @notice Pauses fee actions and withdrawals
   */
  function pause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
  }

  /**
   * @notice Unpauses fee actions and withdrawals
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
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
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
   * @notice Returns the native ETH balance
   */
  function nativeBalance() external view returns (uint256) {
    return address(this).balance;
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
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }
    return config;
  }
}
