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
import '../constants/ModuleIds.sol';
import '../vault/CustodyVault.sol';
import '../token/UVBTCETHToken.sol';

/**
 * @title UnifyVaultController
 * @notice Central orchestrator and live execution engine for UnifyVault V2
 * @dev Coordinates StrategyManager, PortfolioManager, SwapAdapter, CustodyVault, Treasury, OracleManager, and UVBTCETHToken.
 * Handles atomic live asset swaps, fee collection, share minting, and redemption workflows without retained balances.
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

  // V2 Live Execution Events
  event DepositExecuted(
    address indexed user,
    uint256 depositAmount,
    uint256 fee,
    address[] targetAssets,
    uint256[] assetsBought,
    uint256 sharesMinted,
    uint256 NAVAfter
  );

  event RedeemExecuted(
    address indexed user,
    uint256 sharesBurned,
    address[] targetAssets,
    uint256[] assetsSold,
    uint256 fee,
    uint256 usdcReturned,
    uint256 NAVAfter
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

  // --- Configurations ---

  function setMaxDeposit(uint256 maxDeposit_) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _maxDeposit = maxDeposit_;
  }

  function maxDeposit() external view returns (uint256) {
    return _maxDeposit;
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

  // --- Orchestrated Live Deposit & Redeem Workflows ---

  /**
   * @notice Executes live deposit flow: validates inputs, collects USDC collateral, routes fee to Treasury,
   * executes atomic DEX swaps via SwapAdapter to buy target strategy assets (cbBTC, WETH, etc.),
   * custodies purchased assets in CustodyVault, recalculates NAV, and mints UVBTCETH index shares.
   */
  function deposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external nonReentrant whenNotPaused returns (DepositQuote memory) {
    DepositQuote memory quote = _validateDeposit(asset, amount, minSharesOut, receiver);

    uint256 shares = quote.sharesPreview;
    if (shares < minSharesOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
    }

    address v = _vault;
    address t = _treasury;

    uint256 treasuryBalanceBefore = IERC20(asset).balanceOf(t);

    // 1. Route protocol deposit fee to Treasury
    IERC20(asset).safeTransferFrom(msg.sender, address(this), quote.protocolFee);
    IERC20(asset).forceApprove(t, quote.protocolFee);
    ITreasury(t).collectFee(asset, quote.protocolFee);
    IERC20(asset).forceApprove(t, 0);

    uint256 treasuryReceived = IERC20(asset).balanceOf(t) - treasuryBalanceBefore;
    if (treasuryReceived != quote.protocolFee) {
      revert ProtocolErrors.InsufficientReserves(asset, quote.protocolFee, treasuryReceived);
    }

    // 2. Determine execution path (Live Asset Swaps vs Direct Custody Deposit)
    address sm = strategyManager();
    address sa = swapAdapter();
    address pm = portfolioManager();

    address[] memory targetAssets;
    uint256[] memory assetsBought;

    if (sm != address(0) && sa != address(0)) {
      uint256[] memory weightsBps;
      (targetAssets, weightsBps) = IStrategyManager(sm).getTargetWeights();
      uint256 len = targetAssets.length;
      assetsBought = new uint256[](len);

      // Pull net deposit collateral into Controller for DEX swap routing
      IERC20(asset).safeTransferFrom(msg.sender, address(this), quote.netDeposit);

      for (uint256 i = 0; i < len; i++) {
        address targetToken = targetAssets[i];
        uint256 allocAmount = (quote.netDeposit * weightsBps[i]) / 10000;

        if (allocAmount > 0) {
          if (targetToken == asset) {
            // Direct deposit of input asset to vault without swap
            IERC20(asset).forceApprove(v, allocAmount);
            CustodyVault(v).deposit(asset, address(this), allocAmount);
            IERC20(asset).forceApprove(v, 0);
            assetsBought[i] = allocAmount;
          } else {
            // Execute atomic DEX swap: asset -> targetToken
            IERC20(asset).forceApprove(sa, allocAmount);
            uint256 bought = ISwapAdapter(sa).swap(
              asset,
              targetToken,
              allocAmount,
              0,
              address(this)
            );
            IERC20(asset).forceApprove(sa, 0);

            // Deposit bought strategy asset to CustodyVault
            IERC20(targetToken).forceApprove(v, bought);
            CustodyVault(v).deposit(targetToken, address(this), bought);
            IERC20(targetToken).forceApprove(v, 0);
            assetsBought[i] = bought;
          }
        }
      }
    } else {
      // Single-asset legacy deposit fallback directly to CustodyVault
      CustodyVault(v).deposit(asset, msg.sender, quote.netDeposit);
    }

    // 3. Recalculate NAV & Mint UVBTCETH shares
    uint256 navAfter = 1e18;
    if (pm != address(0)) {
      (, navAfter) = IPortfolioManager(pm).calculateNAV();
    }

    UVBTCETHToken(_token).mint(receiver, shares);

    // 4. Assert zero controller balance invariant
    uint256 controllerBal = IERC20(asset).balanceOf(address(this));
    if (controllerBal != 0) {
      revert ProtocolErrors.InsufficientReserves(asset, 0, controllerBal);
    }

    emit DepositCollateralReceived(
      asset,
      msg.sender,
      receiver,
      amount,
      quote.netDeposit,
      block.timestamp
    );
    emit ProtocolFeeCollected(msg.sender, asset, quote.protocolFee);
    emit DepositCompleted(receiver, asset, amount, quote.protocolFee, quote.netDeposit, shares);
    emit DepositExecuted(
      msg.sender,
      amount,
      quote.protocolFee,
      targetAssets,
      assetsBought,
      shares,
      navAfter
    );

    return quote;
  }

  /**
   * @notice Executes live redemption flow: validates shares, releases proportional multi-asset holdings from CustodyVault,
   * executes atomic DEX swaps via SwapAdapter back to payout USDC collateral, routes fee to Treasury,
   * burns UVBTCETH shares, recalculates NAV, and transfers USDC to receiver.
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
    address pm = portfolioManager();

    uint256 grossPayoutCollateral = 0;
    address[] memory targetAssets;
    uint256[] memory assetsSold;

    if (sm != address(0) && sa != address(0)) {
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
            // Swap strategyToken -> payout collateral (USDC)
            IERC20(strategyToken).forceApprove(sa, propAmount);
            uint256 usdcBought = ISwapAdapter(sa).swap(
              strategyToken,
              asset,
              propAmount,
              0,
              address(this)
            );
            IERC20(strategyToken).forceApprove(sa, 0);
            grossPayoutCollateral += usdcBought;
          }
        }
      }
    } else {
      // Legacy single-asset redemption fallback
      uint256 accountedAssets = CustodyVault(_vault).totalAssets(asset);
      uint256 totalSupply = IERC20(_token).totalSupply();
      grossPayoutCollateral = ShareLib.sharesToAssets(
        shares,
        totalSupply,
        accountedAssets,
        config.decimals
      );
      CustodyVault(_vault).withdraw(asset, address(this), grossPayoutCollateral);
    }

    (uint256 grossOut, uint256 protocolFee, uint256 netOut) = FeeLib.calculateRedemptionFee(
      grossPayoutCollateral
    );

    if (netOut < minAssetsOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minAssetsOut, netOut);
    }

    // 1. Burn shares from msg.sender
    UVBTCETHToken(_token).burn(msg.sender, shares);

    // 2. Route protocol redemption fee to Treasury
    IERC20(asset).forceApprove(_treasury, protocolFee);
    ITreasury(_treasury).collectFee(asset, protocolFee);
    IERC20(asset).forceApprove(_treasury, 0);

    // 3. Transfer net collateral to receiver
    IERC20(asset).safeTransfer(receiver, netOut);

    // 4. Recalculate NAV
    uint256 navAfter = 1e18;
    if (pm != address(0)) {
      (, navAfter) = IPortfolioManager(pm).calculateNAV();
    }

    // Assert zero controller balance invariant
    uint256 controllerBal = IERC20(asset).balanceOf(address(this));
    if (controllerBal != 0) {
      revert ProtocolErrors.InsufficientReserves(asset, 0, controllerBal);
    }

    emit RedeemCompleted(msg.sender, receiver, asset, shares, grossOut, protocolFee, netOut);
    emit RedeemExecuted(
      msg.sender,
      shares,
      targetAssets,
      assetsSold,
      protocolFee,
      netOut,
      navAfter
    );

    return netOut;
  }

  // --- Previews & Estimations ---

  function previewDeposit(address asset, uint256 amount) external view returns (uint256) {
    return _validateDeposit(asset, amount, 0, msg.sender).sharesPreview;
  }

  function previewRedeem(address asset, uint256 shares) public view returns (uint256) {
    address pm = portfolioManager();
    if (pm != address(0)) {
      IPortfolioManager.RedeemPreview memory preview = IPortfolioManager(pm).previewRedeem(
        shares,
        asset
      );
      uint256 gross = preview.payoutAmount;
      return gross - FeeLib.calculateRedeemFee(gross);
    }

    CustodyVault.AssetConfig memory config;
    try CustodyVault(_vault).assetConfig(asset) returns (CustodyVault.AssetConfig memory _config) {
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
    return grossAssets - FeeLib.calculateRedeemFee(grossAssets);
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

  // --- Pausing Actions ---

  function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
    _pause();
    emit EmergencyPaused(msg.sender);
  }

  function resume() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
    emit EmergencyResumed(msg.sender);
  }

  // --- Internal Validation Helpers ---

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

    bool healthy = IOracle(_oracle).isPriceFresh(asset);
    if (!healthy) {
      revert ProtocolErrors.OraclePriceStale(asset, 3600, 3600);
    }

    uint256 normalizedPrice = IOracle(_oracle).getAssetPrice(asset);
    if (normalizedPrice == 0) {
      revert ProtocolErrors.OraclePriceNegative(asset, 0);
    }

    bytes32 assetId = bytes32(uint256(uint160(asset)));
    (address provider, ) = IOracle(_oracle).getFeedMetadata(asset);
    uint256 rawPrice = IOracleProvider(provider).getLatestRound(assetId).price;

    uint256 protocolFee = FeeLib.calculateDepositFee(amount);
    uint256 netDeposit = FeeLib.calculateNetDeposit(amount);

    uint256 shares;
    address pm = portfolioManager();

    if (pm != address(0)) {
      IPortfolioManager.DepositPreview memory preview = IPortfolioManager(pm).previewDeposit(
        asset,
        amount
      );
      shares = preview.sharesToMint;
    } else {
      uint256 totalAssets = CustodyVault(_vault).totalAssets(asset);
      uint256 supply = IERC20(_token).totalSupply();
      shares = ShareLib.calculateShares(netDeposit, supply, totalAssets, config.decimals);
    }

    if (shares < minSharesOut) {
      revert ProtocolErrors.SlippageLimitExceeded(minSharesOut, shares);
    }

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
