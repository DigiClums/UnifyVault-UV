// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import { ERC1967Proxy } from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { PausableUpgradeable } from '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol';
import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { UnifyVaultControllerUpgradeable } from '../src/controller/UnifyVaultControllerUpgradeable.sol';
import { UnifyVaultController } from '../src/controller/UnifyVaultController.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import { LiquidityManager } from '../src/vault/LiquidityManager.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';
import { CostBasisManagerV2 } from '../src/treasury/CostBasisManagerV2.sol';
import { PerformanceManager } from '../src/treasury/PerformanceManager.sol';
import { OracleManager } from '../src/oracle/OracleManager.sol';
import { MockOracleProvider } from '../src/oracle/MockOracleProvider.sol';
import { StrategyManager } from '../src/strategy/StrategyManager.sol';
import { PortfolioManager } from '../src/strategy/PortfolioManager.sol';
import { SwapAdapter } from '../src/swap/SwapAdapter.sol';
import { FeeManager } from '../src/treasury/FeeManager.sol';
import { P2PEscrowV2 } from '../src/escrow/P2PEscrowV2.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';
import { DeployUnifyVaultControllerUUPSScript } from '../script/DeployUnifyVaultControllerUUPS.s.sol';
import { VerifyUnifyVaultControllerUUPSScript } from '../script/VerifyUnifyVaultControllerUUPS.s.sol';
import { CutoverToUpgradeableControllerScript } from '../script/CutoverToUpgradeableController.s.sol';
import { UnifyVaultControllerV2Mock } from './mocks/UnifyVaultControllerV2Mock.sol';

contract MockUSDCTest is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract DeployUnifyVaultControllerUUPSTest is Test {
  DeployUnifyVaultControllerUUPSScript public deployScript;
  VerifyUnifyVaultControllerUUPSScript public verifyScript;
  CutoverToUpgradeableControllerScript public cutoverScript;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  Treasury public treasury;
  FeeManager public feeManager;
  LiquidityManager public liquidityManager;
  UVBEV2 public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  CostBasisManagerV2 public costBasisManager;
  PerformanceManager public performanceManager;
  P2PEscrowV2 public p2pEscrow;
  UnifyVaultController public legacyController;
  MockUSDCTest public usdc;

  address public admin = address(0xAD01);
  address public user = address(0x5555);
  address public guardian = address(0x3333);
  address public attacker = address(0x9999);

  DeployUnifyVaultControllerUUPSScript.DeploymentResult public deployment;

  function setUp() public {
    deployScript = new DeployUnifyVaultControllerUUPSScript();
    verifyScript = new VerifyUnifyVaultControllerUUPSScript();
    cutoverScript = new CutoverToUpgradeableControllerScript();

    vm.startPrank(admin);

    // 1. Deploy base infrastructure
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasury = new Treasury();
    feeManager = new FeeManager(address(treasury));
    liquidityManager = new LiquidityManager(admin, address(directory));
    token = new UVBEV2(admin);
    usdc = new MockUSDCTest();

    // 2. Setup Oracle for USDC ($1.00 USD)
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // 3. Register Assets
    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);

    // 4. Strategy & Portfolio
    address[] memory assets = new address[](1);
    assets[0] = address(usdc);
    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;
    strategyManager = new StrategyManager(admin, assets, weights);

    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    swapAdapter = new SwapAdapter(admin, address(0x7777));
    costBasisManager = new CostBasisManagerV2(admin, address(directory));
    p2pEscrow = new P2PEscrowV2(address(treasury), 100);
    performanceManager = new PerformanceManager(admin, address(directory));

    // 5. Deploy Legacy Immutable Controller
    legacyController = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // 6. Register legacy modules in directory
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(legacyController));
    directory.registerAddress(ModuleIds.REDEEM_MANAGER, address(legacyController));
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
    directory.registerAddress(ModuleIds.PERFORMANCE_MANAGER, address(performanceManager));
    directory.registerAddress(ModuleIds.P2P_ESCROW, address(p2pEscrow));

    // 7. Wire legacy controller roles
    bytes32 ctrlRole = AccessRoles.CONTROLLER_ROLE;
    vault.grantRole(ctrlRole, address(legacyController));
    treasury.grantRole(ctrlRole, address(legacyController));
    token.grantRole(ctrlRole, address(legacyController));
    costBasisManager.grantRole(ctrlRole, address(legacyController));
    liquidityManager.grantRole(ctrlRole, address(legacyController));

    // 8. Grant script runners permissions for unit test harness execution
    bytes32 adminRole = AccessRoles.DEFAULT_ADMIN_ROLE;
    vault.grantRole(adminRole, address(deployScript));
    treasury.grantRole(adminRole, address(deployScript));
    token.grantRole(adminRole, address(deployScript));
    costBasisManager.grantRole(adminRole, address(deployScript));
    liquidityManager.grantRole(adminRole, address(deployScript));

    vault.grantRole(adminRole, address(cutoverScript));
    treasury.grantRole(adminRole, address(cutoverScript));
    token.grantRole(adminRole, address(cutoverScript));
    costBasisManager.grantRole(adminRole, address(cutoverScript));
    liquidityManager.grantRole(adminRole, address(cutoverScript));
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, address(cutoverScript));

    token.setCostBasisManager(address(costBasisManager));
    costBasisManager.setModules(address(portfolioManager), address(token));
    liquidityManager.syncModules();
    portfolioManager.syncModules();
    performanceManager.syncModules();

    vm.stopPrank();

    // Mint test USDC
    usdc.mint(user, 1_000_000 * 1e6);
  }

  function _deploy() internal {
    DeployUnifyVaultControllerUUPSScript.DeploymentParams
      memory params = DeployUnifyVaultControllerUUPSScript.DeploymentParams({
        admin: admin,
        directory: address(directory),
        oracle: address(oracleManager),
        vault: address(vault),
        treasury: address(treasury),
        token: address(token),
        costBasisManager: address(costBasisManager),
        liquidityManager: address(liquidityManager),
        legacyController: address(legacyController)
      });

    deployment = deployScript.deployAndWire(params);
  }

  function testDeploymentScriptExecutionAndWiring() public {
    _deploy();

    // 1. Assert deployment addresses
    assertTrue(address(deployment.implementation) != address(0));
    assertTrue(address(deployment.proxy) != address(0));
    assertTrue(address(deployment.implementation) != address(deployment.proxy));

    // 2. Assert implementation cannot be initialized
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    deployment.implementation.initialize(
      admin,
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // 3. Assert proxy initialized
    assertEq(deployment.controller.directory(), address(directory));
    assertEq(deployment.controller.oracle(), address(oracleManager));
    assertEq(deployment.controller.vault(), address(vault));
    assertEq(deployment.controller.treasury(), address(treasury));
    assertEq(deployment.controller.token(), address(token));
    assertEq(deployment.controller.swapSlippageBps(), 100);

    // 4. Assert double initialization on proxy reverts
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    deployment.controller.initialize(
      admin,
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // 5. Assert roles on proxy
    assertTrue(deployment.controller.hasRole(deployment.controller.DEFAULT_ADMIN_ROLE(), admin));
    assertTrue(deployment.controller.hasRole(AccessRoles.GOVERNANCE_ROLE, admin));
    assertTrue(deployment.controller.hasRole(deployment.controller.GUARDIAN_ROLE(), admin));
    assertTrue(deployment.controller.hasRole(deployment.controller.BOT_ROLE(), admin));

    // 6. Assert downstream CONTROLLER_ROLE granted to PROXY
    bytes32 ctrlRole = AccessRoles.CONTROLLER_ROLE;
    assertTrue(vault.hasRole(ctrlRole, address(deployment.proxy)));
    assertTrue(treasury.hasRole(ctrlRole, address(deployment.proxy)));
    assertTrue(token.hasRole(ctrlRole, address(deployment.proxy)));
    assertTrue(costBasisManager.hasRole(ctrlRole, address(deployment.proxy)));
    assertTrue(liquidityManager.hasRole(ctrlRole, address(deployment.proxy)));

    // 7. Assert ZERO roles on IMPLEMENTATION
    assertFalse(vault.hasRole(ctrlRole, address(deployment.implementation)));
    assertFalse(treasury.hasRole(ctrlRole, address(deployment.implementation)));
    assertFalse(token.hasRole(ctrlRole, address(deployment.implementation)));
    assertFalse(costBasisManager.hasRole(ctrlRole, address(deployment.implementation)));

    // 8. Assert Legacy Controller roles STILL INTACT before cutover
    assertTrue(vault.hasRole(ctrlRole, address(legacyController)));
    assertTrue(token.hasRole(ctrlRole, address(legacyController)));

    // 9. Assert ProtocolDirectory still points to legacy controller before cutover
    assertEq(directory.getAddress(ModuleIds.DEPOSIT_MANAGER), address(legacyController));
  }

  function testVerificationScript() public {
    testDeploymentScriptExecutionAndWiring();

    VerifyUnifyVaultControllerUUPSScript.VerifyConfig
      memory vCfg = VerifyUnifyVaultControllerUUPSScript.VerifyConfig({
        proxy: address(deployment.proxy),
        implementation: address(deployment.implementation),
        admin: admin,
        directory: address(directory),
        oracle: address(oracleManager),
        vault: address(vault),
        treasury: address(treasury),
        token: address(token),
        costBasisManager: address(costBasisManager),
        liquidityManager: address(liquidityManager),
        legacyController: address(legacyController)
      });

    // Verification passes cleanly without reverting
    verifyScript.verify(vCfg);
  }

  function testCutoverScriptExecution() public {
    testDeploymentScriptExecutionAndWiring();

    CutoverToUpgradeableControllerScript.CutoverParams
      memory cParams = CutoverToUpgradeableControllerScript.CutoverParams({
        proxy: address(deployment.proxy),
        legacyController: address(legacyController),
        directory: address(directory),
        vault: address(vault),
        treasury: address(treasury),
        token: address(token),
        costBasisManager: address(costBasisManager),
        liquidityManager: address(liquidityManager),
        admin: admin
      });

    cutoverScript.executeCutover(cParams);

    // 1. Directory updated to Proxy
    assertEq(directory.getAddress(ModuleIds.DEPOSIT_MANAGER), address(deployment.proxy));
    assertEq(directory.getAddress(ModuleIds.REDEEM_MANAGER), address(deployment.proxy));

    // 2. Legacy controller roles revoked
    bytes32 ctrlRole = AccessRoles.CONTROLLER_ROLE;
    assertFalse(vault.hasRole(ctrlRole, address(legacyController)));
    assertFalse(treasury.hasRole(ctrlRole, address(legacyController)));
    assertFalse(token.hasRole(ctrlRole, address(legacyController)));
    assertFalse(costBasisManager.hasRole(ctrlRole, address(legacyController)));

    // 3. Proxy roles still active
    assertTrue(vault.hasRole(ctrlRole, address(deployment.proxy)));
    assertTrue(token.hasRole(ctrlRole, address(deployment.proxy)));
  }

  function testFullSmokeTestLifecycle() public {
    // 1. Deploy & Cutover
    testCutoverScriptExecution();

    UnifyVaultControllerUpgradeable controller = deployment.controller;

    // 2. Smoke Test: Deposit Flow
    uint256 depositAmount = 10_000 * 1e6; // 10,000 USDC
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    UnifyVaultControllerUpgradeable.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmount,
      0,
      user
    );
    vm.stopPrank();

    assertTrue(quote.sharesPreview > 0);
    assertEq(token.balanceOf(user), quote.sharesPreview);
    assertEq(costBasisManager.costBasis(user), quote.netDeposit * 1e12); // scaled to 18 decimals

    // 3. Smoke Test: Redeem Flow
    uint256 redeemShares = token.balanceOf(user) / 2;
    uint256 userUsdcBefore = usdc.balanceOf(user);
    vm.startPrank(user);
    token.approve(address(controller), redeemShares);
    uint256 netAssetsOut = controller.redeem(
      address(usdc),
      redeemShares,
      0,
      user,
      block.timestamp + 300
    );
    vm.stopPrank();

    assertTrue(netAssetsOut > 0);
    assertEq(usdc.balanceOf(user), userUsdcBefore + netAssetsOut);

    // 4. Smoke Test: Pause & Resume
    bytes32 guardianRole = controller.GUARDIAN_ROLE();
    vm.prank(admin);
    controller.grantRole(guardianRole, guardian);

    vm.prank(guardian);
    controller.emergencyPause();
    assertTrue(controller.paused());

    // Deposit reverts when paused
    vm.startPrank(user);
    usdc.approve(address(controller), 1000 * 1e6);
    vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user);
    vm.stopPrank();

    // Resume by governance
    vm.prank(admin);
    controller.resume();
    assertFalse(controller.paused());

    // Deposit succeeds after resume
    vm.startPrank(user);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user);
    vm.stopPrank();

    // 5. Smoke Test: UUPS Upgrade V1 -> V2
    UnifyVaultControllerV2Mock v2Impl = new UnifyVaultControllerV2Mock();

    // Unauthorized upgrade reverts
    vm.prank(attacker);
    vm.expectRevert();
    controller.upgradeToAndCall(address(v2Impl), '');

    // Authorized upgrade succeeds
    vm.prank(admin);
    controller.upgradeToAndCall(address(v2Impl), '');

    UnifyVaultControllerV2Mock v2Proxy = UnifyVaultControllerV2Mock(address(deployment.proxy));
    assertEq(v2Proxy.version(), '2.0.0-mock');
    assertEq(v2Proxy.mockHarmlessV2Function(), 42);

    // Verify storage preserved in V2
    assertEq(v2Proxy.directory(), address(directory));
    assertEq(v2Proxy.vault(), address(vault));
    assertEq(v2Proxy.token(), address(token));

    // 6. Smoke Test: Rollback V2 -> V1
    vm.prank(admin);
    v2Proxy.upgradeToAndCall(address(deployment.implementation), '');

    UnifyVaultControllerUpgradeable rolledBackController = UnifyVaultControllerUpgradeable(
      address(deployment.proxy)
    );
    assertEq(rolledBackController.directory(), address(directory));
    assertEq(rolledBackController.vault(), address(vault));
    assertEq(rolledBackController.token(), address(token));
  }
}
