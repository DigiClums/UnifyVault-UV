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
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';
import { AggregatorV3Interface } from '../src/interfaces/AggregatorV3Interface.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockSimERC20 is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockSimFeed is AggregatorV3Interface {
  uint8 private _decimals;
  int256 private _answer;
  uint256 private _updatedAt;

  constructor(uint8 decimals_, int256 price_) {
    _decimals = decimals_;
    _answer = price_;
    _updatedAt = block.timestamp;
  }

  function setPrice(int256 newPrice) external {
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

contract MockSimRouter {
  address public wethToken;

  constructor(address wethToken_) {
    wethToken = wethToken_;
  }

  function exactInputSingle(bytes memory) external returns (uint256) {
    MockSimERC20(wethToken).mint(msg.sender, 1000000000000000000);
    return 1000000000000000000;
  }

  fallback() external payable {
    MockSimERC20(wethToken).mint(msg.sender, 1000000000000000000);
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0x0000000000000000000000000000000000000000000000000de0b6b3a7640000)
      return(ptr, 0x20)
    }
  }
}

contract Phase3_LongRunningSim is Test {
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
  MockSimRouter public mockRouter;

  MockSimERC20 public usdc;
  MockSimFeed public usdcFeed;

  address public deployer = address(0x100);

  function setUp() public {
    vm.startPrank(deployer);

    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();
    treasury = new Treasury();
    feeManager = new FeeManager(address(treasury));
    vault = new CustodyVault();
    liquidityManager = new LiquidityManager(deployer, address(directory));
    token = new UVBTCETHToken();
    usdc = new MockSimERC20('USDC', 'USDC');
    mockRouter = new MockSimRouter(address(usdc));
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

    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    usdcFeed = new MockSimFeed(8, 1 * 10 ** 8);
    chainlinkProvider.registerFeed(usdcId, address(usdcFeed), 86400);
    oracleManager.configureAsset(usdcId, address(chainlinkProvider), address(0), 86400, true);

    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);

    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    treasury.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    token.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    vm.stopPrank();
  }

  // 30-Day Continuous Simulation
  function test_30DayContinuousSimulation() public {
    uint256 daysCount = 30;

    for (uint256 day = 1; day <= daysCount; day++) {
      // Warp 1 day (86,400 seconds)
      vm.warp(block.timestamp + 86400);

      // Keep Oracle fresh
      usdcFeed.setPrice(1 * 10 ** 8);

      // User deposits 1,000 USDC
      address user = address(uint160(0x9000 + day));
      uint256 depositAmount = 1000 * 10 ** 6;
      usdc.mint(user, depositAmount);

      vm.startPrank(user);
      usdc.approve(address(controller), depositAmount);
      controller.deposit(address(usdc), depositAmount, 0, user);

      uint256 shares = token.balanceOf(user);
      assertTrue(shares > 0, 'Shares should be minted on daily deposit');

      // User redeems half
      uint256 sharesToRedeem = shares / 2;
      uint256 netOut = controller.redeem(
        address(usdc),
        sharesToRedeem,
        0,
        user,
        block.timestamp + 300
      );
      assertTrue(netOut > 0, 'Net out should be greater than zero on redemption');
      vm.stopPrank();

      // Accounting Invariant Check: Vault Total Assets > 0 and zero surplus assets drift
      uint256 vaultTotal = vault.totalAssets(address(usdc));
      uint256 surplus = vault.surplusAssets(address(usdc));
      assertTrue(vaultTotal > 0, 'Vault total assets must be positive');
      assertEq(surplus, 0, 'Zero accounting drift invariant check');
    }

    // Final Protocol Invariant Check
    assertTrue(token.totalSupply() > 0, 'Total supply must remain positive');
    assertTrue(vault.totalAssets(address(usdc)) > 0, 'Vault total assets must remain positive');
  }
}
