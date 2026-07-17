// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { Errors as ProtocolErrors } from '../errors/Errors.sol';
import '../libraries/AccessRoles.sol';
import '../libraries/FeeLib.sol';
import '../libraries/ShareLib.sol';
import '../interfaces/IOracle.sol';
import '../interfaces/IOracleProvider.sol';
import '../interfaces/ITreasury.sol';
import '../vault/CustodyVault.sol';
import '../token/UVBTCETHToken.sol';

/**
 * @title UnifyVaultController
 * @notice Protocol coordinator and workflow brain for UnifyVault
 * @dev Coordinates OracleManager, CustodyVault, UVBTCETHToken, and Treasury without storing state or balances.
 */
contract UnifyVaultController is AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  error NotImplemented();
  error NotAContract(address target);

  struct DepositQuote {
    bytes32 assetId;
    address asset;
    address receiver;
    uint256 depositAmount;
    uint256 rawPrice;
    uint256 normalizedPrice;
    uint256 sharesPreview;
    uint256 protocolFee;
    uint256 netDeposit;
    uint256 timestamp;
  }

  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
  bytes32 public constant BOT_ROLE = keccak256('BOT_ROLE');

  address private immutable _directory;
  address private immutable _oracle;
  address private immutable _vault;
  address private immutable _treasury;
  address private immutable _token;

  uint256 private _maxDeposit = type(uint256).max;

  // Events
  event DepositRequested(
    address indexed asset,
    address indexed receiver,
    uint256 amount,
    uint256 minSharesOut
  );
  event DepositCompleted(
    address indexed receiver,
    address indexed asset,
    uint256 grossDeposit,
    uint256 protocolFee,
    uint256 netDeposit,
    uint256 sharesMinted
  );
  event DepositCollateralReceived(
    address indexed asset,
    address indexed user,
    address indexed receiver,
    uint256 requestedAmount,
    uint256 receivedAmount,
    uint256 timestamp
  );
  event ProtocolFeeCollected(address indexed payer, address indexed asset, uint256 feeAmount);
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

  // --- Configurations ---

  /**
   * @notice Updates the maximum deposit limit
   */
  function setMaxDeposit(uint256 maxDeposit_) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _maxDeposit = maxDeposit_;
  }

  /**
   * @notice Returns the maximum deposit limit
   */
  function maxDeposit() external view returns (uint256) {
    return _maxDeposit;
  }

  // --- Public API ---

  /**
   * @notice Validates a deposit, transfers user collateral to CustodyVault/Treasury, mints shares, and returns the quote.
   */
  function deposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external nonReentrant whenNotPaused returns (DepositQuote memory) {
    DepositQuote memory quote = _validateDeposit(asset, amount, minSharesOut, receiver);

    uint256 totalAssets = CustodyVault(_vault).balance(asset);
    uint256 totalSupply = IERC20(_token).totalSupply();
    uint256 shares = ShareLib.calculateShares(quote.netDeposit, totalSupply, totalAssets);

    // Perform minimum shares verification (redundancy check matching validation)
    if (shares < minSharesOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
    }

    uint256 vaultBalanceBefore = IERC20(asset).balanceOf(_vault);
    uint256 treasuryBalanceBefore = IERC20(asset).balanceOf(_treasury);

    // Coordinates with CustodyVault to transfer net collateral
    CustodyVault(_vault).deposit(asset, msg.sender, quote.netDeposit);

    // Pull protocol fee transiently to the Controller
    IERC20(asset).safeTransferFrom(msg.sender, address(this), quote.protocolFee);

    // Approve Treasury to spend the fee
    IERC20(asset).approve(_treasury, quote.protocolFee);

    // Routing the fee to Treasury
    ITreasury(_treasury).collectFee(asset, quote.protocolFee);

    // Clear approval
    IERC20(asset).approve(_treasury, 0);

    uint256 vaultBalanceAfter = IERC20(asset).balanceOf(_vault);
    uint256 treasuryBalanceAfter = IERC20(asset).balanceOf(_treasury);

    uint256 vaultReceived = vaultBalanceAfter - vaultBalanceBefore;
    uint256 treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore;

    if (vaultReceived != quote.netDeposit) {
      revert ProtocolErrors.InsufficientReserves(asset, quote.netDeposit, vaultReceived);
    }
    if (treasuryReceived != quote.protocolFee) {
      revert ProtocolErrors.InsufficientReserves(asset, quote.protocolFee, treasuryReceived);
    }

    // Mint shares to receiver
    UVBTCETHToken(_token).mint(receiver, shares);

    emit DepositCollateralReceived(
      asset,
      msg.sender,
      receiver,
      amount,
      vaultReceived,
      block.timestamp
    );

    emit ProtocolFeeCollected(msg.sender, asset, treasuryReceived);

    emit DepositCompleted(receiver, asset, amount, quote.protocolFee, quote.netDeposit, shares);

    return quote;
  }

  function redeem(
    uint256 shares,
    uint256 minCollateralOut,
    address receiver
  ) external returns (uint256) {
    revert NotImplemented();
  }

  /**
   * @notice Read-only preview of shares minted for a deposit
   */
  function previewDeposit(address asset, uint256 amount) external view returns (uint256) {
    return _validateDeposit(asset, amount, 0, msg.sender).sharesPreview;
  }

  function previewRedeem(uint256 shares) external view returns (uint256) {
    revert NotImplemented();
  }

  /**
   * @notice Read-only estimation of shares minted for a deposit
   */
  function estimateMint(address asset, uint256 amount) external view returns (uint256) {
    return _validateDeposit(asset, amount, 0, msg.sender).sharesPreview;
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

  /**
   * @notice Generates a complete deposit quote including pricing, shares, and fee calculations.
   */
  function getDepositQuote(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external view returns (DepositQuote memory) {
    return _validateDeposit(asset, amount, minSharesOut, receiver);
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

  // --- Internal Validation Helpers ---

  /**
   * @notice Validates a deposit parameters, prices, and limits in exact order, returning the DepositQuote.
   */
  function _validateDeposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) internal view returns (DepositQuote memory quote) {
    // 1. Protocol paused check
    if (paused()) {
      revert EnforcedPause();
    }

    // 2. & 3. Asset supported & enabled check
    CustodyVault.AssetConfig memory config;
    try CustodyVault(_vault).assetConfig(asset) returns (CustodyVault.AssetConfig memory _config) {
      config = _config;
      if (!config.enabled) {
        revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
      }
    } catch {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }

    // 4. amount > 0
    if (amount == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }

    // 5. receiver != address(0)
    if (receiver == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }

    // 6. oracle healthy check
    bool healthy = IOracle(_oracle).isPriceFresh(asset);
    if (!healthy) {
      revert ProtocolErrors.OraclePriceStale(asset, 3600, 3600);
    }

    // 7. & 8. price available and price > 0 check
    uint256 normalizedPrice = IOracle(_oracle).getAssetPrice(asset);
    if (normalizedPrice == 0) {
      revert ProtocolErrors.OraclePriceNegative(asset, 0);
    }

    bytes32 assetId = bytes32(uint256(uint160(asset)));
    (address provider, ) = IOracle(_oracle).getFeedMetadata(asset);
    uint256 rawPrice = IOracleProvider(provider).getLatestRound(assetId).price;

    uint256 protocolFee = FeeLib.calculateDepositFee(amount);
    uint256 netDeposit = FeeLib.calculateNetDeposit(amount);

    // 10. preview shares calculation using ShareLib
    uint256 totalAssets = CustodyVault(_vault).balance(asset);
    uint256 supply = IERC20(_token).totalSupply();
    uint256 shares = ShareLib.calculateShares(netDeposit, supply, totalAssets);

    // 11. minimum shares check
    if (shares < minSharesOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
    }

    // 12. maximum deposit check
    if (amount > _maxDeposit) {
      revert ProtocolErrors.MathCalculationOverflow();
    }

    quote = DepositQuote({
      assetId: assetId,
      asset: asset,
      receiver: receiver,
      depositAmount: amount,
      rawPrice: rawPrice,
      normalizedPrice: normalizedPrice,
      sharesPreview: shares,
      protocolFee: protocolFee,
      netDeposit: netDeposit,
      timestamp: block.timestamp
    });
  }
}
