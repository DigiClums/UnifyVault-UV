// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/strategy/StrategyManager.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/swap/SwapAdapter.sol';
import '../../src/treasury/CostBasisManager.sol';
import { Treasury } from '../../src/vault/Treasury.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/libraries/FeeLib.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/interfaces/ISwapAdapter.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockTokenWithDecimals is ERC20 {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

/// @notice Mock DEX that delivers 99 % of the oracle-implied output to
/// simulate real-world slippage.  This creates a verifiable gap between
/// the input-asset oracle valuation and the post-swap realized USD value.
contract MockDEXWithSlippage {
  // 99 % = 9900 bps
  uint256 public constant SLIPPAGE_BPS = 9900;

  function exactInputSingle(
    IUniswapV3Router.ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

    uint8 inDec = MockTokenWithDecimals(params.tokenIn).decimals();
    uint8 outDec = MockTokenWithDecimals(params.tokenOut).decimals();

    // Same base rates as the original mock:
    // USDC (6 dec) -> cbBTC (8 dec) : 1 / 60000
    // USDC (6 dec) -> WETH (18 dec) : 1 / 3000
    // cbBTC / WETH -> USDC : inverse
    if (inDec == 6 && outDec == 8) {
      amountOut = (params.amountIn * 1e8) / (60000 * 1e6);
    } else if (inDec == 6 && outDec == 18) {
      amountOut = (params.amountIn * 1e18) / (3000 * 1e6);
    } else if (inDec == 8 && outDec == 6) {
      amountOut = (params.amountIn * 60000 * 1e6) / 1e8;
    } else if (inDec == 18 && outDec == 6) {
      amountOut = (params.amountIn * 3000 * 1e6) / 1e18;
    } else {
      amountOut = (params.amountIn * (10 ** outDec)) / (10 ** inDec);
    }

    // Apply slippage: deliver 99 % of oracle-implied output
    amountOut = (amountOut * SLIPPAGE_BPS) / 10000;

    MockTokenWithDecimals(params.tokenOut).mint(params.recipient, amountOut);
  }

  function exactInput(
    IUniswapV3Router.ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    amountOut = params.amountIn;
  }
}

contract CostBasisRealizedUSDTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  Treasury public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultController public controller;
  CostBasisManager public costBasisMgr;
  MockDEXWithSlippage public mockRouter;

  MockTokenWithDecimals public cbBTC;
  MockTokenWithDecimals public weth;
  MockTokenWithDecimals public usdc;

  address public admin = address(0x1);
  address public user = address(0x2);

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    treasury = new Treasury();

    token = new UVBTCETHToken();

    cbBTC = new MockTokenWithDecimals('Coinbase Wrapped BTC', 'cbBTC', 8);
    weth = new MockTokenWithDecimals('Wrapped Ether', 'WETH', 18);
    usdc = new MockTokenWithDecimals('USD Coin', 'USDC', 6);

    mockRouter = new MockDEXWithSlippage();
    swapAdapter = new SwapAdapter(admin, address(mockRouter));

    // Register Oracles: cbBTC = $60,000, WETH = $3,000, USDC = $1.00
    bytes32 btcId = bytes32(uint256(uint160(address(cbBTC))));
    bytes32 ethId = bytes32(uint256(uint160(address(weth))));
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));

    oracleProvider.registerAsset(btcId, 60000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(ethId, 3000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);

    oracleManager.configureAsset(btcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(ethId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Strategy Allocation: 60% cbBTC, 40% WETH
    address[] memory assets = new address[](2);
    assets[0] = address(cbBTC);
    assets[1] = address(weth);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000;
    weights[1] = 4000;

    strategyManager = new StrategyManager(admin, assets, weights);

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    costBasisMgr = new CostBasisManager(admin, address(directory));

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register all Module IDs
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisMgr));

    // Sync CostBasisManager modules
    vm.prank(admin);
    costBasisMgr.syncModules();

    // Register assets
    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(cbBTC), 8);
    vault.registerAsset(address(weth), 18);
    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(cbBTC), 8);
    treasury.registerAsset(address(weth), 18);

    // Grant Controller roles
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Fund user
    usdc.mint(user, 100000 * 1e6);
  }

  // --- Helpers to compute expected values ---

  /// @dev Computes the realized USD value the controller will derive from a deposit.
  /// Mimics _executeMultiAssetSwaps + _swapAndDepositTargetAsset logic.
  function _expectedRealizedUSD(uint256 netDeposit) internal pure returns (uint256) {
    uint256 btcAlloc = (netDeposit * 6000) / 10000;
    uint256 wethAlloc = netDeposit - btcAlloc;

    // cbBTC swap with slippage (SLIPPAGE_BPS = 9900)
    uint256 btcBought = (btcAlloc * 1e8) / (60000 * 1e6);
    btcBought = (btcBought * 9900) / 10000;
    uint256 btcValue = (btcBought * 60000 * 1e18) / 1e8;

    // WETH swap with slippage (SLIPPAGE_BPS = 9900)
    uint256 ethBought = (wethAlloc * 1e18) / (3000 * 1e6);
    ethBought = (ethBought * 9900) / 10000;
    uint256 ethValue = (ethBought * 3000 * 1e18) / 1e18;

    return btcValue + ethValue;
  }

  /// @dev Computes the old input-oracle USD valuation (what the legacy code produced).
  function _oldInputOracleUSD(uint256 netDeposit) internal pure returns (uint256) {
    // depositPrice = 1 * 1e18 (USDC), depositDecimals = 6
    return (netDeposit * 1e18) / (10 ** 6);
  }

  // ---------------------------------------------------------------------------
  // Test 1: Cost basis equals realizedDepositUSD
  // ---------------------------------------------------------------------------

  function test_CostBasisEqualsRealizedDepositUSD() public {
    uint256 depositAmt = 10000 * 1e6;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 netDeposit = depositAmt - fee;

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 expectedRealized = _expectedRealizedUSD(netDeposit);
    uint256 actualCostBasis = costBasisMgr.costBasis(user);

    assertEq(actualCostBasis, expectedRealized, 'Cost basis must equal realizedDepositUSD');
  }

  // ---------------------------------------------------------------------------
  // Test 2: Cost basis does NOT use input-oracle valuation
  // ---------------------------------------------------------------------------

  function test_CostBasisDoesNotUseInputOracleValuation() public {
    uint256 depositAmt = 10000 * 1e6;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 netDeposit = depositAmt - fee;

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 actualCostBasis = costBasisMgr.costBasis(user);
    uint256 oldStyleValuation = _oldInputOracleUSD(netDeposit);

    // Because of the 1 % DEX slippage, the two valuations differ
    assertLt(
      actualCostBasis,
      oldStyleValuation,
      'Cost basis must be lower than input-oracle valuation'
    );
    assertNotEq(
      actualCostBasis,
      oldStyleValuation,
      'Cost basis must NOT use input-oracle valuation'
    );
  }

  // ---------------------------------------------------------------------------
  // Test 3: Share minting and cost basis use the same USD valuation
  // ---------------------------------------------------------------------------

  function test_SharesAndCostBasisUseSameValuation() public {
    uint256 depositAmt = 10000 * 1e6;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 netDeposit = depositAmt - fee;

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 expectedRealized = _expectedRealizedUSD(netDeposit);
    uint256 actualCostBasis = costBasisMgr.costBasis(user);

    // Shares are computed from realizedDepositUSD in _calculateAndMintDepositShares.
    // Cost basis is also recorded from realizedDepositUSD.
    // So they must be consistent: costBasis == realizedDepositUSD.
    assertEq(actualCostBasis, expectedRealized, 'Cost basis == realized USD');

    // For the first-ever deposit (bootstrap), shares == realizedDepositUSD - DEAD_SHARES
    uint256 shares = token.balanceOf(user);
    uint256 expectedShares = expectedRealized - controller.DEAD_SHARES();
    assertEq(shares, expectedShares, 'Shares minted from same realized USD base');
  }

  // ---------------------------------------------------------------------------
  // Test 4: Multiple mints accumulate cost basis correctly
  // ---------------------------------------------------------------------------

  function test_MultipleMintsAccumulateCostBasis() public {
    // Batch 1
    uint256 deposit1 = 10000 * 1e6;
    uint256 fee1 = FeeLib.calculateDepositFee(deposit1);
    uint256 net1 = deposit1 - fee1;

    vm.startPrank(user);
    usdc.approve(address(controller), deposit1);
    controller.deposit(address(usdc), deposit1, 0, user);
    vm.stopPrank();

    uint256 realized1 = _expectedRealizedUSD(net1);
    uint256 basis1 = costBasisMgr.costBasis(user);
    assertEq(basis1, realized1, 'Batch 1 cost basis');

    uint256 shares1 = token.balanceOf(user);

    // Batch 2 — mint more USDC to user
    usdc.mint(user, 20000 * 1e6);
    uint256 deposit2 = 11000 * 1e6;
    uint256 fee2 = FeeLib.calculateDepositFee(deposit2);
    uint256 net2 = deposit2 - fee2;

    vm.startPrank(user);
    usdc.approve(address(controller), deposit2);
    controller.deposit(address(usdc), deposit2, 0, user);
    vm.stopPrank();

    uint256 realized2 = _expectedRealizedUSD(net2);
    uint256 totalBasis = costBasisMgr.costBasis(user);

    assertEq(totalBasis, realized1 + realized2, 'Total cost basis = sum of realized USD values');

    uint256 shares2 = token.balanceOf(user);
    assertGt(shares2, shares1, 'Shares increased after second mint');
  }

  // ---------------------------------------------------------------------------
  // Test 5: averageEntryPrice() == totalCostBasis / currentUserShares
  // ---------------------------------------------------------------------------

  function test_AverageEntryPriceFormula() public {
    // Batch 1
    uint256 deposit1 = 10000 * 1e6;
    uint256 fee1 = FeeLib.calculateDepositFee(deposit1);
    uint256 net1 = deposit1 - fee1;

    vm.startPrank(user);
    usdc.approve(address(controller), deposit1);
    controller.deposit(address(usdc), deposit1, 0, user);
    vm.stopPrank();

    // Batch 2
    usdc.mint(user, 20000 * 1e6);
    uint256 deposit2 = 11000 * 1e6;
    uint256 fee2 = FeeLib.calculateDepositFee(deposit2);
    uint256 net2 = deposit2 - fee2;

    vm.startPrank(user);
    usdc.approve(address(controller), deposit2);
    controller.deposit(address(usdc), deposit2, 0, user);
    vm.stopPrank();

    uint256 totalBasis = costBasisMgr.costBasis(user);
    uint256 userShares = token.balanceOf(user);

    // averageEntryPrice should be totalCostBasis / currentUserShares (scaled by 1e18)
    uint256 expectedAvgPrice = (totalBasis * 1e18) / userShares;
    uint256 actualAvgPrice = costBasisMgr.averageEntryPrice(user);

    assertEq(
      actualAvgPrice,
      expectedAvgPrice,
      'averageEntryPrice == totalCostBasis / currentUserShares'
    );
  }

  // ---------------------------------------------------------------------------
  // Test 6: Redemption cost-basis reduction still works after fix
  // ---------------------------------------------------------------------------

  function test_RedemptionCostBasisReductionStillWorks() public {
    // Deposit
    uint256 depositAmt = 10000 * 1e6;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 netDeposit = depositAmt - fee;

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 costBasisBefore = costBasisMgr.costBasis(user);
    assertGt(costBasisBefore, 0, 'Should have non-zero cost basis before redeem');

    uint256 userSharesBefore = token.balanceOf(user);
    uint256 sharesToRedeem = userSharesBefore / 2; // Redeem 50 %

    vm.startPrank(user);
    token.approve(address(controller), sharesToRedeem);
    controller.redeem(address(usdc), sharesToRedeem, 0, user, block.timestamp + 100);
    vm.stopPrank();

    uint256 costBasisAfter = costBasisMgr.costBasis(user);

    // Cost basis should be reduced proportionally
    assertLt(costBasisAfter, costBasisBefore, 'Cost basis reduced after partial redeem');
    assertGt(costBasisAfter, 0, 'Non-zero cost basis after partial redeem');

    // Verify proportional reduction
    uint256 remainingShares = token.balanceOf(user);
    uint256 expectedRemainingBasis = (costBasisBefore * remainingShares) / userSharesBefore;
    assertApproxEqRel(
      costBasisAfter,
      expectedRemainingBasis,
      0.0001e18,
      'Proportional cost basis reduction'
    );

    // Full redemption should reset cost basis
    uint256 allRemaining = token.balanceOf(user);
    vm.startPrank(user);
    token.approve(address(controller), allRemaining);
    controller.redeem(address(usdc), allRemaining, 0, user, block.timestamp + 100);
    vm.stopPrank();

    assertEq(costBasisMgr.costBasis(user), 0, 'Cost basis resets to zero after full redemption');
  }
}
