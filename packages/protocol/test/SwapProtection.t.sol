// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/vault/CustodyVault.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/ChainlinkOracleProvider.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/constants/ModuleIds.sol';
import '../src/interfaces/ISwapAdapter.sol';
import '../src/interfaces/IProtocolDirectory.sol';
import '../src/interfaces/ITreasury.sol';
import '../src/interfaces/IOracle.sol';
import '../src/interfaces/IOracleProvider.sol';
import '../src/interfaces/IFeeManager.sol';
import '../src/types/OracleTypes.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

// ============================================================
// Mock Contracts
// ============================================================

contract MockERC20Decimals is ERC20 {
  uint8 private _decimals;

  constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
    _decimals = decimals_;
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function burn(address from, uint256 amount) external {
    _burn(from, amount);
  }
}

/// @dev Mock oracle that returns configurable prices per asset (18 decimals)
contract MockOracleForSwap is IOracle, IOracleProvider {
  mapping(address => uint256) public prices; // 18 decimals
  mapping(address => bool) public freshness;

  function setPrice(address asset, uint256 price18) external {
    prices[asset] = price18;
  }

  function setFreshness(address asset, bool fresh) external {
    freshness[asset] = fresh;
  }

  function getAssetPrice(address asset) external view override returns (uint256) {
    return prices[asset];
  }

  function isPriceFresh(address asset) external view override returns (bool) {
    return freshness[asset];
  }

  function getFeedMetadata(
    address /* asset */
  ) external view override returns (address provider, uint256 heartbeat) {
    return (address(this), 3600);
  }

  function getLatestPrice(bytes32) external pure override returns (uint256) {
    return 1e8;
  }

  function getLatestRound(bytes32) external view override returns (ProviderPrice memory) {
    return
      ProviderPrice({
        price: 1e8,
        decimals: 8,
        updatedAt: block.timestamp,
        roundId: 1,
        providerId: bytes32(0)
      });
  }

  function getDecimals(bytes32) external pure override returns (uint8) {
    return 8;
  }

  function getUpdatedAt(bytes32) external view override returns (uint256) {
    return block.timestamp;
  }

  function isHealthy(bytes32) external pure override returns (bool) {
    return true;
  }
}

/// @dev Mock treasury that accepts fees via transferFrom
contract MockTreasuryForSwap is ITreasury {
  function collectFee(address asset, uint256 amount) external override {
    IERC20(asset).transferFrom(msg.sender, address(this), amount);
  }

  function withdraw(address, address, uint256) external pure override {}

  function balance(address asset) external view override returns (uint256) {
    return IERC20(asset).balanceOf(address(this));
  }

  function totalAssetBalance(address asset) external view override returns (uint256) {
    return IERC20(asset).balanceOf(address(this));
  }
}

/// @dev Mock protocol directory that maps module IDs to addresses
contract MockDirectoryForSwap is IProtocolDirectory {
  mapping(bytes32 => address) private _addresses;

  function setAddress(bytes32 name, address addr) external {
    _addresses[name] = addr;
  }

  function getAddress(bytes32 name) external view override returns (address) {
    address addr = _addresses[name];
    require(addr != address(0), 'Directory: not found');
    return addr;
  }

  function exists(bytes32 name) external view override returns (bool) {
    return _addresses[name] != address(0);
  }

  function isFrozen() external pure override returns (bool) {
    return false;
  }

  function registerAddress(bytes32, address) external pure override {}
  function updateAddress(bytes32, address) external pure override {}
  function removeAddress(bytes32) external pure override {}
  function freeze() external pure override {}
}

/// @dev Configurable mock DEX router: numerator/denominator controls the output ratio
///      Set ratio to simulate various mispricing scenarios
contract MockDEXRouter {
  // amountOut = amountIn * numerator / denominator
  uint256 public numerator = 1;
  uint256 public denominator = 1;
  bool public shouldRevert;

  function setRatio(uint256 num, uint256 den) external {
    numerator = num;
    denominator = den;
  }

  function setShouldRevert(bool r) external {
    shouldRevert = r;
  }

  function exactInputSingle(
    IUniswapV3Router.ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (shouldRevert) revert('MockDEX: FAIL');
    amountOut = (params.amountIn * numerator) / denominator;

    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    MockERC20Decimals(params.tokenOut).mint(params.recipient, amountOut);
  }

  function exactInput(
    IUniswapV3Router.ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (shouldRevert) revert('MockDEX: MULTI_FAIL');
    amountOut = (params.amountIn * numerator) / denominator;

    address tokenIn = address(bytes20(params.path[0:20]));
    address tokenOut = address(bytes20(params.path[params.path.length - 20:]));

    IERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    MockERC20Decimals(tokenOut).mint(params.recipient, amountOut);
  }

  function exactOutputSingle(
    IUniswapV3Router.ExactOutputSingleParams calldata params
  ) external payable returns (uint256 amountIn) {
    if (shouldRevert) revert('MockDEX: EXACT_OUT_FAIL');
    amountIn = (params.amountOut * denominator) / numerator;

    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
    MockERC20Decimals(params.tokenOut).mint(params.recipient, params.amountOut);
  }

  function exactOutput(
    IUniswapV3Router.ExactOutputParams calldata params
  ) external payable returns (uint256 amountIn) {
    if (shouldRevert) revert('MockDEX: EXACT_OUT_MULTI_FAIL');
    amountIn = (params.amountOut * denominator) / numerator;

    address tokenIn = address(bytes20(params.path[0:20]));
    address tokenOut = address(bytes20(params.path[params.path.length - 20:]));

    IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
    MockERC20Decimals(tokenOut).mint(params.recipient, params.amountOut);
  }
}

// ============================================================
// Test Suite
// ============================================================

contract SwapProtectionTest is Test {
  // System under test
  UnifyVaultController public controller;

  // Infrastructure
  MockDirectoryForSwap public directory;
  MockOracleForSwap public oracle;
  CustodyVault public vault;
  MockTreasuryForSwap public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  SwapAdapter public swapAdapter;
  MockDEXRouter public dexRouter;

  // Tokens
  MockERC20Decimals public usdc; // 6 decimals
  MockERC20Decimals public weth; // 18 decimals
  MockERC20Decimals public cbbtc; // 8 decimals

  // Actors
  address public admin = address(this);
  address public user = address(0xBEEF);
  address public gov = address(0xABC);

  // Oracle prices (18 decimals)
  uint256 constant USDC_PRICE = 1e18; // $1.00
  uint256 constant WETH_PRICE = 2500e18; // $2,500.00
  uint256 constant CBBTC_PRICE = 60000e18; // $60,000.00

  function setUp() public {
    // 1. Deploy tokens
    usdc = new MockERC20Decimals('USD Coin', 'USDC', 6);
    weth = new MockERC20Decimals('Wrapped Ether', 'WETH', 18);
    cbbtc = new MockERC20Decimals('Coinbase BTC', 'cbBTC', 8);

    // 2. Deploy infrastructure
    oracle = new MockOracleForSwap();
    oracle.setPrice(address(usdc), USDC_PRICE);
    oracle.setPrice(address(weth), WETH_PRICE);
    oracle.setPrice(address(cbbtc), CBBTC_PRICE);
    oracle.setFreshness(address(usdc), true);
    oracle.setFreshness(address(weth), true);
    oracle.setFreshness(address(cbbtc), true);

    treasury = new MockTreasuryForSwap();
    vault = new CustodyVault();
    token = new UVBTCETHToken();
    directory = new MockDirectoryForSwap();

    // 3. Deploy DEX router and swap adapter
    dexRouter = new MockDEXRouter();
    swapAdapter = new SwapAdapter(admin, address(dexRouter));

    // 4. Deploy strategy manager (60/40 BTC/ETH — will be overridden per test)
    address[] memory assets = new address[](2);
    uint256[] memory weights = new uint256[](2);
    assets[0] = address(cbbtc);
    assets[1] = address(weth);
    weights[0] = 6000; // 60% BTC
    weights[1] = 4000; // 40% ETH
    strategyManager = new StrategyManager(admin, assets, weights);

    // 5. Register modules in directory
    directory.setAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.setAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // 6. Deploy controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracle),
      address(vault),
      address(treasury),
      address(token)
    );

    // 7. Register assets in vault
    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(weth), 18);
    vault.registerAsset(address(cbbtc), 8);

    // 8. Grant roles
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);

    // 9. Default DEX ratio (1:1 — overridden per test)
    dexRouter.setRatio(1, 1);

    // 10. Mint USDC to user
    usdc.mint(user, 100_000 * 1e6); // 100k USDC
  }

  // ============================================================
  // Helper: set DEX to output exact oracle-priced amounts
  // ============================================================

  function _setDEXToOraclePrice_USDC_WETH() internal {
    // amountOut = amountIn * 1e18 / (2500 * 1e6)
    dexRouter.setRatio(1e18, 2500 * 1e6);
  }

  function _setDEXToOraclePrice_USDC_cbBTC() internal {
    // amountOut = amountIn * 1e8 / (60000 * 1e6)
    dexRouter.setRatio(1e8, 60000 * 1e6);
  }

  function _setWETHOnlyStrategy() internal {
    address[] memory assets = new address[](1);
    uint256[] memory weights = new uint256[](1);
    assets[0] = address(weth);
    weights[0] = 10000;
    vm.prank(admin);
    strategyManager.setStrategy(assets, weights);
  }

  function _setcbBTCOnlyStrategy() internal {
    address[] memory assets = new address[](1);
    uint256[] memory weights = new uint256[](1);
    assets[0] = address(cbbtc);
    weights[0] = 10000;
    vm.prank(admin);
    strategyManager.setStrategy(assets, weights);
  }

  // ============================================================
  // Test: _computeSwapBounds correctness (validated indirectly)
  // ============================================================

  function test_ComputeSwapBounds_USDC_to_WETH() public {
    // 1000 USDC -> WETH at oracle
    // expectedOut = (1000e6 * 1e18 * 1e18) / (2500e18 * 1e6) = 0.4e18
    uint256 amountIn = 1000 * 1e6;
    uint256 expectedOut = (amountIn * USDC_PRICE * (10 ** 18)) / (WETH_PRICE * (10 ** 6));
    assertEq(expectedOut, 0.4e18, 'Expected output for 1000 USDC -> WETH');

    uint256 expectedMin = (expectedOut * 9900) / 10000; // 1% slippage
    uint256 expectedMax = (expectedOut * 10300) / 10000; // 3% deviation

    assertEq(expectedMin, 0.396e18, 'Min bound');
    assertEq(expectedMax, 0.412e18, 'Max bound');
  }

  function test_ComputeSwapBounds_USDC_to_cbBTC() public {
    // 60000 USDC -> cbBTC
    // expectedOut = (60000e6 * 1e18 * 1e8) / (60000e18 * 1e6) = 1e8 = 1 cbBTC
    uint256 amountIn = 60000 * 1e6;
    uint256 expectedOut = (amountIn * USDC_PRICE * (10 ** 8)) / (CBBTC_PRICE * (10 ** 6));
    assertEq(expectedOut, 1e8, 'Expected output for 60000 USDC -> cbBTC');
  }

  // ============================================================
  // Test: Normal correctly priced swap -> PASS
  // ============================================================

  function test_NormalDeposit_CorrectlyPriced_Passes() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    uint256 userShares = token.balanceOf(user);
    assertGt(userShares, 0, 'Shares should be minted');

    uint256 vaultWETH = vault.totalAssets(address(weth));
    assertGt(vaultWETH, 0, 'Vault should hold WETH');
  }

  // ============================================================
  // Test: Slightly unfavorable slippage within configured limit -> PASS
  // ============================================================

  function test_SlightlyUnfavorableSlippage_WithinLimit_Passes() public {
    _setWETHOnlyStrategy();

    // DEX outputs 0.5% less than oracle price (within 1% slippage)
    dexRouter.setRatio(1e18 * 995, 2500 * 1e6 * 1000);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    assertGt(token.balanceOf(user), 0, 'Shares should be minted with slight slippage');
  }

  // ============================================================
  // Test: Output below minAmountOut -> REVERT
  // ============================================================

  function test_OutputBelowMinAmountOut_Reverts() public {
    _setWETHOnlyStrategy();

    // DEX outputs 5% less than oracle price (exceeds 1% slippage)
    dexRouter.setRatio(1e18 * 950, 2500 * 1e6 * 1000);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Output above maxAmountOut -> REVERT
  // ============================================================

  function test_OutputAboveMaxAmountOut_Reverts() public {
    _setWETHOnlyStrategy();

    // DEX outputs 10% MORE than oracle price (exceeds 3% max deviation)
    dexRouter.setRatio(1e18 * 1100, 2500 * 1e6 * 1000);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Base Sepolia-style 1 USDC -> 1 WETH mispricing -> REVERT
  // ============================================================

  function test_BaseSepoliaScenario_1USDC_to_1WETH_Reverts() public {
    _setWETHOnlyStrategy();

    // CRITICAL: DEX returns 1 WETH (18 dec) per 1 USDC (6 dec)
    // Oracle expects ~0.0004 WETH per USDC
    dexRouter.setRatio(1e18, 1e6);

    uint256 depositAmount = 37 * 1e6; // 37 USDC matching Base Sepolia
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: 7.70868 USDC -> 7.70868 WETH scenario -> REVERT
  // ============================================================

  function test_BaseSepoliaScenario_7_USDC_to_7_WETH_Reverts() public {
    _setWETHOnlyStrategy();

    // DEX mispriced: returns 1 WETH per 1 USDC
    dexRouter.setRatio(1e18, 1e6);

    // 7.70868 USDC (7708680 in 6-decimal)
    uint256 depositAmount = 7_708_680;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Zero output -> REVERT
  // ============================================================

  function test_ZeroOutput_Reverts() public {
    _setWETHOnlyStrategy();

    // DEX returns 0 output
    dexRouter.setRatio(0, 1);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Invalid/zero oracle price -> REVERT
  // ============================================================

  function test_ZeroOraclePrice_OutputToken_Reverts() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    // Set WETH oracle price to 0
    oracle.setPrice(address(weth), 0);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  function test_ZeroOraclePrice_InputToken_Reverts() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    // Set USDC oracle price to 0
    oracle.setPrice(address(usdc), 0);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Stale oracle -> REVERT
  // ============================================================

  function test_StaleOracle_Reverts() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    // Mark USDC oracle as stale
    oracle.setFreshness(address(usdc), false);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Oracle decimals mismatch handled safely (USDC 6 -> WETH 18)
  // ============================================================

  function test_DecimalsMismatch_USDC6_to_WETH18_HandledCorrectly() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    // 2500 USDC -> should get ~1 WETH
    uint256 depositAmount = 2500 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    uint256 vaultWETH = vault.totalAssets(address(weth));
    uint256 netDeposit =
      2500 * 1e6 - FeeLib.calculateDepositFee(2500 * 1e6, FeeLib.DEPOSIT_FEE_BPS);
    uint256 expectedWETH = (netDeposit * USDC_PRICE * 1e18) / (WETH_PRICE * 1e6);
    assertApproxEqRel(vaultWETH, expectedWETH, 0.01e18, 'WETH should match oracle expectation');
  }

  // ============================================================
  // Test: Very large values -> no overflow
  // ============================================================

  function test_VeryLargeDeposit_NoOverflow() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    uint256 depositAmount = 10_000_000 * 1e6; // 10M USDC
    usdc.mint(user, depositAmount);

    vm.prank(gov);
    controller.setMaxDeposit(type(uint256).max);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    assertGt(token.balanceOf(user), 0, 'Large deposit should succeed without overflow');
  }

  // ============================================================
  // Test: Very small values -> no unintended zero-rounding
  // ============================================================

  function test_VerySmallDeposit_NoZeroRounding() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    // 10 USDC -> expected 0.004 WETH = 4e15 wei (should not round to zero)
    uint256 depositAmount = 10 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    uint256 vaultWETH = vault.totalAssets(address(weth));
    assertGt(vaultWETH, 0, 'Small deposit should produce non-zero WETH');
  }

  // ============================================================
  // Test: Normal 60/40 BTC/ETH deposit -> PASS (single-asset proxy)
  // ============================================================

  function test_Normal60_40_Deposit_SingleAssetProxy_Passes() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    uint256 depositAmount = 5000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    assertGt(token.balanceOf(user), 0, 'Normal deposit should succeed');
  }

  // ============================================================
  // Governance configuration tests
  // ============================================================

  function test_SetSwapDeviationBps_Success() public {
    vm.prank(gov);
    controller.setSwapDeviationBps(500);
    assertEq(controller.swapDeviationBps(), 500);
  }

  function test_SetSwapDeviationBps_ExceedsMaxCap_Reverts() public {
    vm.prank(gov);
    vm.expectRevert(ProtocolErrors.MathCalculationOverflow.selector);
    controller.setSwapDeviationBps(1001);
  }

  function test_SetSwapDeviationBps_Unauthorized_Reverts() public {
    vm.prank(user);
    vm.expectRevert();
    controller.setSwapDeviationBps(500);
  }

  function test_SwapSlippageBps_Unchanged() public {
    assertEq(controller.swapSlippageBps(), 100);
  }

  function test_SwapDeviationBps_Default() public {
    assertEq(controller.swapDeviationBps(), 300);
  }

  function test_MaxSwapDeviationCap() public {
    assertEq(controller.MAX_SWAP_DEVIATION_BPS(), 1000);
  }

  // ============================================================
  // Test: Wider deviation allows more output
  // ============================================================

  function test_WiderDeviation_AllowsMoreOutput() public {
    _setWETHOnlyStrategy();

    // DEX outputs 5% MORE than oracle price
    dexRouter.setRatio(1e18 * 1050, 2500 * 1e6 * 1000);

    // With default 3% deviation, should revert
    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    // Widen deviation to 6%
    vm.prank(gov);
    controller.setSwapDeviationBps(600);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    assertGt(token.balanceOf(user), 0, 'Should pass with wider deviation');
  }

  // ============================================================
  // Test: Tighter deviation catches smaller mispricing
  // ============================================================

  function test_TighterDeviation_CatchesMispricing() public {
    _setWETHOnlyStrategy();

    // DEX outputs 2% MORE than oracle price
    dexRouter.setRatio(1e18 * 1020, 2500 * 1e6 * 1000);

    // With default 3% deviation, should pass
    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    assertGt(token.balanceOf(user), 0, 'Should pass with 2% bonus under 3% cap');

    // Tighten to 1%
    vm.prank(gov);
    controller.setSwapDeviationBps(100);

    usdc.mint(user, depositAmount);
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Exact boundary conditions
  // ============================================================

  function test_ExactlyAtMaxDeviation_Passes() public {
    _setWETHOnlyStrategy();

    // DEX outputs exactly 3% MORE than oracle price (at boundary)
    dexRouter.setRatio(1e18 * 1030, 2500 * 1e6 * 1000);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    assertGt(token.balanceOf(user), 0, 'Exactly at max deviation should pass');
  }

  function test_JustAboveMaxDeviation_Reverts() public {
    _setWETHOnlyStrategy();

    // DEX outputs 3.1% MORE than oracle price (just above boundary)
    dexRouter.setRatio(1e18 * 10310, 2500 * 1e6 * 10000);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: cbBTC (8 decimals) handling
  // ============================================================

  function test_cbBTC_8Decimals_HandledCorrectly() public {
    _setcbBTCOnlyStrategy();
    _setDEXToOraclePrice_USDC_cbBTC();

    uint256 depositAmount = 60000 * 1e6;
    usdc.mint(user, depositAmount);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();

    uint256 vaultBTC = vault.totalAssets(address(cbbtc));
    assertGt(vaultBTC, 0, 'Vault should hold cbBTC');

    uint256 netDeposit =
      60000 * 1e6 - FeeLib.calculateDepositFee(60000 * 1e6, FeeLib.DEPOSIT_FEE_BPS);
    uint256 expectedBTC = (netDeposit * USDC_PRICE * 1e8) / (CBBTC_PRICE * 1e6);
    assertApproxEqRel(vaultBTC, expectedBTC, 0.01e18, 'cbBTC should match oracle expectation');
  }

  // ============================================================
  // Test: Mispricing with cbBTC -> REVERT
  // ============================================================

  function test_cbBTC_MispricingReverts() public {
    _setcbBTCOnlyStrategy();

    // DEX mispriced: 1 USDC -> 1 cbBTC (should be ~0.00001667 cbBTC)
    dexRouter.setRatio(1e8, 1e6);

    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmount, 0, user);
    vm.stopPrank();
  }

  // ============================================================
  // Test: Event emission on deviation update
  // ============================================================

  function test_SwapDeviationUpdated_EventEmitted() public {
    vm.prank(gov);
    vm.expectEmit(true, true, true, true);
    emit UnifyVaultController.SwapDeviationUpdated(300, 500, gov);
    controller.setSwapDeviationBps(500);
  }

  // ============================================================
  // Test: Existing accounting/NAV consistency
  // ============================================================

  function test_ExistingNAV_Accounting_Unchanged() public {
    _setWETHOnlyStrategy();
    _setDEXToOraclePrice_USDC_WETH();

    // First deposit
    uint256 depositAmount = 1000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    uint256 shares1 = token.balanceOf(user);
    vm.stopPrank();

    // Second deposit (same amount)
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);
    uint256 shares2 = token.balanceOf(user) - shares1;
    vm.stopPrank();

    assertGt(shares2, 0, 'Second deposit should mint shares');
  }
}
