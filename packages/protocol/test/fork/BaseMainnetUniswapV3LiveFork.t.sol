// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console } from 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/ChainlinkOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/vault/LiquidityManager.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/strategy/StrategyManager.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/swap/SwapAdapter.sol';
import '../../src/treasury/FeeManager.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/constants/ModuleIds.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
}

interface ITreasuryFork {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

// SwapRouter02 adapter to match standard SwapRouter02 interface (where deadline is passed outside ExactInputSingleParams)
contract SwapRouter02Adapter {
  address public immutable swapRouter02;

  struct ExactInputSingleParams01 {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactInputSingleParams02 {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactInputParams01 {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
  }

  struct ExactInputParams02 {
    bytes path;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
  }

  constructor(address _swapRouter02) {
    swapRouter02 = _swapRouter02;
  }

  function exactInputSingle(
    ExactInputSingleParams01 calldata params
  ) external payable returns (uint256 amountOut) {
    require(block.timestamp <= params.deadline, 'Transaction too old');
    IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    IERC20(params.tokenIn).approve(swapRouter02, params.amountIn);

    bytes memory data = abi.encodeWithSelector(
      0x04e45aaf, // exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))
      ExactInputSingleParams02({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: params.sqrtPriceLimitX96
      })
    );

    (bool success, bytes memory returnData) = swapRouter02.call(data);
    require(success, 'SwapRouter02 call failed');
    amountOut = abi.decode(returnData, (uint256));
  }

  function exactInput(
    ExactInputParams01 calldata params
  ) external payable returns (uint256 amountOut) {
    require(block.timestamp <= params.deadline, 'Transaction too old');
    // Decode tokenIn from path
    address tokenIn;
    bytes memory path = params.path;
    assembly {
      tokenIn := mload(add(path, 20))
    }
    IERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
    IERC20(tokenIn).approve(swapRouter02, params.amountIn);

    bytes memory data = abi.encodeWithSelector(
      0xb858183f, // exactInput((bytes,address,uint256,uint256))
      ExactInputParams02({
        path: params.path,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum
      })
    );

    (bool success, bytes memory returnData) = swapRouter02.call(data);
    require(success, 'SwapRouter02 exactInput failed');
    amountOut = abi.decode(returnData, (uint256));
  }
}

contract BaseMainnetUniswapV3LiveForkTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Real Base Mainnet Addresses
  address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // 6 decimals
  address public constant CBBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf; // 8 decimals
  address public constant WETH = 0x4200000000000000000000000000000000000006; // 18 decimals

  // Real Base Mainnet Chainlink Feeds
  address public constant USDC_FEED = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B;
  address public constant CBBTC_FEED = 0x8C74B2811D2F1aD65517ADB5C65773c1E520ed2f;
  address public constant ETH_FEED = 0xe6eb5B9b85cFF2C84Df3De6e7855bC9E76f034d5;

  // Real Base Mainnet SwapRouter02
  address public constant BASE_MAINNET_SWAP_ROUTER_02 = 0x2626664c2603336E57B271c5C0b26F421741e481;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  ITreasuryFork public treasury;
  FeeManager public feeManager;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  SwapRouter02Adapter public routerAdapter;
  UnifyVaultController public controller;

  address public deployer = address(0x999);
  address public alice = address(0xAAA);

  function setUp() public {
    vmExt.createSelectFork('https://mainnet.base.org');

    vm.startPrank(deployer);

    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITreasuryFork(treasuryAddr);
    feeManager = new FeeManager(address(treasury));

    token = new UVBTCETHToken();
    liquidityManager = new LiquidityManager(deployer, address(directory));

    // Deploy SwapRouter02 adapter and SwapAdapter
    routerAdapter = new SwapRouter02Adapter(BASE_MAINNET_SWAP_ROUTER_02);
    swapAdapter = new SwapAdapter(deployer, address(routerAdapter));

    // 60/40 Strategy: 60% cbBTC (6000 BPS), 40% WETH (4000 BPS)
    address[] memory strategyAssets = new address[](2);
    strategyAssets[0] = CBBTC;
    strategyAssets[1] = WETH;
    uint256[] memory strategyWeights = new uint256[](2);
    strategyWeights[0] = 6000;
    strategyWeights[1] = 4000;

    strategyManager = new StrategyManager(deployer, strategyAssets, strategyWeights);

    portfolioManager = new PortfolioManager(
      deployer,
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

    // Register Modules in ProtocolDirectory
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // Configure Oracles with real Chainlink feeds
    bytes32 usdcId = bytes32(uint256(uint160(USDC)));
    bytes32 cbbtcId = bytes32(uint256(uint160(CBBTC)));
    bytes32 wethId = bytes32(uint256(uint160(WETH)));

    chainlinkProvider.registerFeed(usdcId, USDC_FEED, 86400);
    chainlinkProvider.registerFeed(cbbtcId, CBBTC_FEED, 86400);
    chainlinkProvider.registerFeed(wethId, ETH_FEED, 86400);

    oracleManager.configureAsset(usdcId, address(chainlinkProvider), address(0), 86400, true);
    oracleManager.configureAsset(cbbtcId, address(chainlinkProvider), address(0), 86400, true);
    oracleManager.configureAsset(wethId, address(chainlinkProvider), address(0), 86400, true);

    // Register assets in Vault & Treasury
    vault.registerAsset(USDC, 6);
    vault.registerAsset(CBBTC, 8);
    vault.registerAsset(WETH, 18);

    treasury.registerAsset(USDC, 6);
    treasury.registerAsset(CBBTC, 8);
    treasury.registerAsset(WETH, 18);

    // Set controller slippage to 1.00% (100 bps)
    controller.setSwapSlippageBps(100);

    // Permissions
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    token.revokeRole(token.CONTROLLER_ROLE(), deployer);
    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    liquidityManager.syncModules();
    portfolioManager.syncModules();

    vm.stopPrank();
  }

  // 1. Direct Swap Tests via SwapAdapter on Real Uniswap V3 Pools
  function testFork_SwapAdapter_DirectSwaps() public {
    deal(USDC, alice, 10000 * 1e6);

    vm.startPrank(alice);
    IERC20(USDC).approve(address(swapAdapter), 10000 * 1e6);

    // Swap 1000 USDC -> WETH (using 500 fee tier)
    ISwapAdapter.ExactInputParams memory paramsWeth = ISwapAdapter.ExactInputParams({
      tokenIn: USDC,
      tokenOut: WETH,
      fee: 500,
      recipient: alice,
      deadline: block.timestamp + 300,
      amountIn: 1000 * 1e6,
      minAmountOut: 0,
      path: ''
    });
    uint256 wethOut = swapAdapter.swapExactInput(paramsWeth);
    assertGt(wethOut, 0, 'WETH out should be > 0');
    assertEq(IERC20(WETH).balanceOf(alice), wethOut);

    // Swap 1000 USDC -> cbBTC (using 500 fee tier)
    ISwapAdapter.ExactInputParams memory paramsCbbtc = ISwapAdapter.ExactInputParams({
      tokenIn: USDC,
      tokenOut: CBBTC,
      fee: 500,
      recipient: alice,
      deadline: block.timestamp + 300,
      amountIn: 1000 * 1e6,
      minAmountOut: 0,
      path: ''
    });
    uint256 cbbtcOut = swapAdapter.swapExactInput(paramsCbbtc);
    assertGt(cbbtcOut, 0, 'cbBTC out should be > 0');
    assertEq(IERC20(CBBTC).balanceOf(alice), cbbtcOut);

    // Reverse Swaps: WETH -> USDC
    IERC20(WETH).approve(address(swapAdapter), wethOut);
    ISwapAdapter.ExactInputParams memory paramsRevWeth = ISwapAdapter.ExactInputParams({
      tokenIn: WETH,
      tokenOut: USDC,
      fee: 500,
      recipient: alice,
      deadline: block.timestamp + 300,
      amountIn: wethOut,
      minAmountOut: 0,
      path: ''
    });
    uint256 usdcFromWeth = swapAdapter.swapExactInput(paramsRevWeth);
    assertGt(usdcFromWeth, 0, 'USDC from WETH should be > 0');

    // Reverse Swaps: cbBTC -> USDC
    IERC20(CBBTC).approve(address(swapAdapter), cbbtcOut);
    ISwapAdapter.ExactInputParams memory paramsRevCbbtc = ISwapAdapter.ExactInputParams({
      tokenIn: CBBTC,
      tokenOut: USDC,
      fee: 500,
      recipient: alice,
      deadline: block.timestamp + 300,
      amountIn: cbbtcOut,
      minAmountOut: 0,
      path: ''
    });
    uint256 usdcFromCbbtc = swapAdapter.swapExactInput(paramsRevCbbtc);
    assertGt(usdcFromCbbtc, 0, 'USDC from cbBTC should be > 0');

    vm.stopPrank();
  }

  // 2. Full 60/40 Strategy Deposit & Redemption via Controller
  function testFork_Controller_Full60_40DepositAndRedeem() public {
    uint256 depositAmt = 10000 * 1e6; // $10,000 USDC
    deal(USDC, alice, depositAmt);

    vm.startPrank(alice);
    IERC20(USDC).approve(address(controller), depositAmt);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(USDC, depositAmt, 0, alice);
    assertGt(quote.sharesPreview, 0, 'Shares should be minted');
    assertEq(token.balanceOf(alice), quote.sharesPreview);

    uint256 cbbtcInVault = vault.totalAssets(CBBTC);
    uint256 wethInVault = vault.totalAssets(WETH);
    assertGt(cbbtcInVault, 0, 'Vault must have cbBTC');
    assertGt(wethInVault, 0, 'Vault must have WETH');

    // Verify Portfolio Valuation and Weights
    uint256 priceCbbtc = oracleManager.getAssetPrice(CBBTC);
    uint256 priceWeth = oracleManager.getAssetPrice(WETH);

    uint256 cbbtcValUSD = (cbbtcInVault * priceCbbtc) / 1e8;
    uint256 wethValUSD = (wethInVault * priceWeth) / 1e18;
    uint256 totalValUSD = cbbtcValUSD + wethValUSD;

    uint256 cbbtcWeightBps = (cbbtcValUSD * 10000) / totalValUSD;
    uint256 wethWeightBps = (wethValUSD * 10000) / totalValUSD;

    console.log('Deposit 10k USDC Result:');
    console.log('cbBTC Val USD:', cbbtcValUSD / 1e18);
    console.log('WETH Val USD:', wethValUSD / 1e18);
    console.log('cbBTC Weight BPS (Target 6000):', cbbtcWeightBps);
    console.log('WETH Weight BPS (Target 4000):', wethWeightBps);

    // Check weighting within 2% slippage/execution tolerance
    assertApproxEqAbs(cbbtcWeightBps, 6000, 200, 'cbBTC weight must be ~60%');
    assertApproxEqAbs(wethWeightBps, 4000, 200, 'WETH weight must be ~40%');

    // Redeem 100% of shares back to USDC
    token.approve(address(controller), quote.sharesPreview);
    uint256 usdcBefore = IERC20(USDC).balanceOf(alice);
    uint256 netPayout = controller.redeem(
      USDC,
      quote.sharesPreview,
      0,
      alice,
      block.timestamp + 300
    );

    assertGt(netPayout, 0, 'Redeem payout should be > 0');
    assertEq(IERC20(USDC).balanceOf(alice) - usdcBefore, netPayout);
    assertEq(token.balanceOf(alice), 0, 'Shares should be burned');

    // Vault should have negligible residual (<= 1 wei for dead shares rounding)
    assertLe(vault.totalAssets(CBBTC), 1);
    assertLe(vault.totalAssets(WETH), 1);

    vm.stopPrank();
  }

  // 3. Controller Protection against Slippage / Minimum Output Validation
  function testFork_Controller_Protection_MinimumSharesRevert() public {
    uint256 depositAmt = 10000 * 1e6;
    deal(USDC, alice, depositAmt);

    vm.startPrank(alice);
    IERC20(USDC).approve(address(controller), depositAmt);

    // Expect revert when user requests impossible minSharesOut
    uint256 impossibleMinShares = 100000 * 1e18; // Asking for 10x value
    vm.expectRevert();
    controller.deposit(USDC, depositAmt, impossibleMinShares, alice);
    vm.stopPrank();
  }
}
