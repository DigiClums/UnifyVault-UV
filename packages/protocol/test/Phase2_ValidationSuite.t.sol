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
import { Errors } from '../src/errors/Errors.sol';
import { AggregatorV3Interface } from '../src/interfaces/AggregatorV3Interface.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20Collateral is ERC20 {
  constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract ConfigurableMockAggregator is AggregatorV3Interface {
  uint8 private _decimals;
  int256 private _answer;
  uint256 private _updatedAt;
  uint80 private _answeredIn;

  constructor(uint8 decimals_, int256 price_) {
    _decimals = decimals_;
    _answer = price_;
    _updatedAt = block.timestamp;
    _answeredIn = 1;
  }

  function setRoundData(int256 answer_, uint256 updatedAt_, uint80 answeredIn_) external {
    _answer = answer_;
    _updatedAt = updatedAt_;
    _answeredIn = answeredIn_;
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
    return (roundId, _answer, _updatedAt, _updatedAt, _answeredIn);
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
    return (1, _answer, _updatedAt, _updatedAt, _answeredIn);
  }
}

contract DummyTargetContract {
  uint256 public value;

  function setValue(uint256 newValue) external {
    value = newValue;
  }
}

contract MockUniswapV3Router {
  address public wethToken;

  constructor(address wethToken_) {
    wethToken = wethToken_;
  }

  function exactInputSingle(bytes memory) external returns (uint256) {
    MockERC20Collateral(wethToken).mint(msg.sender, 1000000000000000000);
    return 1000000000000000000;
  }

  fallback() external payable {
    MockERC20Collateral(wethToken).mint(msg.sender, 1000000000000000000);
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0x0000000000000000000000000000000000000000000000000de0b6b3a7640000)
      return(ptr, 0x20)
    }
  }
}

contract Phase2_ValidationSuite is Test {
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

  MockERC20Collateral public usdc;
  MockERC20Collateral public weth;
  ConfigurableMockAggregator public usdcFeed;
  ConfigurableMockAggregator public wethFeed;
  MockUniswapV3Router public mockRouter;

  address public deployer = address(0x100);
  address public safeMultisig = address(0x200);
  address public guardian = address(0x300);
  address public strategist = address(0x400);

  uint256 public constant TIMELOCK_DELAY = 2 days;

  function setUp() public {
    vm.startPrank(deployer);

    // Deploy Timelock
    address[] memory proposers = new address[](1);
    proposers[0] = safeMultisig;
    address[] memory executors = new address[](1);
    executors[0] = safeMultisig;
    timelock = new UnifyVaultTimelock(TIMELOCK_DELAY, proposers, executors, safeMultisig);

    // Deploy Protocol Infrastructure
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();
    treasury = new Treasury();
    feeManager = new FeeManager(address(treasury));
    vault = new CustodyVault();
    liquidityManager = new LiquidityManager(deployer, address(directory));
    token = new UVBTCETHToken();
    usdc = new MockERC20Collateral('USD Coin', 'USDC');
    weth = new MockERC20Collateral('Wrapped Ether', 'WETH');
    mockRouter = new MockUniswapV3Router(address(weth));
    swapAdapter = new SwapAdapter(deployer, address(mockRouter));

    address[] memory assets = new address[](2);
    assets[0] = address(usdc);
    assets[1] = address(weth);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 5000;
    weights[1] = 5000;

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

    // Register Modules in ProtocolDirectory
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

    // Register Price Feeds
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    bytes32 wethId = bytes32(uint256(uint160(address(weth))));

    usdcFeed = new ConfigurableMockAggregator(8, 1 * 10 ** 8);
    wethFeed = new ConfigurableMockAggregator(8, 3000 * 10 ** 8);

    chainlinkProvider.registerFeed(usdcId, address(usdcFeed), 86400);
    chainlinkProvider.registerFeed(wethId, address(wethFeed), 86400);

    oracleManager.configureAsset(usdcId, address(chainlinkProvider), address(0), 86400, true);
    oracleManager.configureAsset(wethId, address(chainlinkProvider), address(0), 86400, true);

    vault.registerAsset(address(usdc), 6);
    vault.registerAsset(address(weth), 18);

    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(weth), 18);

    // Grant Controller Roles
    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    treasury.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    token.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    vm.stopPrank();
  }

  // ===================================================================
  // Step 2: Deployment Validation Checks
  // ===================================================================
  function test_Step2_DeploymentValidation() public {
    // 1. Controller Verification
    assertEq(address(controller.directory()), address(directory), 'Controller directory misbound');
    assertEq(address(controller.oracle()), address(oracleManager), 'Controller oracle misbound');
    assertEq(address(controller.vault()), address(vault), 'Controller vault misbound');
    assertEq(address(controller.treasury()), address(treasury), 'Controller treasury misbound');
    assertEq(address(controller.token()), address(token), 'Controller token misbound');
    assertFalse(controller.paused(), 'Controller initially paused');

    // 2. ProtocolDirectory Verification
    assertEq(directory.getAddress(ModuleIds.TREASURY), address(treasury));
    assertEq(directory.getAddress(ModuleIds.VAULT), address(vault));
    assertEq(directory.getAddress(ModuleIds.DEPOSIT_MANAGER), address(controller));
    assertEq(directory.getAddress(ModuleIds.ORACLE), address(oracleManager));
    assertEq(directory.getAddress(ModuleIds.TOKEN), address(token));
    assertEq(directory.getAddress(ModuleIds.GOVERNANCE), address(timelock));

    // 3. Vault & Treasury Roles
    assertTrue(vault.hasRole(AccessRoles.CONTROLLER_ROLE, address(controller)));
    assertTrue(treasury.hasRole(AccessRoles.CONTROLLER_ROLE, address(controller)));
    assertTrue(token.hasRole(AccessRoles.CONTROLLER_ROLE, address(controller)));

    // 4. Timelock Verification
    assertEq(timelock.getMinDelay(), TIMELOCK_DELAY, 'Timelock delay mismatch');
  }

  // ===================================================================
  // Step 3: Multisig Migration Validation
  // ===================================================================
  function test_Step3_MultisigMigration() public {
    vm.startPrank(deployer);

    // Transfer Protocol Directory Admin & Governance Roles to Timelock
    directory.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock));
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, address(timelock));

    // Grant Roles to Safe Multisig & Guardians
    controller.grantRole(AccessRoles.GUARDIAN_ROLE, guardian);
    controller.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock));

    oracleManager.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock));
    vault.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock));
    treasury.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock));
    token.grantRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock));

    // Renounce Deployer Roles
    directory.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);
    directory.renounceRole(AccessRoles.GOVERNANCE_ROLE, deployer);
    controller.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);
    oracleManager.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);
    vault.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);
    treasury.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);
    token.renounceRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer);

    vm.stopPrank();

    // Validate Revocation
    assertFalse(directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer));
    assertFalse(controller.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, deployer));
    assertTrue(directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, address(timelock)));
    assertTrue(controller.hasRole(AccessRoles.GUARDIAN_ROLE, guardian));
  }

  // ===================================================================
  // Step 4: Timelock Lifecycle Validation
  // ===================================================================
  function test_Step4_TimelockValidation() public {
    DummyTargetContract target = new DummyTargetContract();
    bytes memory data = abi.encodeWithSignature('setValue(uint256)', 42);
    bytes32 salt = keccak256('TEST_SALT');

    // 1. Queue Proposal
    vm.prank(safeMultisig);
    timelock.schedule(address(target), 0, data, bytes32(0), salt, TIMELOCK_DELAY);

    bytes32 id = timelock.hashOperation(address(target), 0, data, bytes32(0), salt);
    assertTrue(timelock.isOperationPending(id), 'Operation not pending after queue');

    // 2. Early Execution Reverts
    vm.expectRevert();
    vm.prank(safeMultisig);
    timelock.execute(address(target), 0, data, bytes32(0), salt);

    // 3. Execute After Delay
    vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
    vm.prank(safeMultisig);
    timelock.execute(address(target), 0, data, bytes32(0), salt);

    assertEq(target.value(), 42, 'Timelock execution failed to set value');
    assertTrue(timelock.isOperationDone(id), 'Operation not marked done');

    // 4. Cancel Proposal Test
    bytes32 salt2 = keccak256('TEST_SALT_2');
    vm.prank(safeMultisig);
    timelock.schedule(address(target), 0, data, bytes32(0), salt2, TIMELOCK_DELAY);

    bytes32 id2 = timelock.hashOperation(address(target), 0, data, bytes32(0), salt2);
    vm.prank(safeMultisig);
    timelock.cancel(id2);
    assertFalse(timelock.isOperationPending(id2), 'Operation not cancelled');
  }

  // ===================================================================
  // Step 5: Oracle Readiness Validation
  // ===================================================================
  function test_Step5_OracleReadiness() public {
    vm.warp(100000);
    usdcFeed.setRoundData(1 * 10 ** 8, block.timestamp, 1);
    wethFeed.setRoundData(3000 * 10 ** 8, block.timestamp, 1);

    // 1. Normal Price Fetch
    uint256 price = oracleManager.getAssetPrice(address(weth));
    assertEq(price, 3000 * 10 ** 18, 'Valid WETH price mismatch');

    // 2. Staleness Validation
    wethFeed.setRoundData(3000 * 10 ** 8, block.timestamp - 90000, 1);
    vm.expectRevert();
    oracleManager.getAssetPrice(address(weth));

    // 3. Negative Price Answer Rejection
    wethFeed.setRoundData(-100, block.timestamp, 1);
    vm.expectRevert();
    oracleManager.getAssetPrice(address(weth));

    // 4. Zero Price Rejection
    wethFeed.setRoundData(0, block.timestamp, 1);
    vm.expectRevert();
    oracleManager.getAssetPrice(address(weth));

    // 5. Incomplete Round Rejection
    wethFeed.setRoundData(3000 * 10 ** 8, block.timestamp, 2); // answeredInRound = 1 < roundId = 2
    vm.expectRevert();
    oracleManager.getAssetPrice(address(weth));
  }

  // ===================================================================
  // Step 6: Emergency Drill Simulation
  // ===================================================================
  function test_Step6_EmergencyDrill() public {
    // 1. Setup User Deposit
    uint256 depositAmt = 1000 * 10 ** 6; // 1000 USDC
    usdc.mint(address(this), depositAmt);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, address(this));

    uint256 userShares = token.balanceOf(address(this));
    assertTrue(userShares > 0);

    // 2. Trigger Emergency Pause by Guardian
    vm.prank(deployer);
    controller.grantRole(AccessRoles.GUARDIAN_ROLE, guardian);
    vm.prank(guardian);
    controller.emergencyPause();

    assertTrue(controller.paused(), 'Controller not paused');

    // 3. Deposit While Paused Must Revert
    usdc.mint(address(this), depositAmt);
    usdc.approve(address(controller), depositAmt);
    vm.expectRevert();
    controller.deposit(address(usdc), depositAmt, 0, address(this));

    // 4. Redeem While Paused Must Revert
    vm.expectRevert();
    controller.redeem(address(usdc), userShares, 0, address(this), block.timestamp + 100);

    // 5. Resume Protocol by Admin/Governance
    vm.prank(deployer);
    controller.resume();

    assertFalse(controller.paused(), 'Controller not unpaused');

    // 6. Resume Operational Verification
    uint256 netAssetsOut = controller.redeem(
      address(usdc),
      userShares,
      0,
      address(this),
      block.timestamp + 100
    );
    assertTrue(netAssetsOut > 0);
  }
}
