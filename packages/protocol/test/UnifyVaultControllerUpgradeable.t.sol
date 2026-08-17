// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '../src/controller/UnifyVaultControllerUpgradeable.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/swap/SwapAdapter.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import './mocks/UnifyVaultControllerV2Mock.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockUSDCUpgradeableTest is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {}

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UnifyVaultControllerUpgradeableTest is Test {
  UnifyVaultControllerUpgradeable public implementation;
  ERC1967Proxy public proxy;
  UnifyVaultControllerUpgradeable public controller;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  CostBasisManagerV2 public costBasisManager;
  MockUSDCUpgradeableTest public usdc;

  address public admin = address(0x1111);
  address public governance = address(0x2222);
  address public guardian = address(0x3333);
  address public bot = address(0x4444);
  address public attacker = address(0x9999);
  address public user = address(0x5555);

  function setUp() public {
    // 1. Deploy dependencies
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    token = new UVBTCETHToken();
    usdc = new MockUSDCUpgradeableTest();
    costBasisManager = new CostBasisManagerV2(admin, address(directory));

    // 2. Register Oracle feed for USDC ($1.00 USD)
    bytes32 usdcId = bytes32(uint256(uint160(address(usdc))));
    oracleProvider.registerAsset(usdcId, 1 * 1e18, 18, block.timestamp, 1);
    oracleManager.configureAsset(usdcId, address(oracleProvider), address(0), 3600, true);

    // 3. Register Vault Asset
    vault.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(usdc), 6);

    // 4. Strategy with 100% USDC
    address[] memory assets = new address[](1);
    assets[0] = address(usdc);
    uint256[] memory weights = new uint256[](1);
    weights[0] = 10000;
    strategyManager = new StrategyManager(admin, assets, weights);

    // 5. PortfolioManager & SwapAdapter
    portfolioManager = new PortfolioManager(
      admin,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );
    swapAdapter = new SwapAdapter(admin, address(0x7777));

    // 6. Deploy UUPS Implementation
    implementation = new UnifyVaultControllerUpgradeable();

    // 7. Deploy ERC1967Proxy and initialize pointing to admin
    bytes memory initData = abi.encodeWithSelector(
      UnifyVaultControllerUpgradeable.initialize.selector,
      admin,
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    proxy = new ERC1967Proxy(address(implementation), initData);
    controller = UnifyVaultControllerUpgradeable(address(proxy));

    // 8. Grant roles to specific governance/guardian/bot test accounts from admin
    vm.startPrank(admin);
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, governance);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);
    controller.grantRole(controller.BOT_ROLE(), bot);
    vm.stopPrank();

    // 9. Grant PROXY address (NOT implementation address) necessary protocol roles
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    bytes32 cbmControllerRole = costBasisManager.CONTROLLER_ROLE();
    vm.prank(admin);
    costBasisManager.grantRole(cbmControllerRole, address(controller));

    // 10. Register modules in directory
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.REDEEM_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));

    // Mint user USDC for tests
    usdc.mint(user, 1_000_000 * 1e6);
  }

  // --- Initialization & Self-Defense Tests ---

  function testImplementationCannotBeInitialized() public {
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    implementation.initialize(
      admin,
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );
  }

  function testProxyInitializesSuccessfully() public {
    assertEq(controller.directory(), address(directory));
    assertEq(controller.oracle(), address(oracleManager));
    assertEq(controller.vault(), address(vault));
    assertEq(controller.treasury(), address(treasury));
    assertEq(controller.token(), address(token));
  }

  function testInitializeCannotRunTwice() public {
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    controller.initialize(
      admin,
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );
  }

  function testRolesAreCorrect() public {
    assertTrue(controller.hasRole(controller.DEFAULT_ADMIN_ROLE(), admin));
    assertTrue(controller.hasRole(AccessRoles.GOVERNANCE_ROLE, governance));
    assertTrue(controller.hasRole(controller.GUARDIAN_ROLE(), guardian));
    assertTrue(controller.hasRole(controller.BOT_ROLE(), bot));
    assertFalse(controller.hasRole(AccessRoles.GOVERNANCE_ROLE, attacker));
  }

  function testDefaultLimitsAndThresholdsPreserved() public {
    assertEq(controller.maxDepositPerTx(), type(uint256).max);
    assertEq(controller.maxRedeemPerTx(), type(uint256).max);
    assertEq(controller.dailyDepositCap(), type(uint256).max);
    assertEq(controller.dailyRedeemCap(), type(uint256).max);
    assertEq(controller.largeDepositThreshold(), 10_000 * 1e6);
    assertEq(controller.largeRedeemThreshold(), 10_000 * 1e18);
    assertEq(controller.swapSlippageBps(), 100);
    assertEq(controller.getDepositFeeBps(), FeeLib.DEPOSIT_FEE_BPS); // 25 bps (0.25%)
    assertEq(controller.getRedeemFeeBps(), FeeLib.REDEEM_FEE_BPS); // 200 bps (2.00%)
  }

  // --- Pausing Tests ---

  function testPauseAndResume() public {
    vm.prank(guardian);
    controller.emergencyPause();
    assertTrue(controller.paused());

    // Deposit should revert when paused
    vm.startPrank(user);
    usdc.approve(address(controller), 1000 * 1e6);
    vm.expectRevert(PausableUpgradeable.EnforcedPause.selector);
    controller.deposit(address(usdc), 1000 * 1e6, 0, user);
    vm.stopPrank();

    // Resume by governance
    vm.prank(governance);
    controller.resume();
    assertFalse(controller.paused());
  }

  function testUnauthorizedPauseReverts() public {
    vm.prank(attacker);
    vm.expectRevert();
    controller.emergencyPause();
  }

  // --- UUPS Upgrade Authorization & State Preservation Tests ---

  function testUnauthorizedUpgradeReverts() public {
    UnifyVaultControllerV2Mock v2Impl = new UnifyVaultControllerV2Mock();

    vm.prank(attacker);
    vm.expectRevert();
    controller.upgradeToAndCall(address(v2Impl), '');
  }

  function testAuthorizedUpgradeSucceedsAndPreservesState() public {
    // 1. Mutate some state before upgrade
    vm.prank(governance);
    controller.setSwapSlippageBps(250); // 2.5%
    vm.prank(governance);
    controller.setDepositLimits(50_000 * 1e6, 500_000 * 1e6);

    // 2. Perform authorized upgrade
    UnifyVaultControllerV2Mock v2Impl = new UnifyVaultControllerV2Mock();
    vm.prank(governance);
    controller.upgradeToAndCall(address(v2Impl), '');

    // 3. Cast controller to V2
    UnifyVaultControllerV2Mock v2Controller = UnifyVaultControllerV2Mock(address(proxy));

    // 4. Verify new V2 functions
    assertEq(v2Controller.version(), '2.0.0-mock');
    assertEq(v2Controller.mockHarmlessV2Function(), 42);

    // 5. Verify preserved state
    assertEq(v2Controller.swapSlippageBps(), 250);
    assertEq(v2Controller.maxDepositPerTx(), 50_000 * 1e6);
    assertEq(v2Controller.dailyDepositCap(), 500_000 * 1e6);
    assertEq(v2Controller.directory(), address(directory));
    assertEq(v2Controller.oracle(), address(oracleManager));
    assertEq(v2Controller.vault(), address(vault));
    assertEq(v2Controller.treasury(), address(treasury));
    assertEq(v2Controller.token(), address(token));
    assertTrue(v2Controller.hasRole(AccessRoles.GOVERNANCE_ROLE, governance));
  }

  // --- Live Deposit, Redeem & Accounting Through Proxy ---

  function testDepositThroughProxy() public {
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

    // Verify fee calculation (25 bps = 0.25% = 25 USDC)
    assertEq(quote.protocolFee, 25 * 1e6);
    assertEq(quote.netDeposit, 9975 * 1e6);

    // Verify token shares minted to user (minus 1000 dead shares on first deposit)
    uint256 userShares = token.balanceOf(user);
    assertTrue(userShares > 0);
    assertEq(token.balanceOf(address(0x000000000000000000000000000000000000dEaD)), 1000);

    // Verify vault received net deposit
    assertEq(vault.totalAssets(address(usdc)), 9975 * 1e6);

    // Verify treasury received fee
    assertEq(usdc.balanceOf(address(treasury)), 25 * 1e6);

    // Verify cost basis record
    uint256 totalCostBasis = costBasisManager.costBasis(user);
    int256 userRealizedPnl = costBasisManager.realizedPnL(user);
    assertTrue(totalCostBasis > 0);
    assertEq(userRealizedPnl, 0);
  }

  function testRedeemThroughProxy() public {
    // 1. User deposits first
    uint256 depositAmount = 20_000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);

    uint256 sharesToRedeem = token.balanceOf(user) / 2;
    uint256 userUsdcBefore = usdc.balanceOf(user);

    // 2. User redeems half shares
    uint256 netAssets = controller.redeem(
      address(usdc),
      sharesToRedeem,
      0,
      user,
      block.timestamp + 300
    );
    vm.stopPrank();

    assertTrue(netAssets > 0);
    assertEq(usdc.balanceOf(user), userUsdcBefore + netAssets);
  }

  function testRedeemDeadlineProtection() public {
    uint256 depositAmount = 10_000 * 1e6;
    vm.startPrank(user);
    usdc.approve(address(controller), depositAmount);
    controller.deposit(address(usdc), depositAmount, 0, user);

    uint256 sharesToRedeem = token.balanceOf(user);

    // Past deadline should revert
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultControllerUpgradeable.DeadlineExpired.selector,
        block.timestamp - 1,
        block.timestamp
      )
    );
    controller.redeem(address(usdc), sharesToRedeem, 0, user, block.timestamp - 1);
    vm.stopPrank();
  }

  function testPermissionsEnforceProxyAddressNotImplementation() public {
    // Confirm token controller role is on PROXY address
    assertTrue(token.hasRole(token.CONTROLLER_ROLE(), address(controller)));
    assertFalse(token.hasRole(token.CONTROLLER_ROLE(), address(implementation)));

    // Confirm vault controller role is on PROXY address
    assertTrue(vault.hasRole(vault.CONTROLLER_ROLE(), address(controller)));
    assertFalse(vault.hasRole(vault.CONTROLLER_ROLE(), address(implementation)));

    // Confirm CostBasisManager controller role is on PROXY address
    assertTrue(costBasisManager.hasRole(costBasisManager.CONTROLLER_ROLE(), address(controller)));
    assertFalse(
      costBasisManager.hasRole(costBasisManager.CONTROLLER_ROLE(), address(implementation))
    );
  }
}
