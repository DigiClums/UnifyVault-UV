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
import '../interfaces/IProtocolDirectory.sol';
import '../interfaces/IPortfolioManager.sol';
import '../interfaces/IStrategyManager.sol';
import '../interfaces/ISwapAdapter.sol';
import '../interfaces/IFeeManager.sol';
import '../interfaces/ICostBasisManager.sol';
import '../constants/ModuleIds.sol';
import '../vault/CustodyVault.sol';
import '../token/UVBTCETHToken.sol';

/**
 * @title UnifyVaultController
 * @notice Central orchestrator and live execution engine for UnifyVault V2
 * @dev Coordinates StrategyManager, PortfolioManager, SwapAdapter, CustodyVault, Treasury,
 * OracleManager, and UVBTCETHToken.
 * Enforces production rate limits, SafeERC20 transfers, and security monitoring events.
 */
contract UnifyVaultController is AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  error NotImplemented();
  error NotAContract(address target);
  error DeadlineExpired(uint256 deadline, uint256 timestamp);

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

  struct RedeemQuote {
    address asset;
    address receiver;
    uint256 shares;
    uint256 grossCollateral;
    uint256 grossValueUSD;
    uint256 protocolFee;
    uint256 netPayout;
    uint256 timestamp;
  }

  struct FinalizeRedeemParams {
    address asset;
    address receiver;
    uint256 shares;
    uint256 grossPayoutCollateral;
    uint256 minAssetsOut;
  }

  struct RedeemLogParams {
    address owner;
    address receiver;
    address asset;
    uint256 shares;
    uint256 grossOut;
    uint256 protocolFee;
    uint256 netOut;
    uint256 navAfter;
  }

  bytes32 public constant GUARDIAN_ROLE = keccak256('GUARDIAN_ROLE');
  bytes32 public constant BOT_ROLE = keccak256('BOT_ROLE');

  address private immutable _directory;
  address private immutable _oracle;
  address private immutable _vault;
  address private immutable _treasury;
  address private immutable _token;

  // Rate Limits Configuration
  uint256 private _maxDepositPerTx = type(uint256).max;
  uint256 private _maxRedeemPerTx = type(uint256).max;
  uint256 private _dailyDepositCap = type(uint256).max;
  uint256 private _dailyRedeemCap = type(uint256).max;

  uint256 private _currentDepositDay;
  uint256 private _dailyDepositTotal;
  uint256 private _currentRedeemDay;
  uint256 private _dailyRedeemTotal;

  // Monitoring Thresholds
  uint256 private _largeDepositThreshold = 10_000 * 1e6; // $10,000 default
  uint256 private _largeRedeemThreshold = 10_000 * 1e18; // 10,000 shares default

  uint256 private _swapSlippageBps = 100; // 1% default

  uint256 public constant BPS_DENOMINATOR = 10000;
  uint256 public constant DEAD_SHARES = 1000;

  event SwapSlippageUpdated(uint256 oldBps, uint256 newBps, address indexed caller);
  event MaxDepositUpdated(uint256 oldMax, uint256 newMax, address indexed caller);
  event DepositLimitsUpdated(uint256 maxPerTx, uint256 dailyCap, address indexed caller);
  event RedeemLimitsUpdated(uint256 maxPerTx, uint256 dailyCap, address indexed caller);
  event MonitoringThresholdsUpdated(
    uint256 largeDepositThreshold,
    uint256 largeRedeemThreshold,
    address indexed caller
  );

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
  event RedeemCompleted(
    address indexed owner,
    address indexed receiver,
    address indexed asset,
    uint256 sharesBurned,
    uint256 grossAssets,
    uint256 protocolFee,
    uint256 netAssets
  );
  event FeeCollected(address indexed asset, uint256 amount);
  event EmergencyPaused(address indexed caller);
  event EmergencyResumed(address indexed caller);

  // Task 5 Monitoring Events
  event LargeDeposit(address indexed user, address indexed asset, uint256 amount, uint256 shares);
  event LargeRedeem(address indexed user, address indexed asset, uint256 shares, uint256 amount);
  event EmergencyPause(address indexed actor, string reason);
  event EmergencyResume(address indexed actor);

  // V2 Live Execution Events
  event DepositExecuted(
    address indexed user,
    uint256 depositAmount,
    uint256 fee,
    address[] targetAssets,
    uint256[] assetsBought,
    uint256 sharesMinted,
    uint256 navAfter
  );

  event RedeemExecuted(
    address indexed user,
    uint256 sharesBurned,
    address[] targetAssets,
    uint256[] assetsSold,
    uint256 fee,
    uint256 usdcReturned,
    uint256 navAfter
  );

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

  // --- Rate Limit Configurations ---

  function setMaxDeposit(uint256 maxDeposit_) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    uint256 old = _maxDepositPerTx;
    _maxDepositPerTx = maxDeposit_;
    emit MaxDepositUpdated(old, maxDeposit_, msg.sender);
  }

  function maxDeposit() external view returns (uint256) {
    return _maxDepositPerTx;
  }

  function setDepositLimits(
    uint256 maxPerTx,
    uint256 dailyCap
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _maxDepositPerTx = maxPerTx;
    _dailyDepositCap = dailyCap;
    emit DepositLimitsUpdated(maxPerTx, dailyCap, msg.sender);
  }

  function setRedeemLimits(
    uint256 maxPerTx,
    uint256 dailyCap
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _maxRedeemPerTx = maxPerTx;
    _dailyRedeemCap = dailyCap;
    emit RedeemLimitsUpdated(maxPerTx, dailyCap, msg.sender);
  }

  function setMonitoringThresholds(
    uint256 largeDepositThreshold_,
    uint256 largeRedeemThreshold_
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _largeDepositThreshold = largeDepositThreshold_;
    _largeRedeemThreshold = largeRedeemThreshold_;
    emit MonitoringThresholdsUpdated(largeDepositThreshold_, largeRedeemThreshold_, msg.sender);
  }

  function maxDepositPerTx() external view returns (uint256) {
    return _maxDepositPerTx;
  }

  function maxRedeemPerTx() external view returns (uint256) {
    return _maxRedeemPerTx;
  }

  function dailyDepositCap() external view returns (uint256) {
    return _dailyDepositCap;
  }

  function dailyRedeemCap() external view returns (uint256) {
    return _dailyRedeemCap;
  }

  function dailyDepositTotal() external view returns (uint256) {
    if (block.timestamp / 1 days > _currentDepositDay) return 0;
    return _dailyDepositTotal;
  }

  function dailyRedeemTotal() external view returns (uint256) {
    if (block.timestamp / 1 days > _currentRedeemDay) return 0;
    return _dailyRedeemTotal;
  }

  function largeDepositThreshold() external view returns (uint256) {
    return _largeDepositThreshold;
  }

  function largeRedeemThreshold() external view returns (uint256) {
    return _largeRedeemThreshold;
  }

  function setSwapSlippageBps(uint256 slippageBps_) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (slippageBps_ > BPS_DENOMINATOR) revert ProtocolErrors.MathCalculationOverflow();
    uint256 old = _swapSlippageBps;
    _swapSlippageBps = slippageBps_;
    emit SwapSlippageUpdated(old, slippageBps_, msg.sender);
  }

  function swapSlippageBps() external view returns (uint256) {
    return _swapSlippageBps;
  }

  // --- Module Directory View Functions ---

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

  function portfolioManager() public view returns (address) {
    try IProtocolDirectory(_directory).getAddress(ModuleIds.PORTFOLIO_MANAGER) returns (
      address pm
    ) {
      return pm;
    } catch {
      return address(0);
    }
  }

  function strategyManager() public view returns (address) {
    try IProtocolDirectory(_directory).getAddress(ModuleIds.STRATEGY_MANAGER) returns (address sm) {
      return sm;
    } catch {
      return address(0);
    }
  }

  function swapAdapter() public view returns (address) {
    try IProtocolDirectory(_directory).getAddress(ModuleIds.SWAP_ADAPTER) returns (address sa) {
      return sa;
    } catch {
      return address(0);
    }
  }

  function feeManager() public view returns (address) {
    try IProtocolDirectory(_directory).getAddress(ModuleIds.FEE_MANAGER) returns (address fm) {
      return fm;
    } catch {
      return address(0);
    }
  }

  function costBasisManager() public view returns (address) {
    try IProtocolDirectory(_directory).getAddress(ModuleIds.COST_BASIS_MANAGER) returns (
      address cbm
    ) {
      return cbm;
    } catch {
      return address(0);
    }
  }

  function performanceManager() public view returns (address) {
    try IProtocolDirectory(_directory).getAddress(ModuleIds.PERFORMANCE_MANAGER) returns (
      address pm
    ) {
      return pm;
    } catch {
      return address(0);
    }
  }

  function getDepositFeeBps() public view returns (uint256) {
    address fm = feeManager();
    if (fm != address(0)) {
      try IFeeManager(fm).depositFeeBps() returns (uint256 feeBps) {
        return feeBps;
      } catch {
        revert ProtocolErrors.FeeManagerNotAvailable();
      }
    }
    return FeeLib.DEPOSIT_FEE_BPS;
  }

  function getRedeemFeeBps() public view returns (uint256) {
    address fm = feeManager();
    if (fm != address(0)) {
      try IFeeManager(fm).redeemFeeBps() returns (uint256 feeBps) {
        return feeBps;
      } catch {
        revert ProtocolErrors.FeeManagerNotAvailable();
      }
    }
    return FeeLib.REDEEM_FEE_BPS;
  }

  // --- Orchestrated Live Deposit & Redeem Workflows ---

  /**
   * @notice Executes live deposit flow: validates inputs & rate limits, collects USDC collateral,
   * routes fee to Treasury, executes atomic DEX swaps via SwapAdapter to buy target strategy assets,
   * custodies purchased assets in CustodyVault, recalculates NAV, and mints UVBTCETH index shares.
   */
  function deposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external nonReentrant whenNotPaused returns (DepositQuote memory) {
    // 1. Rate Limits Validation
    if (amount > _maxDepositPerTx) {
      revert ProtocolErrors.DepositExceedsTxLimit(amount, _maxDepositPerTx);
    }
    uint256 today = block.timestamp / 1 days;
    if (today > _currentDepositDay) {
      _currentDepositDay = today;
      _dailyDepositTotal = 0;
    }
    if (_dailyDepositTotal + amount > _dailyDepositCap) {
      revert ProtocolErrors.DailyDepositCapExceeded(_dailyDepositTotal + amount, _dailyDepositCap);
    }
    _dailyDepositTotal += amount;

    DepositQuote memory quote = _validateDeposit(asset, amount, minSharesOut, receiver);

    (
      uint256 totalSharesBefore,
      uint256 totalPortfolioValueBefore,
      uint256 totalAssetsBefore
    ) = _getDepositStateBefore(asset);

    // Pull the full deposit amount from the user in a single transferFrom
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

    // 1. Route protocol deposit fee to Treasury
    _collectDepositFee(asset, quote.protocolFee);

    // 2. Determine execution path & calculate realized USD value post-swap
    (
      address[] memory targetAssets,
      uint256[] memory assetsBought,
      uint256 realizedDepositUSD
    ) = _executeSwapsAndCalculateRealizedUSD(asset, quote.netDeposit);

    // Validate realized USD output against slippage threshold before minting shares
    uint256 expectedDepositUSD =
      (quote.netDeposit * quote.normalizedPrice) /
        (10 ** CustodyVault(_vault).assetConfig(asset).decimals);
    uint256 minAllowedUSD = (expectedDepositUSD * (10000 - _swapSlippageBps)) / 10000;
    if (realizedDepositUSD < minAllowedUSD) {
      revert ProtocolErrors.InsufficientSwapOutput(
        expectedDepositUSD,
        realizedDepositUSD,
        minAllowedUSD
      );
    }

    // 3. Realized Value Accounting: calculate final shares from post-swap realized assets
    (uint256 shares, uint256 navAfter) = _calculateAndMintDepositShares(
      asset,
      receiver,
      minSharesOut,
      quote.netDeposit,
      totalSharesBefore,
      totalPortfolioValueBefore,
      totalAssetsBefore,
      realizedDepositUSD
    );

    quote.sharesPreview = shares;
    _finalizeDeposit(quote, shares, navAfter, targetAssets, assetsBought, realizedDepositUSD);

    return quote;
  }

  function _executeSwapsAndCalculateRealizedUSD(
    address asset,
    uint256 netDeposit
  )
    internal
    returns (
      address[] memory targetAssets,
      uint256[] memory assetsBought,
      uint256 realizedDepositUSD
    )
  {
    address v = _vault;
    address sm = strategyManager();
    address sa = swapAdapter();

    if (sm != address(0) && sa != address(0)) {
      (targetAssets, assetsBought, realizedDepositUSD) = _executeMultiAssetSwaps(
        sm,
        v,
        asset,
        netDeposit
      );
    } else {
      (targetAssets, assetsBought, realizedDepositUSD) = _depositSingleAssetFallback(
        v,
        asset,
        netDeposit
      );
    }
  }

  function _executeMultiAssetSwaps(
    address sm,
    address v,
    address asset,
    uint256 netDeposit
  )
    private
    returns (
      address[] memory targetAssets,
      uint256[] memory assetsBought,
      uint256 realizedDepositUSD
    )
  {
    uint256[] memory weightsBps;
    (targetAssets, weightsBps) = IStrategyManager(sm).getTargetWeights();
    uint256 len = targetAssets.length;
    assetsBought = new uint256[](len);

    uint256 allocatedSoFar = 0;
    for (uint256 i = 0; i < len; i++) {
      address targetToken = targetAssets[i];
      uint256 allocAmount =
        (i == len - 1) ? netDeposit - allocatedSoFar : (netDeposit * weightsBps[i]) / 10000;
      allocatedSoFar += allocAmount;

      if (allocAmount > 0) {
        (uint256 bought, uint256 valueUSD) = _swapAndDepositTargetAsset(
          asset,
          targetToken,
          allocAmount
        );
        assetsBought[i] = bought;
        realizedDepositUSD += valueUSD;
      }
    }

    realizedDepositUSD += _depositResidualAndCalculateUSD(v, asset);
  }

  function _depositResidualAndCalculateUSD(
    address v,
    address asset
  ) private returns (uint256 valueUSD) {
    uint256 residual = IERC20(asset).balanceOf(address(this));
    if (residual > 0 && CustodyVault(v).isSupported(asset)) {
      IERC20(asset).forceApprove(v, residual);
      CustodyVault(v).deposit(asset, address(this), residual);
      IERC20(asset).forceApprove(v, 0);

      uint256 residualPrice = IOracle(_oracle).getAssetPrice(asset);
      uint8 residualDecimals = CustodyVault(v).assetConfig(asset).decimals;
      valueUSD = (residual * residualPrice) / (10 ** residualDecimals);
    }
  }

  function _depositSingleAssetFallback(
    address v,
    address asset,
    uint256 netDeposit
  )
    private
    returns (
      address[] memory targetAssets,
      uint256[] memory assetsBought,
      uint256 realizedDepositUSD
    )
  {
    IERC20(asset).forceApprove(v, netDeposit);
    CustodyVault(v).deposit(asset, address(this), netDeposit);
    IERC20(asset).forceApprove(v, 0);

    targetAssets = new address[](1);
    targetAssets[0] = asset;
    assetsBought = new uint256[](1);
    assetsBought[0] = netDeposit;

    uint256 assetPrice = IOracle(_oracle).getAssetPrice(asset);
    uint8 assetDecimals = CustodyVault(v).assetConfig(asset).decimals;
    realizedDepositUSD = (netDeposit * assetPrice) / (10 ** assetDecimals);
  }

  function _swapAndDepositTargetAsset(
    address inputAsset,
    address targetToken,
    uint256 allocAmount
  ) internal returns (uint256 bought, uint256 valueUSD) {
    address v = _vault;
    address sa = swapAdapter();
    if (targetToken == inputAsset) {
      IERC20(inputAsset).forceApprove(v, allocAmount);
      CustodyVault(v).deposit(inputAsset, address(this), allocAmount);
      IERC20(inputAsset).forceApprove(v, 0);
      bought = allocAmount;
    } else {
      IERC20(inputAsset).forceApprove(sa, allocAmount);
      uint256 minOut = _computeMinAmountOut(inputAsset, targetToken, allocAmount);
      bought = ISwapAdapter(sa).swap(inputAsset, targetToken, allocAmount, minOut, address(this));
      IERC20(inputAsset).forceApprove(sa, 0);

      IERC20(targetToken).forceApprove(v, bought);
      CustodyVault(v).deposit(targetToken, address(this), bought);
      IERC20(targetToken).forceApprove(v, 0);
    }

    uint256 targetPrice = IOracle(_oracle).getAssetPrice(targetToken);
    uint8 targetDecimals = CustodyVault(v).assetConfig(targetToken).decimals;
    valueUSD = (bought * targetPrice) / (10 ** targetDecimals);
  }

  /**
   * @notice Executes live redemption flow: validates shares & rate limits, releases proportional multi-asset holdings
   * from CustodyVault, executes atomic DEX swaps via SwapAdapter back to payout USDC collateral,
   * routes fee to Treasury, burns UVBTCETH shares, recalculates NAV, and transfers USDC to receiver.
   */
  function redeem(
    address asset,
    uint256 shares,
    uint256 minAssetsOut,
    address receiver,
    uint256 deadline
  ) external nonReentrant whenNotPaused returns (uint256 netAssets) {
    if (block.timestamp > deadline) {
      revert DeadlineExpired(deadline, block.timestamp);
    }
    if (shares == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }
    if (receiver == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }

    // Rate Limits Validation for Redemption
    if (shares > _maxRedeemPerTx) {
      revert ProtocolErrors.RedeemExceedsTxLimit(shares, _maxRedeemPerTx);
    }
    uint256 today = block.timestamp / 1 days;
    if (today > _currentRedeemDay) {
      _currentRedeemDay = today;
      _dailyRedeemTotal = 0;
    }
    if (_dailyRedeemTotal + shares > _dailyRedeemCap) {
      revert ProtocolErrors.DailyRedeemCapExceeded(_dailyRedeemTotal + shares, _dailyRedeemCap);
    }
    _dailyRedeemTotal += shares;

    CustodyVault.AssetConfig memory config;
    try CustodyVault(_vault).assetConfig(asset) returns (CustodyVault.AssetConfig memory _config) {
      if (!_config.enabled) {
        revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
      }
      config = _config;
    } catch {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }

    address sm = strategyManager();
    address sa = swapAdapter();

    uint256 grossPayoutCollateral = 0;
    address[] memory targetAssets;
    uint256[] memory assetsSold;

    if (sm != address(0) && sa != address(0)) {
      (grossPayoutCollateral, targetAssets, assetsSold) = _executeRedemptionPayout(
        sm,
        sa,
        asset,
        shares
      );
    } else {
      grossPayoutCollateral = _executeLegacyRedemption(asset, shares, config.decimals);
    }

    return
      _finalizeRedemption(
        FinalizeRedeemParams({
          asset: asset,
          receiver: receiver,
          shares: shares,
          grossPayoutCollateral: grossPayoutCollateral,
          minAssetsOut: minAssetsOut
        }),
        targetAssets,
        assetsSold
      );
  }

  // --- Previews & Estimations ---

  function previewDeposit(address asset, uint256 amount) external view returns (uint256) {
    return _validateDeposit(asset, amount, 0, msg.sender).sharesPreview;
  }

  function previewRedeem(address asset, uint256 shares) public view returns (uint256) {
    uint256 redFeeBps = getRedeemFeeBps();
    uint256 netOut = 0;
    address pm = portfolioManager();
    if (pm != address(0)) {
      IPortfolioManager.RedeemPreview memory preview = IPortfolioManager(pm).previewRedeem(
        shares,
        asset
      );
      uint256 gross = preview.payoutAmount;
      netOut = gross - FeeLib.calculateRedeemFee(gross, redFeeBps);
    } else {
      CustodyVault.AssetConfig memory config;
      try CustodyVault(_vault).assetConfig(asset) returns (
        CustodyVault.AssetConfig memory _config
      ) {
        if (!_config.enabled) return 0;
        config = _config;
      } catch {
        return 0;
      }

      uint256 accountedAssets = CustodyVault(_vault).totalAssets(asset);
      uint256 totalSupply = IERC20(_token).totalSupply();
      uint256 grossAssets = ShareLib.sharesToAssets(
        shares,
        totalSupply,
        accountedAssets,
        config.decimals
      );
      netOut = grossAssets - FeeLib.calculateRedeemFee(grossAssets, redFeeBps);
    }

    return netOut;
  }

  function estimateMint(address asset, uint256 amount) external view returns (uint256) {
    return _validateDeposit(asset, amount, 0, msg.sender).sharesPreview;
  }

  function estimateRedemption(address asset, uint256 shares) external view returns (uint256) {
    return previewRedeem(asset, shares);
  }

  function collectProtocolFee(address, uint256) external pure {
    revert NotImplemented();
  }

  function rebalance() external pure {
    revert NotImplemented();
  }

  function getDepositQuote(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external view returns (DepositQuote memory) {
    return _validateDeposit(asset, amount, minSharesOut, receiver);
  }

  function getRedeemQuote(
    address asset,
    uint256 shares,
    address receiver
  ) public view returns (RedeemQuote memory quote) {
    uint256 netOut = previewRedeem(asset, shares);
    uint256 redFeeBps = getRedeemFeeBps();
    uint256 grossOut = redFeeBps < 10000 ? (netOut * 10000) / (10000 - redFeeBps) : netOut;
    uint256 fee = grossOut - netOut;

    uint256 price = IOracle(_oracle).getAssetPrice(asset);
    uint8 decimals = CustodyVault(_vault).assetConfig(asset).decimals;
    uint256 grossValueUSD = (grossOut * price) / (10 ** decimals);

    return
      RedeemQuote({
        asset: asset,
        receiver: receiver,
        shares: shares,
        grossCollateral: grossOut,
        grossValueUSD: grossValueUSD,
        protocolFee: fee,
        netPayout: netOut,
        timestamp: block.timestamp
      });
  }

  function getRedeemQuote(
    uint256 shares,
    address asset,
    address receiver
  ) external view returns (RedeemQuote memory quote) {
    return getRedeemQuote(asset, shares, receiver);
  }

  // --- Pausing Actions ---

  function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
    emit EmergencyPaused(msg.sender);
    emit EmergencyPause(msg.sender, 'Emergency pause triggered by Guardian');
  }

  function resume() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
    emit EmergencyResumed(msg.sender);
    emit EmergencyResume(msg.sender);
  }

  // --- Internal Validation Helpers ---

  /**
   * @dev Computes the minimum acceptable output amount for a swap leg based on
   * oracle prices and configured slippage tolerance.
   */
  function _computeMinAmountOut(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) internal view returns (uint256 minAmountOut) {
    uint256 priceIn = IOracle(_oracle).getAssetPrice(tokenIn);
    uint256 priceOut = IOracle(_oracle).getAssetPrice(tokenOut);
    if (priceIn == 0 || priceOut == 0) {
      revert ProtocolErrors.OraclePriceNegative(tokenIn, 0);
    }

    CustodyVault.AssetConfig memory cfgIn = CustodyVault(_vault).assetConfig(tokenIn);
    CustodyVault.AssetConfig memory cfgOut = CustodyVault(_vault).assetConfig(tokenOut);
    uint8 decimalsIn = cfgIn.decimals;
    uint8 decimalsOut = cfgOut.decimals;

    uint256 expectedOut =
      (amountIn * priceIn * (10 ** decimalsOut)) / (priceOut * (10 ** decimalsIn));

    uint256 slippage = _swapSlippageBps;
    if (slippage == 0) return 0;

    minAmountOut = (expectedOut * (BPS_DENOMINATOR - slippage)) / BPS_DENOMINATOR;
  }

  function _validateDeposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) internal view returns (DepositQuote memory quote) {
    if (paused()) {
      revert EnforcedPause();
    }

    CustodyVault.AssetConfig memory config;
    try CustodyVault(_vault).assetConfig(asset) returns (CustodyVault.AssetConfig memory _config) {
      config = _config;
      if (!config.enabled) {
        revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
      }
    } catch {
      revert ProtocolErrors.AssetNotSupported(bytes32(uint256(uint160(asset))));
    }

    if (amount == 0) {
      revert ProtocolErrors.MathCalculationOverflow();
    }

    if (receiver == address(0)) {
      revert ProtocolErrors.ZeroAddressDetected();
    }

    (bytes32 assetId, uint256 normalizedPrice, uint256 rawPrice) = _fetchOraclePrices(asset);

    uint256 depFeeBps = getDepositFeeBps();
    uint256 protocolFee = FeeLib.calculateDepositFee(amount, depFeeBps);
    uint256 netDeposit = FeeLib.calculateNetDeposit(amount, depFeeBps);

    uint256 shares = _previewShares(asset, netDeposit, config.decimals);

    if (shares < minSharesOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
    }

    if (amount > _maxDepositPerTx) {
      revert ProtocolErrors.DepositExceedsTxLimit(amount, _maxDepositPerTx);
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

  function _fetchOraclePrices(
    address asset
  ) private view returns (bytes32 assetId, uint256 normalizedPrice, uint256 rawPrice) {
    if (!IOracle(_oracle).isPriceFresh(asset)) {
      revert ProtocolErrors.OraclePriceStale(asset, 3600, 3600);
    }
    normalizedPrice = IOracle(_oracle).getAssetPrice(asset);
    if (normalizedPrice == 0) {
      revert ProtocolErrors.OraclePriceNegative(asset, 0);
    }
    assetId = bytes32(uint256(uint160(asset)));
    (address provider, ) = IOracle(_oracle).getFeedMetadata(asset);
    rawPrice = IOracleProvider(provider).getLatestRound(assetId).price;
  }

  function _previewShares(
    address asset,
    uint256 netDeposit,
    uint8 decimals
  ) private view returns (uint256 shares) {
    address pm = portfolioManager();
    if (pm != address(0)) {
      IPortfolioManager.DepositPreview memory preview = IPortfolioManager(pm).previewDeposit(
        asset,
        netDeposit
      );
      shares = preview.sharesToMint;
    } else {
      uint256 totalAssets = CustodyVault(_vault).totalAssets(asset);
      uint256 supply = IERC20(_token).totalSupply();
      shares = ShareLib.calculateShares(netDeposit, supply, totalAssets, decimals);
    }
  }

  function _collectDepositFee(address asset, uint256 protocolFee) private {
    if (protocolFee > 0) {
      uint256 treasuryBalanceBefore = IERC20(asset).balanceOf(_treasury);
      IERC20(asset).forceApprove(_treasury, protocolFee);
      ITreasury(_treasury).collectFee(asset, protocolFee);
      IERC20(asset).forceApprove(_treasury, 0);

      uint256 treasuryReceived = IERC20(asset).balanceOf(_treasury) - treasuryBalanceBefore;
      if (treasuryReceived != protocolFee) {
        revert ProtocolErrors.InsufficientReserves(asset, protocolFee, treasuryReceived);
      }
    }
  }

  function _finalizeDeposit(
    DepositQuote memory quote,
    uint256 shares,
    uint256 navAfter,
    address[] memory targetAssets,
    uint256[] memory assetsBought,
    uint256 realizedDepositUSD
  ) private {
    uint256 controllerBal = IERC20(quote.asset).balanceOf(address(this));
    if (controllerBal != 0) {
      revert ProtocolErrors.InsufficientReserves(quote.asset, 0, controllerBal);
    }

    if (quote.depositAmount >= _largeDepositThreshold) {
      emit LargeDeposit(msg.sender, quote.asset, quote.depositAmount, shares);
    }

    emit DepositCollateralReceived(
      quote.asset,
      msg.sender,
      quote.receiver,
      quote.depositAmount,
      quote.netDeposit,
      block.timestamp
    );
    emit ProtocolFeeCollected(msg.sender, quote.asset, quote.protocolFee);
    emit DepositCompleted(
      quote.receiver,
      quote.asset,
      quote.depositAmount,
      quote.protocolFee,
      quote.netDeposit,
      shares
    );
    address cbm = costBasisManager();
    if (cbm != address(0)) {
      // Use the exact post-swap realized USD value used to mint shares.
      // This keeps cost basis / CPS aligned with the actual underlying
      // assets acquired by the protocol.
      try
        ICostBasisManager(cbm).recordDeposit(quote.receiver, realizedDepositUSD, shares)
      {} catch {}
    }

    emit DepositExecuted(
      msg.sender,
      quote.depositAmount,
      quote.protocolFee,
      targetAssets,
      assetsBought,
      shares,
      navAfter
    );
  }

  function _getDepositStateBefore(
    address asset
  )
    private
    view
    returns (
      uint256 totalSharesBefore,
      uint256 totalPortfolioValueBefore,
      uint256 totalAssetsBefore
    )
  {
    totalSharesBefore = IERC20(_token).totalSupply();
    totalAssetsBefore = CustodyVault(_vault).totalAssets(asset);
    address pm = portfolioManager();
    if (pm != address(0)) {
      (totalPortfolioValueBefore, ) = IPortfolioManager(pm).calculateNAV();
    }
  }

  function _calculateAndMintDepositShares(
    address asset,
    address receiver,
    uint256 minSharesOut,
    uint256 netDeposit,
    uint256 totalSharesBefore,
    uint256 totalPortfolioValueBefore,
    uint256 totalAssetsBefore,
    uint256 realizedDepositUSD
  ) private returns (uint256 shares, uint256 navAfter) {
    address pm = portfolioManager();
    if (pm != address(0)) {
      if (
        totalSharesBefore == 0 || totalSharesBefore <= DEAD_SHARES || totalPortfolioValueBefore == 0
      ) {
        shares = realizedDepositUSD;
      } else {
        shares = (realizedDepositUSD * totalSharesBefore) / totalPortfolioValueBefore;
      }
    } else {
      uint8 decimals = CustodyVault(_vault).assetConfig(asset).decimals;
      shares = ShareLib.calculateShares(netDeposit, totalSharesBefore, totalAssetsBefore, decimals);
    }

    if (totalSharesBefore == 0) {
      if (shares <= DEAD_SHARES) {
        revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
      }
      UVBTCETHToken(_token).mint(address(0x000000000000000000000000000000000000dEaD), DEAD_SHARES);
      shares -= DEAD_SHARES;
    }

    if (shares < minSharesOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
    }

    navAfter = 1e18;
    if (pm != address(0)) {
      (, navAfter) = IPortfolioManager(pm).calculateNAV();
    }

    UVBTCETHToken(_token).mint(receiver, shares);
  }

  function _finalizeRedemption(
    FinalizeRedeemParams memory p,
    address[] memory targetAssets,
    uint256[] memory assetsSold
  ) private returns (uint256 netOut) {
    (uint256 grossOut, uint256 protocolFee, uint256 netAssets) = FeeLib.calculateRedemptionFee(
      p.grossPayoutCollateral,
      getRedeemFeeBps()
    );
    netOut = netAssets;

    if (netOut < p.minAssetsOut) {
      revert ProtocolErrors.SlippageLimitExceeded(p.minAssetsOut, netOut);
    }

    uint256 userSharesBefore = IERC20(_token).balanceOf(msg.sender);

    // 1. Burn shares from msg.sender
    UVBTCETHToken(_token).burn(msg.sender, p.shares);

    // 2. Route protocol redemption fee to Treasury
    if (protocolFee > 0) {
      IERC20(p.asset).forceApprove(_treasury, protocolFee);
      ITreasury(_treasury).collectFee(p.asset, protocolFee);
      IERC20(p.asset).forceApprove(_treasury, 0);
    }

    // 3. Transfer net collateral to receiver
    IERC20(p.asset).safeTransfer(p.receiver, netOut);

    _recordCostBasisRedeem(p.asset, msg.sender, userSharesBefore, p.shares, netOut);

    _postRedeemCleanup(msg.sender, p, grossOut, protocolFee, netOut, targetAssets, assetsSold);
  }

  function _postRedeemCleanup(
    address owner,
    FinalizeRedeemParams memory p,
    uint256 grossOut,
    uint256 protocolFee,
    uint256 netOut,
    address[] memory targetAssets,
    uint256[] memory assetsSold
  ) private {
    uint256 navAfter = 1e18;
    address pm = portfolioManager();
    if (pm != address(0)) {
      (, navAfter) = IPortfolioManager(pm).calculateNAV();
    }

    uint256 controllerBal = IERC20(p.asset).balanceOf(address(this));
    if (controllerBal != 0) {
      revert ProtocolErrors.InsufficientReserves(p.asset, 0, controllerBal);
    }

    if (p.shares >= _largeRedeemThreshold) {
      emit LargeRedeem(owner, p.asset, p.shares, netOut);
    }

    emit RedeemCompleted(owner, p.receiver, p.asset, p.shares, grossOut, protocolFee, netOut);
    emit RedeemExecuted(owner, p.shares, targetAssets, assetsSold, protocolFee, netOut, navAfter);
  }

  function _recordCostBasisRedeem(
    address asset,
    address user,
    uint256 userSharesBefore,
    uint256 shares,
    uint256 netOut
  ) private {
    address cbm = costBasisManager();
    if (cbm != address(0)) {
      uint256 payoutPrice = IOracle(_oracle).getAssetPrice(asset);
      uint8 payoutDecimals = CustodyVault(_vault).assetConfig(asset).decimals;
      uint256 payoutUSD = (netOut * payoutPrice) / (10 ** payoutDecimals);
      try ICostBasisManager(cbm).recordRedeem(user, userSharesBefore, shares, payoutUSD) {} catch {}
    }
  }

  function _executeLegacyRedemption(
    address asset,
    uint256 shares,
    uint8 decimals
  ) private returns (uint256 grossPayoutCollateral) {
    uint256 accountedAssets = CustodyVault(_vault).totalAssets(asset);
    uint256 totalSupply = IERC20(_token).totalSupply();
    grossPayoutCollateral = ShareLib.sharesToAssets(shares, totalSupply, accountedAssets, decimals);
    CustodyVault(_vault).withdraw(asset, address(this), grossPayoutCollateral);
  }

  function _executeRedemptionPayout(
    address sm,
    address sa,
    address asset,
    uint256 shares
  )
    private
    returns (
      uint256 grossPayoutCollateral,
      address[] memory targetAssets,
      uint256[] memory assetsSold
    )
  {
    (targetAssets, ) = IStrategyManager(sm).getTargetWeights();
    assetsSold = new uint256[](targetAssets.length);
    uint256 totalShares = IERC20(_token).totalSupply();

    for (uint256 i = 0; i < targetAssets.length; i++) {
      address strategyToken = targetAssets[i];
      uint256 vaultBal = CustodyVault(_vault).totalAssets(strategyToken);
      uint256 propAmount = totalShares > 0 ? (vaultBal * shares) / totalShares : 0;

      if (propAmount > 0) {
        CustodyVault(_vault).withdraw(strategyToken, address(this), propAmount);
        assetsSold[i] = propAmount;

        if (strategyToken == asset) {
          grossPayoutCollateral += propAmount;
        } else {
          grossPayoutCollateral += _swapStrategyTokenToCollateral(
            sa,
            strategyToken,
            asset,
            propAmount
          );
        }
      }
    }
  }

  function _swapStrategyTokenToCollateral(
    address sa,
    address strategyToken,
    address asset,
    uint256 propAmount
  ) private returns (uint256 usdcBought) {
    IERC20(strategyToken).forceApprove(sa, propAmount);
    uint256 minOut = _computeMinAmountOut(strategyToken, asset, propAmount);
    usdcBought = ISwapAdapter(sa).swap(strategyToken, asset, propAmount, minOut, address(this));
    IERC20(strategyToken).forceApprove(sa, 0);
  }
}
