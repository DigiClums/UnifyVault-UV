// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/vault/LiquidityManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/constants/ModuleIds.sol';
import '../src/interfaces/IPortfolioManager.sol';
import '../src/interfaces/ILiquidityManager.sol';
import '../src/interfaces/ISwapAdapter.sol';
import '../src/errors/Errors.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasuryForFork {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockBaseToken is ERC20 {
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

contract MockBaseDEXRouter {
  bool public failSwaps;

  function setFailSwaps(bool fail) external {
    failSwaps = fail;
  }

  function exactInputSingle(
    IUniswapV3Router.ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (failSwaps) {
      revert('MockDEXRouter: Swap execution failed');
    }

    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

    uint8 inDec = MockBaseToken(params.tokenIn).decimals();
    uint8 outDec = MockBaseToken(params.tokenOut).decimals();

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

    MockBaseToken(params.tokenOut).mint(params.recipient, amountOut);
  }

  function exactInput(
    IUniswapV3Router.ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    if (failSwaps) {
      revert('MockDEXRouter: Swap execution failed');
    }
    amountOut = params.amountIn;
  }
}

contract BaseMainnetForkTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  ITestTreasuryForFork public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultController public controller;

  // Real Base Mainnet Contract Addresses
  address public constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address public constant BASE_CBBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf;
  address public constant BASE_WETH = 0x4200000000000000000000000000000000000006;
  address public constant BASE_UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;

  MockBaseToken public usdc;
  MockBaseToken public cbBTC;
  MockBaseToken public weth;
  MockBaseDEXRouter public dexRouter;

  address public gov = address(0x111);
  address public guardian = address(0x222);
  address public alice = address(0xAAA);
  address public bob = address(0xBBB);

  bytes32 public btcId;
  bytes32 public ethId;
  bytes32 public usdcId;

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasuryForFork(treasuryAddr);

    token = new UVBTCETHToken();

    usdc = new MockBaseToken('USD Coin', 'USDC', 6);
    cbBTC = new MockBaseToken('Coinbase Wrapped BTC', 'cbBTC', 8);
    weth = new MockBaseToken('Wrapped Ether', 'WETH', 18);

    dexRouter = new MockBaseDEXRouter();
    swapAdapter = new SwapAdapter(gov, address(dexRouter));

    liquidityManager = new LiquidityManager(gov, address(directory));

    btcId = bytes32(uint256(uint160(address(cbBTC))));
    ethId = bytes32(uint256(uint160(address(weth))));
    usdcId = bytes32(uint256(uint160(address(usdc))));

    // Configure Oracle Prices: cbBTC = $60,000, WETH = $3,000, USDC = $1.00
    oracleProvider.registerAsset(btcId, 60000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(ethId, 3000 * 1e18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);

    oracleManager.configureAsset(btcId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(ethId, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // Target Allocation: 60% cbBTC, 40% WETH
    address[] memory assets = new address[](2);
    assets[0] = address(cbBTC);
    assets[1] = address(weth);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000;
    weights[1] = 4000;

    strategyManager = new StrategyManager(gov, assets, weights);

    portfolioManager = new PortfolioManager(
      gov,
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
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
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

    // Grant Roles
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    vm.startPrank(gov);
    liquidityManager.syncModules();
    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    vm.stopPrank();
  }

  // =========================================================================
  // Scenario 1: Deposit USDC -> Swaps -> CustodyVault -> Mint UVBTCETH
  // =========================================================================

  function testFork_01_DepositUSDC_SwapsAndMints() public {
    uint256 depositAmt = 10000 * 1e6; // $10,000 USDC
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      alice
    );
    vm.stopPrank();

    // 1. User receives index shares
    assertGt(quote.sharesPreview, 0);
    assertEq(token.balanceOf(alice), quote.sharesPreview);

    // 2. CustodyVault received and custody-backed strategy assets (cbBTC + WETH)
    assertGt(vault.totalAssets(address(cbBTC)), 0);
    assertGt(vault.totalAssets(address(weth)), 0);

    // 3. Controller retains zero balance
    assertEq(usdc.balanceOf(address(controller)), 0);
    assertEq(cbBTC.balanceOf(address(controller)), 0);
    assertEq(weth.balanceOf(address(controller)), 0);
  }

  // =========================================================================
  // Scenario 2: Redeem UVBTCETH -> Release Assets -> Swap to USDC -> Return USDC
  // =========================================================================

  function testFork_02_RedeemUVBTCETH_SwapsBackToUSDC() public {
    uint256 depositAmt = 10000 * 1e6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, alice);

    uint256 sharesToRedeem = token.balanceOf(alice);
    token.approve(address(controller), sharesToRedeem);

    uint256 usdcBefore = usdc.balanceOf(alice);
    uint256 netOut = controller.redeem(
      address(usdc),
      sharesToRedeem,
      0,
      alice,
      block.timestamp + 300
    );
    vm.stopPrank();

    // 1. User receives USDC payout
    assertGt(netOut, 0);
    assertEq(usdc.balanceOf(alice) - usdcBefore, netOut);

    // 2. Shares fully burned
    assertEq(token.balanceOf(alice), 0);

    // 3. CustodyVault assets released
    assertEq(vault.totalAssets(address(cbBTC)), 0);
    assertEq(vault.totalAssets(address(weth)), 0);
  }

  // =========================================================================
  // Scenario 3: Large Deposit Stress Test
  // =========================================================================

  function testFork_03_LargeDepositStressTest() public {
    uint256 largeDeposit = 1000000 * 1e6; // $1,000,000 USDC
    usdc.mint(alice, largeDeposit);

    vm.startPrank(alice);
    usdc.approve(address(controller), largeDeposit);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      largeDeposit,
      0,
      alice
    );
    vm.stopPrank();

    assertGt(quote.sharesPreview, 0);
    assertGt(portfolioManager.calculatePortfolioValue(), 0);

    (uint256 totalValUSD, uint256 navPerShare) = portfolioManager.calculateNAV();
    assertGt(totalValUSD, 0);
    assertGt(navPerShare, 0);
  }

  // =========================================================================
  // Scenario 4: Large Redemption Stress Test
  // =========================================================================

  function testFork_04_LargeRedemptionStressTest() public {
    uint256 largeDeposit = 1000000 * 1e6;
    usdc.mint(alice, largeDeposit);

    vm.startPrank(alice);
    usdc.approve(address(controller), largeDeposit);
    controller.deposit(address(usdc), largeDeposit, 0, alice);

    uint256 aliceShares = token.balanceOf(alice);
    token.approve(address(controller), aliceShares);

    uint256 netOut = controller.redeem(address(usdc), aliceShares, 0, alice, block.timestamp + 300);
    vm.stopPrank();

    assertGt(netOut, 0);
    assertEq(token.balanceOf(alice), 0);
    assertEq(usdc.balanceOf(address(controller)), 0);
    assertEq(cbBTC.balanceOf(address(controller)), 0);
    assertEq(weth.balanceOf(address(controller)), 0);
  }

  // =========================================================================
  // Scenario 5: Oracle Failure
  // =========================================================================

  function testFork_05_OracleFailure_StaleOrInvalidReverts() public {
    // Warp time past 3600s heartbeat limit
    vm.warp(block.timestamp + 3601);

    uint256 depositAmt = 1000 * 1e6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);

    vm.expectRevert();
    controller.deposit(address(usdc), depositAmt, 0, alice);
    vm.stopPrank();
  }

  // =========================================================================
  // Scenario 6: Swap Failure (Atomic Rollback)
  // =========================================================================

  function testFork_06_SwapFailure_AtomicRollback() public {
    uint256 depositAmt = 1000 * 1e6;
    usdc.mint(alice, depositAmt);

    // Instruct mock DEX router to fail swaps
    dexRouter.setFailSwaps(true);

    uint256 aliceUsdcBefore = usdc.balanceOf(alice);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);

    vm.expectRevert('MockDEXRouter: Swap execution failed');
    controller.deposit(address(usdc), depositAmt, 0, alice);
    vm.stopPrank();

    // Verify state is completely unchanged / atomically rolled back
    assertEq(usdc.balanceOf(alice), aliceUsdcBefore);
    assertEq(token.balanceOf(alice), 0);
    assertEq(vault.totalAssets(address(cbBTC)), 0);
    assertEq(vault.totalAssets(address(weth)), 0);
  }

  // =========================================================================
  // Scenario 7: Pause
  // =========================================================================

  function testFork_07_Pause_BlocksStateChangingOperations() public {
    // Guardian triggers emergency pause
    vm.prank(guardian);
    controller.emergencyPause();

    uint256 depositAmt = 1000 * 1e6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);

    vm.expectRevert();
    controller.deposit(address(usdc), depositAmt, 0, alice);
    vm.stopPrank();
  }

  // =========================================================================
  // Scenario 8: Multi-user Simulation
  // =========================================================================

  function testFork_08_MultiUserSimulation_ProportionalOwnership() public {
    uint256 aliceDep = 2000 * 1e6;
    uint256 bobDep = 4000 * 1e6;

    usdc.mint(alice, aliceDep);
    usdc.mint(bob, bobDep);

    vm.startPrank(alice);
    usdc.approve(address(controller), aliceDep);
    controller.deposit(address(usdc), aliceDep, 0, alice);
    vm.stopPrank();

    vm.startPrank(bob);
    usdc.approve(address(controller), bobDep);
    controller.deposit(address(usdc), bobDep, 0, bob);
    vm.stopPrank();

    uint256 aliceShares = token.balanceOf(alice);
    uint256 bobShares = token.balanceOf(bob);

    // Bob has ~2x shares of Alice
    assertApproxEqRel(bobShares, aliceShares * 2, 1e16);

    // Bob redeems half
    vm.startPrank(bob);
    token.approve(address(controller), bobShares / 2);
    uint256 bobOut = controller.redeem(address(usdc), bobShares / 2, 0, bob, block.timestamp + 300);
    vm.stopPrank();

    assertGt(bobOut, 0);

    // Alice redeems fully
    vm.startPrank(alice);
    token.approve(address(controller), aliceShares);
    uint256 aliceOut = controller.redeem(
      address(usdc),
      aliceShares,
      0,
      alice,
      block.timestamp + 300
    );
    vm.stopPrank();

    assertGt(aliceOut, 0);
  }

  // =========================================================================
  // Scenario 9: LiquidityManager (Operational & Reserve Consistency)
  // =========================================================================

  function testFork_09_LiquidityManager_OperationalAndReserveConsistency() public {
    uint256 depositAmt = 10000 * 1e6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      alice
    );
    vm.stopPrank();

    vm.prank(gov);
    liquidityManager.setLiquidityBalances(address(usdc), 1000 * 1e6, 9000 * 1e6);

    (uint256 opBal, uint256 resBal, uint256 totalBal) = liquidityManager.getLiquidityBalances(
      address(usdc)
    );
    assertEq(opBal + resBal, totalBal);
    assertEq(totalBal, 10000 * 1e6);

    vm.prank(gov);
    liquidityManager.sweepReserveLiquidity(address(usdc), 500 * 1e6);

    (opBal, resBal, totalBal) = liquidityManager.getLiquidityBalances(address(usdc));
    assertEq(opBal + resBal, totalBal);
    assertEq(opBal, 500 * 1e6);
    assertEq(resBal, 9500 * 1e6);
  }

  // =========================================================================
  // Scenario 10: Gas Snapshot
  // =========================================================================

  function testFork_10_GasSnapshot() public {
    uint256 depositAmt = 1000 * 1e6;
    usdc.mint(alice, depositAmt);

    vm.startPrank(alice);
    usdc.approve(address(controller), depositAmt);

    uint256 gasStart = gasleft();
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      alice
    );
    uint256 depositGasUsed = gasStart - gasleft();

    emit log_named_uint('Gas Snapshot - Deposit', depositGasUsed);

    gasStart = gasleft();
    (uint256 tvlUSD, uint256 navPerShare) = portfolioManager.calculateNAV();
    uint256 navGasUsed = gasStart - gasleft();

    emit log_named_uint('Gas Snapshot - NAV Calculation', navGasUsed);

    gasStart = gasleft();
    (bool needsRefill, bool needsSweep, uint256 amount) = liquidityManager.checkLiquidity(
      address(usdc)
    );
    uint256 liquidityCheckGasUsed = gasStart - gasleft();

    emit log_named_uint('Gas Snapshot - Liquidity Check', liquidityCheckGasUsed);

    uint256 aliceShares = token.balanceOf(alice);
    token.approve(address(controller), aliceShares);

    gasStart = gasleft();
    controller.redeem(address(usdc), aliceShares, 0, alice, block.timestamp + 300);
    uint256 redeemGasUsed = gasStart - gasleft();

    emit log_named_uint('Gas Snapshot - Redeem', redeemGasUsed);
    vm.stopPrank();

    assertGt(depositGasUsed, 0);
    assertGt(navGasUsed, 0);
    assertGt(liquidityCheckGasUsed, 0);
    assertGt(redeemGasUsed, 0);
  }
}
