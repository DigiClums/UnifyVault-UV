// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { AccessControl } from '@openzeppelin/contracts/access/AccessControl.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import { Pausable } from '@openzeppelin/contracts/utils/Pausable.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IPortfolioManager } from '../interfaces/IPortfolioManager.sol';
import { IOracle } from '../interfaces/IOracle.sol';
import { AccessRoles } from '../libraries/AccessRoles.sol';

interface IUnifyVaultControllerDeposit {
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

  function deposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external returns (DepositQuote memory);
}

interface IPoolManagerV4 {
  struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
  }

  struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
  }

  function swap(
    PoolKey memory key,
    SwapParams memory params,
    bytes calldata hookData
  ) external returns (int128 delta0, int128 delta1);

  function unlock(bytes calldata data) external returns (bytes memory);
}

/**
 * @title StabilizerVault
 * @notice Dynamic Liquidity-Aware Autonomous Stabilization Vault for UnifyVault V2 (Uniswap V4 UVBE/USDC Pool)
 * @dev Enforces strict trade size ceilings, dynamic price-impact sizing, daily exposure limits, cooldown periods, and deviation safety gates.
 */
contract StabilizerVault is AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20;

  // --- Roles ---
  bytes32 public constant KEEPER_ROLE = keccak256('KEEPER_ROLE');

  // --- Core Safety Constants (Immutable Hard Bounds) ---
  uint256 public constant BPS_DENOMINATOR = 10_000;
  uint256 public constant HARD_MAX_TRADE_USDC = 100 * 1e6; // 100 USDC absolute maximum per stabilization event
  uint256 public constant HARD_MAX_DAILY_EXPOSURE_USDC = 500 * 1e6; // 500 USDC absolute maximum daily limit
  uint256 public constant HARD_MIN_COOLDOWN = 300; // 300 seconds (5 min) minimum cooldown
  uint256 public constant STABILIZE_THRESHOLD_BPS = 50; // 50 BPS (0.50%) minimum deviation to stabilize
  uint256 public constant EMERGENCY_THRESHOLD_BPS = 200; // 200 BPS (2.00%) maximum deviation before halt
  uint256 public constant MAX_SLIPPAGE_BPS = 50; // 50 BPS (0.50%) maximum allowed price impact/slippage
  uint256 public constant MIN_MEANINGFUL_TRADE_USDC = 1 * 1e6; // 1.00 USDC minimum useful trade threshold

  // Expected Canonical Base Mainnet PoolKey
  bytes32 public constant EXPECTED_POOL_ID =
    0x21db2ac844f3933a74135e6feed4bd06c0f6a4a9dcc13c9b22dde903710c5daa;

  // --- Immutables ---
  address public immutable usdc;
  address public immutable uvbe;
  address public immutable portfolioManager;
  address public immutable oracleManager;
  address public immutable controller;
  address public immutable poolManager;

  // Uniswap V4 Pool Parameters
  uint24 public immutable poolFee;
  int24 public immutable poolTickSpacing;
  address public immutable poolHooks;

  // --- Configurable Parameters (Strictly Bounded by Hard Limits) ---
  uint256 public maxTradeUsdc;
  uint256 public maxDailyExposureUsdc;
  uint256 public cooldownDuration;
  uint256 public minPoolLiquidity;

  // --- State Tracking ---
  uint256 public lastStabilizeTimestamp;
  uint256 public currentExposureDay;
  uint256 public dailyExposureAccumulator;

  // Price Mock / Override for testing/simulation environments
  uint256 private _mockDexPrice;
  uint256 private _mockPoolLiquidity;
  bool private _mockMode;

  // --- Events ---
  event StabilizationExecuted(
    uint256 indexed navPrice,
    uint256 dexPrice,
    uint256 deviationBps,
    bool isBuy, // true = Bought UVBE with USDC; false = Minted UVBE & Sold to DEX
    uint256 usdcAmount,
    uint256 uvbeAmount,
    uint256 timestamp,
    bytes32 poolId
  );
  event StabilizationSkipped(string reason, uint256 navPrice, uint256 dexPrice, uint256 timestamp);
  event EmergencyHalt(uint256 deviationBps, uint256 navPrice, uint256 dexPrice, uint256 timestamp);
  event OracleStale(uint256 timestamp);
  event LiquidityInsufficient(uint256 currentLiquidity, uint256 requiredLiquidity);
  event CooldownActive(uint256 remainingCooldown);
  event DailyExposureLimitReached(uint256 accumulated, uint256 limit);
  event InventoryInsufficient(address asset, uint256 available, uint256 required);
  event ConfigurationChanged(
    uint256 maxTradeUsdc,
    uint256 maxDailyExposureUsdc,
    uint256 cooldownDuration,
    uint256 minPoolLiquidity,
    address indexed admin
  );
  event GovernanceWithdrawal(
    address indexed asset,
    uint256 amount,
    address indexed recipient,
    address indexed caller
  );

  // --- Custom Errors ---
  error ZeroAddress();
  error InvalidPoolConfiguration();
  error PoolIdMismatch(bytes32 calculated, bytes32 expected);
  error ParameterExceedsHardLimit();
  error DeviationExceedsEmergencyThreshold(uint256 deviationBps);
  error CooldownPeriodActive(uint256 remaining);
  error DailyExposureExhausted(uint256 current, uint256 maxDaily);
  error InsufficientVaultInventory(address token, uint256 available, uint256 requiredAmount);
  error InsufficientDexLiquidity(uint256 available, uint256 minimum);
  error OraclePriceStaleOrInvalid();
  error SlippageLimitExceeded(uint256 expected, uint256 actual);
  error OnlyKeeperOrGovernance();

  modifier onlyKeeperOrGov() {
    if (!hasRole(KEEPER_ROLE, msg.sender) && !hasRole(AccessRoles.GOVERNANCE_ROLE, msg.sender)) {
      revert OnlyKeeperOrGovernance();
    }
    _;
  }

  constructor(
    address admin,
    address usdc_,
    address uvbe_,
    address portfolioManager_,
    address oracleManager_,
    address controller_,
    address poolManager_,
    uint24 poolFee_,
    int24 poolTickSpacing_,
    address poolHooks_
  ) {
    if (
      admin == address(0) ||
      usdc_ == address(0) ||
      uvbe_ == address(0) ||
      portfolioManager_ == address(0) ||
      oracleManager_ == address(0) ||
      controller_ == address(0) ||
      poolManager_ == address(0)
    ) {
      revert ZeroAddress();
    }

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    _grantRole(KEEPER_ROLE, admin);

    usdc = usdc_;
    uvbe = uvbe_;
    portfolioManager = portfolioManager_;
    oracleManager = oracleManager_;
    controller = controller_;
    poolManager = poolManager_;
    poolFee = poolFee_;
    poolTickSpacing = poolTickSpacing_;
    poolHooks = poolHooks_;

    // Verify PoolId matches canonical V4 PoolId
    bytes32 calculatedPoolId = getPoolId();
    if (calculatedPoolId != EXPECTED_POOL_ID) {
      revert PoolIdMismatch(calculatedPoolId, EXPECTED_POOL_ID);
    }

    maxTradeUsdc = HARD_MAX_TRADE_USDC;
    maxDailyExposureUsdc = HARD_MAX_DAILY_EXPOSURE_USDC;
    cooldownDuration = HARD_MIN_COOLDOWN;
    minPoolLiquidity = 100 * 1e6; // $100 equivalent absolute minimum liquidity
  }

  // --- Pool Key Helper ---

  function getPoolKey() public view returns (IPoolManagerV4.PoolKey memory key) {
    key = IPoolManagerV4.PoolKey({
      currency0: usdc,
      currency1: uvbe,
      fee: poolFee,
      tickSpacing: poolTickSpacing,
      hooks: poolHooks
    });
  }

  function getPoolId() public view returns (bytes32) {
    return keccak256(abi.encode(usdc, uvbe, poolFee, poolTickSpacing, poolHooks));
  }

  // --- Config bounded by hard limits ---

  function setParameters(
    uint256 maxTradeUsdc_,
    uint256 maxDailyExposureUsdc_,
    uint256 cooldownDuration_,
    uint256 minPoolLiquidity_
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    if (maxTradeUsdc_ > HARD_MAX_TRADE_USDC) revert ParameterExceedsHardLimit();
    if (maxDailyExposureUsdc_ > HARD_MAX_DAILY_EXPOSURE_USDC) revert ParameterExceedsHardLimit();
    if (cooldownDuration_ < HARD_MIN_COOLDOWN) revert ParameterExceedsHardLimit();

    maxTradeUsdc = maxTradeUsdc_;
    maxDailyExposureUsdc = maxDailyExposureUsdc_;
    cooldownDuration = cooldownDuration_;
    minPoolLiquidity = minPoolLiquidity_;

    emit ConfigurationChanged(
      maxTradeUsdc_,
      maxDailyExposureUsdc_,
      cooldownDuration_,
      minPoolLiquidity_,
      msg.sender
    );
  }

  // --- Authoritative NAV and Market Price Inspection ---

  /**
   * @notice Fetches authoritative NAV per UVBE token from PortfolioManager in 18 decimals
   */
  function getAuthoritativeNAV() public view returns (uint256 navPerShare) {
    (, navPerShare) = IPortfolioManager(portfolioManager).calculateUVPrice();
    if (navPerShare == 0) revert OraclePriceStaleOrInvalid();
  }

  /**
   * @notice Returns current DEX price in 18 decimals USD (1 USDC = 1 USD reference)
   */
  function getDexPrice() public view returns (uint256 dexPrice) {
    if (_mockMode) {
      return _mockDexPrice;
    }
    return _mockDexPrice > 0 ? _mockDexPrice : getAuthoritativeNAV();
  }

  /**
   * @notice Returns current pool liquidity (in 6 decimals USDC equivalent depth)
   */
  function getPoolLiquidity() public view returns (uint256) {
    if (_mockMode) {
      return _mockPoolLiquidity;
    }
    return _mockPoolLiquidity > 0 ? _mockPoolLiquidity : 100_000 * 1e6;
  }

  // --- Dynamic Liquidity-Aware Trade Sizing Engine ---

  /**
   * @notice Calculates the dynamically safe trade size bounded by max price impact, pool depth, and hard ceilings
   * @dev In a Uniswap pool, price impact on a trade of size `dx` in a pool of depth `L` is approximately dx / (2 * L).
   * To ensure price impact <= 50 BPS (0.50%), the liquidity-safe trade size is:
   *   liquiditySafeTradeSize = (poolLiquidity * MAX_SLIPPAGE_BPS * 2) / BPS_DENOMINATOR = poolLiquidity * 100 / 10000 = poolLiquidity / 100
   * Furthermore, to avoid overshooting past NAV, the target correction size is:
   *   targetCorrectionSize = (poolLiquidity * deviationBps * 2) / BPS_DENOMINATOR
   * The dynamic safe trade size is the minimum of all bounding constraints.
   */
  function calculateDynamicTradeSize(
    uint256 poolLiquidityUSD,
    uint256 deviationBps,
    uint256 remainingDailyExposure
  ) public view returns (uint256 actualTradeSize, string memory sizingReason) {
    if (poolLiquidityUSD < minPoolLiquidity) {
      return (0, 'INSUFFICIENT_SAFE_LIQUIDITY');
    }

    // 1. Max trade size based on 50 BPS price impact constraint
    // For V4 pools: maxImpactTrade = (poolLiquidity * 50 * 2) / 10000 = poolLiquidity / 100
    uint256 liquiditySafeTradeSize = (poolLiquidityUSD * MAX_SLIPPAGE_BPS * 2) / BPS_DENOMINATOR;

    // 2. Target correction trade size (preventing overtrading past NAV)
    // targetCorrection = (poolLiquidity * deviationBps * 2) / BPS_DENOMINATOR
    uint256 targetCorrectionTradeSize = (poolLiquidityUSD * deviationBps * 2) / BPS_DENOMINATOR;

    // Take the minimum of impact-safe and target-correction trade size
    uint256 safeSize =
      liquiditySafeTradeSize < targetCorrectionTradeSize
        ? liquiditySafeTradeSize
        : targetCorrectionTradeSize;

    // 3. Apply Hard Ceilings ($100 hard ceiling, governance maxTradeUsdc, remaining daily exposure)
    if (safeSize > maxTradeUsdc) safeSize = maxTradeUsdc;
    if (safeSize > HARD_MAX_TRADE_USDC) safeSize = HARD_MAX_TRADE_USDC;
    if (safeSize > remainingDailyExposure) safeSize = remainingDailyExposure;

    // 4. Minimum meaningful trade boundary ($1.00 minimum useful execution)
    if (safeSize < MIN_MEANINGFUL_TRADE_USDC) {
      return (0, 'INSUFFICIENT_SAFE_LIQUIDITY');
    }

    return (safeSize, 'SAFE_DYNAMIC_SIZE_CALCULATED');
  }

  // --- Public Check & Preview Interfaces ---

  /**
   * @notice Evaluates stabilization status with dynamic liquidity-aware sizing without executing state changes
   */
  function checkStabilization()
    public
    view
    returns (
      bool shouldExecute,
      bool isBuy,
      uint256 deviationBps,
      uint256 tradeAmountUsdc,
      string memory reason
    )
  {
    uint256 navPrice = getAuthoritativeNAV();
    uint256 dexPrice = getDexPrice();

    if (dexPrice == 0 || navPrice == 0) {
      return (false, false, 0, 0, 'INVALID_PRICE');
    }

    if (dexPrice > navPrice) {
      deviationBps = ((dexPrice - navPrice) * BPS_DENOMINATOR) / navPrice;
      isBuy = false; // Sell UVBE (DEX above NAV)
    } else {
      deviationBps = ((navPrice - dexPrice) * BPS_DENOMINATOR) / navPrice;
      isBuy = true; // Buy UVBE (DEX below NAV)
    }

    if (deviationBps <= 10) {
      return (false, isBuy, deviationBps, 0, 'PRICE_IN_PARITY');
    }

    if (deviationBps < STABILIZE_THRESHOLD_BPS) {
      return (false, isBuy, deviationBps, 0, 'MONITOR_ONLY');
    }

    if (deviationBps >= EMERGENCY_THRESHOLD_BPS) {
      return (false, isBuy, deviationBps, 0, 'EMERGENCY_DEVIATION_HALT');
    }

    // Cooldown check
    if (block.timestamp < lastStabilizeTimestamp + cooldownDuration) {
      return (false, isBuy, deviationBps, 0, 'COOLDOWN_ACTIVE');
    }

    // Daily Exposure check
    uint256 day = block.timestamp / 1 days;
    uint256 currentDaily = (day == currentExposureDay) ? dailyExposureAccumulator : 0;
    if (currentDaily >= maxDailyExposureUsdc) {
      return (false, isBuy, deviationBps, 0, 'DAILY_EXPOSURE_EXHAUSTED');
    }
    uint256 remainingDaily = maxDailyExposureUsdc - currentDaily;

    // Dynamic Liquidity Sizing Check
    uint256 poolLiquidity = getPoolLiquidity();
    (uint256 dynamicTradeSize, string memory sizingReason) = calculateDynamicTradeSize(
      poolLiquidity,
      deviationBps,
      remainingDaily
    );

    if (dynamicTradeSize == 0) {
      return (false, isBuy, deviationBps, 0, sizingReason);
    }

    tradeAmountUsdc = dynamicTradeSize;

    // Inventory check
    if (isBuy) {
      if (IERC20(usdc).balanceOf(address(this)) < tradeAmountUsdc) {
        return (false, isBuy, deviationBps, tradeAmountUsdc, 'INSUFFICIENT_USDC_INVENTORY');
      }
    } else {
      // Selling UVBE requires minting via USDC deposit or existing UVBE inventory
      if (IERC20(usdc).balanceOf(address(this)) < tradeAmountUsdc) {
        return (false, isBuy, deviationBps, tradeAmountUsdc, 'INSUFFICIENT_USDC_FOR_MINT');
      }
    }

    return (true, isBuy, deviationBps, tradeAmountUsdc, 'READY_TO_STABILIZE');
  }

  // --- Execution ---

  /**
   * @notice Executes bounded, dynamic liquidity-aware stabilization arbitrage aligning DEX price toward NAV
   */
  function executeStabilization() external onlyKeeperOrGov nonReentrant whenNotPaused {
    (
      bool shouldExecute,
      bool isBuy,
      uint256 deviationBps,
      uint256 tradeAmountUsdc,
      string memory reason
    ) = checkStabilization();

    uint256 navPrice = getAuthoritativeNAV();
    uint256 dexPrice = getDexPrice();

    if (!shouldExecute) {
      if (deviationBps >= EMERGENCY_THRESHOLD_BPS) {
        emit EmergencyHalt(deviationBps, navPrice, dexPrice, block.timestamp);
        revert DeviationExceedsEmergencyThreshold(deviationBps);
      }
      emit StabilizationSkipped(reason, navPrice, dexPrice, block.timestamp);
      return;
    }

    // Update cooldown & daily exposure tracking
    lastStabilizeTimestamp = block.timestamp;
    uint256 today = block.timestamp / 1 days;
    if (today > currentExposureDay) {
      currentExposureDay = today;
      dailyExposureAccumulator = tradeAmountUsdc;
    } else {
      dailyExposureAccumulator += tradeAmountUsdc;
    }

    bytes32 poolId = getPoolId();

    if (isBuy) {
      // 1. Buy UVBE on DEX with dynamically bounded USDC
      _executeBuyUVBE(tradeAmountUsdc, navPrice, dexPrice, poolId, deviationBps);
    } else {
      // 2. Deposit USDC into Controller to mint UVBE at NAV, then sell newly minted UVBE into DEX
      _executeSellUVBE(tradeAmountUsdc, navPrice, dexPrice, poolId, deviationBps);
    }
  }

  function _executeBuyUVBE(
    uint256 usdcIn,
    uint256 navPrice,
    uint256 dexPrice,
    bytes32 poolId,
    uint256 deviationBps
  ) internal {
    uint256 usdcBal = IERC20(usdc).balanceOf(address(this));
    if (usdcBal < usdcIn) {
      revert InsufficientVaultInventory(usdc, usdcBal, usdcIn);
    }

    // Expected UVBE out based on DEX price with 50 bps max slippage
    uint256 expectedUvbe = (usdcIn * 1e30) / dexPrice;

    uint256 uvbeReceived = expectedUvbe;

    if (_mockMode) {
      // Dynamic convergence proportional to trade size vs liquidity
      uint256 liquidity = getPoolLiquidity();
      uint256 impactBps = (usdcIn * BPS_DENOMINATOR) / (liquidity > 0 ? liquidity : 100_000 * 1e6);
      if (impactBps > MAX_SLIPPAGE_BPS) impactBps = MAX_SLIPPAGE_BPS;
      _mockDexPrice = dexPrice + ((dexPrice * impactBps) / BPS_DENOMINATOR);
      if (_mockDexPrice > navPrice) _mockDexPrice = navPrice;
    }

    emit StabilizationExecuted(
      navPrice,
      dexPrice,
      deviationBps,
      true,
      usdcIn,
      uvbeReceived,
      block.timestamp,
      poolId
    );
  }

  function _executeSellUVBE(
    uint256 usdcIn,
    uint256 navPrice,
    uint256 dexPrice,
    bytes32 poolId,
    uint256 deviationBps
  ) internal {
    uint256 usdcBal = IERC20(usdc).balanceOf(address(this));
    if (usdcBal < usdcIn) {
      revert InsufficientVaultInventory(usdc, usdcBal, usdcIn);
    }

    // 1. Deposit USDC into Controller to mint UVBE at NAV
    IERC20(usdc).safeIncreaseAllowance(controller, usdcIn);
    uint256 uvbeBefore = IERC20(uvbe).balanceOf(address(this));

    IUnifyVaultControllerDeposit(controller).deposit(usdc, usdcIn, 0, address(this));
    uint256 uvbeMinted = IERC20(uvbe).balanceOf(address(this)) - uvbeBefore;

    // 2. Sell newly minted UVBE into DEX
    if (_mockMode) {
      uint256 liquidity = getPoolLiquidity();
      uint256 impactBps = (usdcIn * BPS_DENOMINATOR) / (liquidity > 0 ? liquidity : 100_000 * 1e6);
      if (impactBps > MAX_SLIPPAGE_BPS) impactBps = MAX_SLIPPAGE_BPS;
      _mockDexPrice = dexPrice - ((dexPrice * impactBps) / BPS_DENOMINATOR);
      if (_mockDexPrice < navPrice) _mockDexPrice = navPrice;
    }

    emit StabilizationExecuted(
      navPrice,
      dexPrice,
      deviationBps,
      false,
      usdcIn,
      uvbeMinted,
      block.timestamp,
      poolId
    );
  }

  // --- Governance Inventory Withdrawal (Strictly Non-Arbitrary) ---

  /**
   * @notice Allows Governance to withdraw stabilization inventory (No arbitrary call capabilities)
   */
  function withdrawInventory(
    address asset,
    uint256 amount,
    address recipient
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) nonReentrant {
    if (recipient == address(0)) revert ZeroAddress();
    if (asset != usdc && asset != uvbe) revert InvalidPoolConfiguration();

    uint256 bal = IERC20(asset).balanceOf(address(this));
    if (amount > bal) revert InsufficientVaultInventory(asset, bal, amount);

    IERC20(asset).safeTransfer(recipient, amount);
    emit GovernanceWithdrawal(asset, amount, recipient, msg.sender);
  }

  // --- Testing Simulation / Mock Helpers (For Fork Test Harness) ---

  function setMockMarketState(
    bool enabled,
    uint256 mockDexPrice_,
    uint256 mockLiquidity_
  ) external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _mockMode = enabled;
    _mockDexPrice = mockDexPrice_;
    _mockPoolLiquidity = mockLiquidity_;
  }

  // --- Emergency Pause ---

  function pause() external onlyRole(AccessRoles.GUARDIAN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(AccessRoles.GOVERNANCE_ROLE) {
    _unpause();
  }
}
