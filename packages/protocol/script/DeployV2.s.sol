// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/ChainlinkOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/vault/LiquidityManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/treasury/FeeManager.sol';
import '../src/governance/UnifyVaultTimelock.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '../src/interfaces/AggregatorV3Interface.sol';
import { VmExt } from './mainnet/helpers/GovernanceMigrationHelper.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

interface ITreasuryFull {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function revokeRole(bytes32 role, address account) external;
  function hasRole(bytes32 role, address account) external view returns (bool);
  function CONTROLLER_ROLE() external view returns (bytes32);
  function collectFee(address asset, uint256 amount) external;
  function balance(address asset) external view returns (uint256);
  function totalAssetBalance(address asset) external view returns (uint256);
}

contract TestToken is ERC20 {
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
}

contract MockChainlinkAggregator is AggregatorV3Interface {
  uint8 private _decimals;
  int256 private _answer;

  constructor(uint8 decimals_, int256 price_) {
    _decimals = decimals_;
    _answer = price_;
  }

  function setPrice(int256 price_) external {
    _answer = price_;
  }

  function decimals() external view override returns (uint8) {
    return _decimals;
  }

  function description() external view override returns (string memory) {
    return 'Mock Feed';
  }

  function version() external view override returns (uint256) {
    return 1;
  }

  function getRoundData(
    uint80 _round
  ) external view override returns (uint80, int256, uint256, uint256, uint80) {
    return (_round, _answer, block.timestamp, block.timestamp, _round);
  }

  function latestRoundData()
    external
    view
    override
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    return (1, _answer, block.timestamp, block.timestamp, 1);
  }
}

interface IOraclePriceFetcher {
  function getAssetPrice(address asset) external view returns (uint256);
}

contract TestSwapRouter {
  using SafeERC20 for IERC20;

  address public oracle;

  struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  struct ExactInputParams {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountIn;
    uint256 amountOutMinimum;
  }

  constructor(address oracle_) {
    oracle = oracle_;
  }

  function setOracle(address oracle_) external {
    oracle = oracle_;
  }

  function exactInputSingle(
    ExactInputSingleParams calldata params
  ) external payable returns (uint256 amountOut) {
    IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

    uint256 priceIn = 1e18;
    uint256 priceOut = 1e18;
    uint8 decimalsIn = 18;
    uint8 decimalsOut = 18;

    if (oracle != address(0)) {
      try IOraclePriceFetcher(oracle).getAssetPrice(params.tokenIn) returns (uint256 pIn) {
        if (pIn > 0) priceIn = pIn;
      } catch {}
      try IOraclePriceFetcher(oracle).getAssetPrice(params.tokenOut) returns (uint256 pOut) {
        if (pOut > 0) priceOut = pOut;
      } catch {}
    }

    try TestToken(params.tokenIn).decimals() returns (uint8 dIn) {
      decimalsIn = dIn;
    } catch {}
    try TestToken(params.tokenOut).decimals() returns (uint8 dOut) {
      decimalsOut = dOut;
    } catch {}

    amountOut = (params.amountIn * priceIn * (10 ** decimalsOut)) / (priceOut * (10 ** decimalsIn));
    require(amountOut >= params.amountOutMinimum, 'Slippage limit');

    uint256 routerBal = IERC20(params.tokenOut).balanceOf(address(this));
    if (routerBal < amountOut) {
      try TestToken(params.tokenOut).mint(address(this), amountOut - routerBal) {} catch {}
    }

    IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);
  }

  function exactInput(
    ExactInputParams calldata params
  ) external payable returns (uint256 amountOut) {
    revert('Not implemented');
  }
}

contract DeployV2Script is Script, Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  ITreasuryFull public treasury;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  FeeManager public feeManager;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  TestSwapRouter public swapRouter;
  UnifyVaultTimelock public timelock;

  TestToken public testCbBTC;
  TestToken public testWETH;

  MockChainlinkAggregator public usdcAggregator;
  MockChainlinkAggregator public cbbtcAggregator;
  MockChainlinkAggregator public wethAggregator;

  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant DEFAULT_GNOSIS_SAFE = 0x1111111111111111111111111111111111111111;

  address public deployerAddress;

  function setUp() public {
    deployerAddress = msg.sender;
  }

  function run() external {
    vm.startBroadcast();

    deployerAddress = msg.sender;

    // --------------------------------------------------
    // STEP 1: Deploy fresh contracts
    // --------------------------------------------------
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITreasuryFull(treasuryAddr);
    feeManager = new FeeManager(address(treasury));

    vault = new CustodyVault();
    liquidityManager = new LiquidityManager(deployerAddress, address(directory));
    token = new UVBTCETHToken();

    // Deploy 48-hour Timelock with Gnosis Safe proposer
    address gnosisSafe = DEFAULT_GNOSIS_SAFE;
    try
      VmExt(address(vm)).envOr('GNOSIS_SAFE_ADDRESS', '0x1111111111111111111111111111111111111111')
    returns (string memory safeStr) {
      gnosisSafe = VmExt(address(vm)).parseAddress(safeStr);
    } catch {}
    address[] memory proposers = new address[](1);
    proposers[0] = gnosisSafe;
    address[] memory executors = new address[](1);
    executors[0] = address(0); // Open execution after delay

    timelock = new UnifyVaultTimelock(48 hours, proposers, executors, deployerAddress);

    // Deploy test strategy assets: cbBTC (8 decimals) and WETH (18 decimals)
    testCbBTC = new TestToken('Coinbase Wrapped BTC', 'cbBTC', 8);
    testWETH = new TestToken('Wrapped Ether', 'WETH', 18);

    // Deploy TestSwapRouter
    swapRouter = new TestSwapRouter(address(oracleManager));
    swapAdapter = new SwapAdapter(deployerAddress, address(swapRouter));

    // Configure Strategy assets: 50% cbBTC (5000 BPS), 50% WETH (5000 BPS)
    address[] memory strategyAssets = new address[](2);
    strategyAssets[0] = address(testCbBTC);
    strategyAssets[1] = address(testWETH);
    uint256[] memory strategyWeights = new uint256[](2);
    strategyWeights[0] = 5000;
    strategyWeights[1] = 5000;

    strategyManager = new StrategyManager(deployerAddress, strategyAssets, strategyWeights);

    portfolioManager = new PortfolioManager(
      deployerAddress,
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

    // Register every module in ProtocolDirectory
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

    // Verify registrations
    require(directory.getAddress(ModuleIds.TREASURY) == address(treasury), 'Treasury reg failed');
    require(
      directory.getAddress(ModuleIds.FEE_MANAGER) == address(feeManager),
      'FeeManager reg failed'
    );
    require(directory.getAddress(ModuleIds.VAULT) == address(vault), 'Vault reg failed');
    require(
      directory.getAddress(ModuleIds.LIQUIDITY_MANAGER) == address(liquidityManager),
      'LiquidityManager reg failed'
    );
    require(
      directory.getAddress(ModuleIds.DEPOSIT_MANAGER) == address(controller),
      'Controller reg failed'
    );
    require(directory.getAddress(ModuleIds.ORACLE) == address(oracleManager), 'Oracle reg failed');
    require(directory.getAddress(ModuleIds.TOKEN) == address(token), 'Token reg failed');
    require(
      directory.getAddress(ModuleIds.STRATEGY_MANAGER) == address(strategyManager),
      'StrategyManager reg failed'
    );
    require(
      directory.getAddress(ModuleIds.PORTFOLIO_MANAGER) == address(portfolioManager),
      'PortfolioManager reg failed'
    );
    require(
      directory.getAddress(ModuleIds.SWAP_ADAPTER) == address(swapAdapter),
      'SwapAdapter reg failed'
    );

    // --------------------------------------------------
    // STEP 6: Initialize LiquidityManager & PortfolioManager
    // --------------------------------------------------
    liquidityManager.syncModules();
    require(liquidityManager.custodyVault() == address(vault), 'LiquidityManager sync failed');
    portfolioManager.syncModules();

    // --------------------------------------------------
    // STEP 4: Configure Oracle (ChainlinkOracleProvider)
    // --------------------------------------------------
    usdcAggregator = new MockChainlinkAggregator(6, 1 * 10 ** 6);
    cbbtcAggregator = new MockChainlinkAggregator(8, 65000 * 10 ** 8);
    wethAggregator = new MockChainlinkAggregator(8, 3500 * 10 ** 8);

    bytes32 usdcId = bytes32(uint256(uint160(BASE_SEPOLIA_USDC)));
    bytes32 cbbtcId = bytes32(uint256(uint160(address(testCbBTC))));
    bytes32 wethId = bytes32(uint256(uint160(address(testWETH))));

    chainlinkProvider.registerFeed(usdcId, address(usdcAggregator), 86400);
    chainlinkProvider.registerFeed(cbbtcId, address(cbbtcAggregator), 86400);
    chainlinkProvider.registerFeed(wethId, address(wethAggregator), 86400);

    oracleManager.configureAsset(usdcId, address(chainlinkProvider), address(0), 86400, true);
    oracleManager.configureAsset(cbbtcId, address(chainlinkProvider), address(0), 86400, true);
    oracleManager.configureAsset(wethId, address(chainlinkProvider), address(0), 86400, true);

    // Verify Oracles
    require(oracleManager.isPriceFresh(BASE_SEPOLIA_USDC), 'USDC oracle fresh failed');
    require(oracleManager.getAssetPrice(BASE_SEPOLIA_USDC) == 1e18, 'USDC price failed');
    require(oracleManager.isPriceFresh(address(testCbBTC)), 'cbBTC oracle fresh failed');
    require(oracleManager.getAssetPrice(address(testCbBTC)) == 65000e18, 'cbBTC price failed');
    require(oracleManager.isPriceFresh(address(testWETH)), 'WETH oracle fresh failed');
    require(oracleManager.getAssetPrice(address(testWETH)) == 3500e18, 'WETH price failed');

    // --------------------------------------------------
    // Vault & Treasury Assets Registration
    // --------------------------------------------------
    vault.registerAsset(BASE_SEPOLIA_USDC, 6);
    vault.registerAsset(address(testCbBTC), 8);
    vault.registerAsset(address(testWETH), 18);

    treasury.registerAsset(BASE_SEPOLIA_USDC, 6);
    treasury.registerAsset(address(testCbBTC), 8);
    treasury.registerAsset(address(testWETH), 18);

    // --------------------------------------------------
    // STEP 5: SwapAdapter configuration
    // --------------------------------------------------
    require(address(swapRouter).code.length > 0, 'Swap router no bytecode');
    require(swapAdapter.router() == address(swapRouter), 'Swap router mismatch');
    controller.setSwapSlippageBps(100);
    require(controller.swapSlippageBps() == 100, 'Slippage set failed');

    // --------------------------------------------------
    // STEP 7: Configure Controller & Admin Roles
    // --------------------------------------------------
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    token.revokeRole(token.CONTROLLER_ROLE(), deployerAddress);

    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    // Grant Timelock DEFAULT_ADMIN_ROLE and GOVERNANCE_ROLE across all contracts
    bytes32 adminRole = 0x00;
    bytes32 govRole = AccessRoles.GOVERNANCE_ROLE;

    directory.grantRole(adminRole, address(timelock));
    directory.grantRole(govRole, address(timelock));
    oracleManager.grantRole(adminRole, address(timelock));
    oracleManager.grantRole(govRole, address(timelock));
    chainlinkProvider.grantRole(adminRole, address(timelock));
    chainlinkProvider.grantRole(govRole, address(timelock));
    vault.grantRole(adminRole, address(timelock));
    vault.grantRole(govRole, address(timelock));
    treasury.grantRole(adminRole, address(timelock));
    treasury.grantRole(govRole, address(timelock));
    liquidityManager.grantRole(adminRole, address(timelock));
    liquidityManager.grantRole(govRole, address(timelock));
    token.grantRole(adminRole, address(timelock));
    token.grantRole(govRole, address(timelock));
    controller.grantRole(adminRole, address(timelock));
    controller.grantRole(govRole, address(timelock));
    strategyManager.grantRole(adminRole, address(timelock));
    strategyManager.grantRole(govRole, address(timelock));
    portfolioManager.grantRole(adminRole, address(timelock));
    portfolioManager.grantRole(govRole, address(timelock));
    swapAdapter.grantRole(adminRole, address(timelock));
    swapAdapter.grantRole(govRole, address(timelock));
    feeManager.grantRole(adminRole, address(timelock));
    feeManager.grantRole(govRole, address(timelock));

    // Print addresses for logging
    console.log('=== DEPLOYMENT V2 ADDRESSES ===');
    console.log('ProtocolDirectory:       ', address(directory));
    console.log('Treasury:                ', address(treasury));
    console.log('OracleManager:           ', address(oracleManager));
    console.log('ChainlinkOracleProvider: ', address(chainlinkProvider));
    console.log('CustodyVault:            ', address(vault));
    console.log('LiquidityManager:        ', address(liquidityManager));
    console.log('UVBTCETHToken:           ', address(token));
    console.log('UnifyVaultController:    ', address(controller));
    console.log('StrategyManager:         ', address(strategyManager));
    console.log('PortfolioManager:        ', address(portfolioManager));
    console.log('SwapAdapter:             ', address(swapAdapter));
    console.log('FeeManager:              ', address(feeManager));
    console.log('TimelockController:      ', address(timelock));
    console.log('Gnosis Safe Proposer:    ', gnosisSafe);

    vm.stopBroadcast();
  }
}
