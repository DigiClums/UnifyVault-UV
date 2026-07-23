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
import '../../src/libraries/AccessRoles.sol';
import '../../src/libraries/FeeLib.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/interfaces/IPortfolioManager.sol';
import '../../src/interfaces/ISwapAdapter.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasuryForLive {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockTokenForLiveEngine is ERC20 {
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

contract MockDEXRouterForLiveEngine {
  bool public shouldRevert = false;

  function setShouldRevert(bool _revert) external {
    shouldRevert = _revert;
  }

  function exactInputSingle(
    IUniswapV3Router.ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (shouldRevert) revert('MockDEXRouter: SWAP_FAILED');

    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

    // Mock exchange rates:
    // USDC (6 dec) -> cbBTC (8 dec): 60,000 USD per BTC => amountOut = (amountIn * 1e8) / (60000 * 1e6)
    // USDC (6 dec) -> WETH (18 dec): 3,000 USD per ETH => amountOut = (amountIn * 1e18) / (3000 * 1e6)
    // cbBTC (8 dec) -> USDC (6 dec): amountOut = (amountIn * 60000 * 1e6) / 1e8
    // WETH (18 dec) -> USDC (6 dec): amountOut = (amountIn * 3000 * 1e6) / 1e18

    uint8 inDec = MockTokenForLiveEngine(params.tokenIn).decimals();
    uint8 outDec = MockTokenForLiveEngine(params.tokenOut).decimals();

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

    MockTokenForLiveEngine(params.tokenOut).mint(params.recipient, amountOut);
  }

  function exactInput(
    IUniswapV3Router.ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (shouldRevert) revert('MockDEXRouter: MULTI_SWAP_FAILED');
    amountOut = params.amountIn;
  }
}

contract LiveExecutionEngineTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasuryForLive public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultController public controller;
  MockDEXRouterForLiveEngine public mockRouter;

  MockTokenForLiveEngine public cbBTC;
  MockTokenForLiveEngine public weth;
  MockTokenForLiveEngine public usdc;

  address public admin = address(0x1);
  address public user = address(0x2);

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasuryForLive(treasuryAddr);

    token = new UVBTCETHToken();

    cbBTC = new MockTokenForLiveEngine('Coinbase Wrapped BTC', 'cbBTC', 8);
    weth = new MockTokenForLiveEngine('Wrapped Ether', 'WETH', 18);
    usdc = new MockTokenForLiveEngine('USD Coin', 'USDC', 6);

    mockRouter = new MockDEXRouterForLiveEngine();
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
    weights[0] = 6000; // 60%
    weights[1] = 4000; // 40%

    strategyManager = new StrategyManager(admin, assets, weights);

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register Module IDs in ProtocolDirectory
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // Register assets in CustodyVault & Treasury
    vault.registerAsset(address(cbBTC), 8);
    vault.registerAsset(address(weth), 18);
    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(cbBTC), 8);
    treasury.registerAsset(address(weth), 18);

    // Grant Controller roles
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Mint USDC to user
    usdc.mint(user, 100000 * 1e6);
  }

  // --- Test 1: Successful Live Deposit Execution ---

  function test_SuccessfulLiveDepositExecution() public {
    uint256 depositAmt = 10000 * 1e6; // 10,000 USDC
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 netDeposit = depositAmt - fee;

    // 60% of netDeposit -> cbBTC
    // 40% of netDeposit -> WETH
    uint256 expectedBtcBought = (netDeposit * 6000 * 1e8) / (10000 * 60000 * 1e6);
    uint256 expectedEthBought = (netDeposit * 4000 * 1e18) / (10000 * 3000 * 1e6);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      user
    );
    vm.stopPrank();

    // 1. Verify Shares & Fee Routing
    assertGt(quote.sharesPreview, 0);
    assertEq(token.balanceOf(user), quote.sharesPreview);
    assertEq(usdc.balanceOf(address(treasury)), fee);

    // 2. Verify CustodyVault received live swapped assets
    assertEq(vault.totalAssets(address(cbBTC)), expectedBtcBought);
    assertEq(vault.totalAssets(address(weth)), expectedEthBought);

    // 3. Verify Zero Retained Balances on Controller & SwapAdapter
    assertEq(usdc.balanceOf(address(controller)), 0);
    assertEq(cbBTC.balanceOf(address(controller)), 0);
    assertEq(weth.balanceOf(address(controller)), 0);

    assertEq(usdc.balanceOf(address(swapAdapter)), 0);
    assertEq(cbBTC.balanceOf(address(swapAdapter)), 0);
    assertEq(weth.balanceOf(address(swapAdapter)), 0);
  }

  // --- Test 2: Successful Live Redeem Execution ---

  function test_SuccessfulLiveRedeemExecution() public {
    // 1. First Deposit
    uint256 depositAmt = 10000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 userShares = token.balanceOf(user);

    // 2. Redeem all shares for USDC payout
    vm.startPrank(user);
    token.approve(address(controller), userShares);
    uint256 netUsdcRedeemed = controller.redeem(
      address(usdc),
      userShares,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    // 3. Verify Shares Burned & Payout Received
    assertEq(token.balanceOf(user), 0);
    assertGt(netUsdcRedeemed, 0);

    // 4. Verify CustodyVault balances released
    assertEq(vault.totalAssets(address(cbBTC)), 0);
    assertEq(vault.totalAssets(address(weth)), 0);

    // 5. Verify Zero Retained Balances on Controller
    assertEq(usdc.balanceOf(address(controller)), 0);
    assertEq(cbBTC.balanceOf(address(controller)), 0);
    assertEq(weth.balanceOf(address(controller)), 0);
  }

  // --- Test 3: Atomic Swap Failure Protection ---

  function test_SwapFailureAtomicRevert() public {
    mockRouter.setShouldRevert(true);

    uint256 depositAmt = 10000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);

    vm.expectRevert('MockDEXRouter: SWAP_FAILED');
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    // Verify No Partial Execution / State Retained
    assertEq(token.balanceOf(user), 0);
    assertEq(vault.totalAssets(address(cbBTC)), 0);
    assertEq(vault.totalAssets(address(weth)), 0);
  }

  // --- Test 4: Oracle Failure Protection ---

  function test_OracleFailureRevert() public {
    // Disable cbBTC Oracle
    bytes32 btcId = bytes32(uint256(uint160(address(cbBTC))));
    oracleManager.setAssetEnabled(btcId, false);

    uint256 depositAmt = 10000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);

    vm.expectRevert();
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();
  }

  // --- Test 5: Slippage Failure Protection ---

  function test_SlippageFailureRevert() public {
    uint256 depositAmt = 10000 * 1e6;
    uint256 impossibleMinShares = 1e30; // Unreasonable minSharesOut

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);

    vm.expectRevert();
    controller.deposit(address(usdc), depositAmt, impossibleMinShares, user);
    vm.stopPrank();
  }
}
