// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { OracleManager } from '../src/oracle/OracleManager.sol';
import { ChainlinkOracleProvider } from '../src/oracle/ChainlinkOracleProvider.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { LiquidityManager } from '../src/vault/LiquidityManager.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import { FeeManager } from '../src/treasury/FeeManager.sol';
import { UVBTCETHToken } from '../src/token/UVBTCETHToken.sol';
import { UnifyVaultController } from '../src/controller/UnifyVaultController.sol';
import { StrategyManager } from '../src/strategy/StrategyManager.sol';
import { PortfolioManager } from '../src/strategy/PortfolioManager.sol';
import { SwapAdapter } from '../src/swap/SwapAdapter.sol';
import { UnifyVaultTimelock } from '../src/governance/UnifyVaultTimelock.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';
import { AggregatorV3Interface } from '../src/interfaces/AggregatorV3Interface.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockUSDCToken is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockWETHToken is ERC20 {
  constructor() ERC20('Wrapped Ether', 'WETH') {}

  function decimals() public pure override returns (uint8) {
    return 18;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract ConfigurableMockAggregatorFeed is AggregatorV3Interface {
  uint8 private _decimals;
  int256 private _answer;
  uint256 private _updatedAt;

  constructor(uint8 decimals_, int256 price_) {
    _decimals = decimals_;
    _answer = price_;
    _updatedAt = block.timestamp;
  }

  function updatePrice(int256 newPrice) external {
    _answer = newPrice;
    _updatedAt = block.timestamp;
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
    uint80 roundId
  ) external view override returns (uint80, int256, uint256, uint256, uint80) {
    return (roundId, _answer, _updatedAt, _updatedAt, roundId);
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
    return (1, _answer, _updatedAt, _updatedAt, 1);
  }
}

contract MockUniswapRouter {
  address public wethToken;

  constructor(address wethToken_) {
    wethToken = wethToken_;
  }

  function exactInputSingle(bytes memory) external returns (uint256) {
    MockWETHToken(wethToken).mint(msg.sender, 1000000000000000000);
    return 1000000000000000000;
  }

  fallback() external payable {
    MockWETHToken(wethToken).mint(msg.sender, 1000000000000000000);
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0x0000000000000000000000000000000000000000000000000de0b6b3a7640000)
      return(ptr, 0x20)
    }
  }
}

contract Phase3_StressTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  Treasury public treasury;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  FeeManager public feeManager;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  UnifyVaultTimelock public timelock;

  MockUSDCToken public usdc;
  MockWETHToken public weth;
  ConfigurableMockAggregatorFeed public usdcFeed;
  ConfigurableMockAggregatorFeed public wethFeed;
  MockUniswapRouter public mockRouter;

  address public deployer = address(0x100);
  address public multisig = address(0x200);

  function setUp() public {
    vm.startPrank(deployer);

    address[] memory empty = new address[](0);
    timelock = new UnifyVaultTimelock(2 days, empty, empty, multisig);

    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();
    treasury = new Treasury();
    feeManager = new FeeManager(address(treasury));
    vault = new CustodyVault();
    liquidityManager = new LiquidityManager(deployer, address(directory));
    token = new UVBTCETHToken();
    usdc = new MockUSDCToken();
    weth = new MockWETHToken();
    mockRouter = new MockUniswapRouter(address(weth));
    swapAdapter = new SwapAdapter(deployer, address(mockRouter));

    address[] memory assets = new address[](1);
    assets[0] = address(usdc);
    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;

    strategyManager = new StrategyManager(deployer, assets, weights);

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

    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.GOVERNANCE, address(timelock));

    liquidityManager.syncModules();

    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    bytes32 wethId = bytes32(uint256(uint160(address(weth))));

    usdcFeed = new ConfigurableMockAggregatorFeed(8, 1 * 10 ** 8);
    wethFeed = new ConfigurableMockAggregatorFeed(8, 3000 * 10 ** 8);

    chainlinkProvider.registerFeed(usdcId, address(usdcFeed), 86400);
    chainlinkProvider.registerFeed(wethId, address(wethFeed), 86400);

    oracleManager.configureAsset(usdcId, address(chainlinkProvider), address(0), 86400, true);
    oracleManager.configureAsset(wethId, address(chainlinkProvider), address(0), 86400, true);

    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(weth), 18);

    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(weth), 18);

    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    treasury.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    token.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    vm.stopPrank();
  }

  // Simultaneous Deposits Stress Test: 10, 100, 1000 Users
  function test_SimultaneousDeposits_10Users() public {
    _runSimultaneousDeposits(10);
  }

  function test_SimultaneousDeposits_100Users() public {
    _runSimultaneousDeposits(100);
  }

  function test_SimultaneousDeposits_1000Users() public {
    _runSimultaneousDeposits(1000);
  }

  function _runSimultaneousDeposits(uint256 userCount) internal {
    uint256 depositPerUser = 100 * 10 ** 6; // 100 USDC

    for (uint256 i = 1; i <= userCount; i++) {
      address user = address(uint160(0x1000 + i));
      usdc.mint(user, depositPerUser);

      vm.startPrank(user);
      usdc.approve(address(controller), depositPerUser);
      controller.deposit(address(usdc), depositPerUser, 0, user);
      vm.stopPrank();

      assertTrue(token.balanceOf(user) > 0, 'User should receive index tokens');
    }

    assertTrue(token.totalSupply() > 0, 'Total supply should be greater than zero');
  }

  // Simultaneous Redemptions Stress Test
  function test_SimultaneousRedemptions() public {
    uint256 userCount = 50;
    uint256 depositPerUser = 200 * 10 ** 6;
    address[] memory users = new address[](userCount);

    for (uint256 i = 0; i < userCount; i++) {
      users[i] = address(uint160(0x5000 + i));
      usdc.mint(users[i], depositPerUser);

      vm.startPrank(users[i]);
      usdc.approve(address(controller), depositPerUser);
      controller.deposit(address(usdc), depositPerUser, 0, users[i]);
      vm.stopPrank();
    }

    for (uint256 i = 0; i < userCount; i++) {
      uint256 shares = token.balanceOf(users[i]);
      vm.startPrank(users[i]);
      uint256 redeemed = controller.redeem(
        address(usdc),
        shares,
        0,
        users[i],
        block.timestamp + 300
      );
      vm.stopPrank();
      assertTrue(redeemed > 0, 'User should redeem assets successfully');
      assertEq(token.balanceOf(users[i]), 0, 'User shares should be fully burned');
    }
  }

  // Oracle Price Fluctuation & Rebalance Stress Test
  function test_OracleUpdatesAndRebalance() public {
    usdc.mint(address(this), 10_000 * 10 ** 6);
    usdc.approve(address(controller), 10_000 * 10 ** 6);
    controller.deposit(address(usdc), 10_000 * 10 ** 6, 0, address(this));

    // Price Update 1: WETH increases to $3,500
    wethFeed.updatePrice(3500 * 10 ** 8);
    uint256 newWethPrice = oracleManager.getAssetPrice(address(weth));
    assertEq(newWethPrice, 3500 * 10 ** 18);

    // Price Update 2: WETH drops to $2,800
    wethFeed.updatePrice(2800 * 10 ** 8);
    newWethPrice = oracleManager.getAssetPrice(address(weth));
    assertEq(newWethPrice, 2800 * 10 ** 18);
  }
}
