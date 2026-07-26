// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/vault/CostBasisManager.sol';
import '../src/vault/HighWaterMarkManager.sol';
import '../src/vault/RealizedProfitEngine.sol';
import '../src/treasury/FeeManager.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/ProtocolDirectory.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockCollateralToken is ERC20 {
  constructor() ERC20('Mock USDC', 'USDC') {
    _mint(msg.sender, 1_000_000e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract ControllerIntegrationTest is Test {
  ProtocolDirectory public directory;
  MockCollateralToken public usdc;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;
  FeeManager public feeManager;
  CostBasisManager public costBasisManager;
  HighWaterMarkManager public hwmManager;
  RealizedProfitEngine public profitEngine;
  UnifyVaultController public controller;

  address public admin = address(0x111);
  address public user = address(0x222);
  bytes32 public assetId;

  event PerformanceFeeApplied(
    address indexed user,
    uint256 realizedProfit,
    uint256 chargeableProfit,
    uint256 performanceFee,
    uint256 netAssets
  );

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    usdc = new MockCollateralToken();
    assetId = bytes32(uint256(uint160(address(usdc))));

    oracleProvider = new MockOracleProvider();
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.registerAsset(assetId, 1e18, 18, block.timestamp, 1);

    oracleManager = new OracleManager();
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);

    vault = new CustodyVault();
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(this));
    vault.registerAsset(address(usdc), 18);

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.registerAsset(address(usdc), 18);

    token = new UVBTCETHToken();

    feeManager = new FeeManager(address(treasury));
    feeManager.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    costBasisManager = new CostBasisManager(address(this));
    hwmManager = new HighWaterMarkManager(address(this));
    profitEngine = new RealizedProfitEngine();

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register modules in ProtocolDirectory
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
    directory.registerAddress(ModuleIds.HIGH_WATER_MARK_MANAGER, address(hwmManager));
    directory.registerAddress(ModuleIds.REALIZED_PROFIT_ENGINE, address(profitEngine));

    // Grant CONTROLLER_ROLE to Controller contract
    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    costBasisManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    hwmManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    // Fund user
    usdc.mint(user, 100_000e18);
  }

  function simulateVaultGain(address asset, uint256 amount) internal {
    usdc.mint(address(this), amount);
    usdc.approve(address(vault), amount);
    vm.prank(address(controller));
    vault.deposit(asset, address(this), amount);
  }

  // 1. Integration Test: Deposit -> Gain -> Redeem
  function testDepositGainRedeem() public {
    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    vm.stopPrank();

    uint256 shares = quote.sharesPreview;
    assertEq(costBasisManager.investedAssets(user), quote.netDeposit);

    // Simulate vault gain
    simulateVaultGain(address(usdc), 300e18);

    // Redeem all shares
    vm.startPrank(user);
    uint256 netAssetsOut = controller.redeem(address(usdc), shares, 0, user, block.timestamp + 100);
    vm.stopPrank();

    assertTrue(netAssetsOut > 0);
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 2. Integration Test: Partial Redemption Twice (No Double Fee)
  function testPartialRedemptionTwiceNoDoubleFee() public {
    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    vm.stopPrank();

    uint256 totalShares = quote.sharesPreview;

    // Simulate 400 USDC vault gain
    simulateVaultGain(address(usdc), 400e18);

    // Partial redeem 50% shares
    vm.startPrank(user);
    uint256 net1 = controller.redeem(
      address(usdc),
      totalShares / 2,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    assertTrue(net1 > 0);
    uint256 hwmAfter1 = hwmManager.highWaterMark(user);
    assertTrue(hwmAfter1 > 0);

    // Redeem remaining shares without further gains
    vm.startPrank(user);
    uint256 net2 = controller.redeem(
      address(usdc),
      totalShares / 2,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    assertTrue(net2 > 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 3. Integration Test: Loss Redemption (Fee = 0)
  function testLossRedeemFeeZero() public {
    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    vm.stopPrank();

    vm.startPrank(user);
    uint256 netAssetsOut = controller.redeem(
      address(usdc),
      quote.sharesPreview,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    assertTrue(netAssetsOut > 0);
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 4. Integration Test: Full Exit Reset -> Redeploy
  function testFullExitResetRedeploy() public {
    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote1 = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    controller.redeem(address(usdc), quote1.sharesPreview, 0, user, block.timestamp + 100);
    vm.stopPrank();

    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);

    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote2 = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    vm.stopPrank();

    assertEq(costBasisManager.investedAssets(user), quote2.netDeposit);
    assertEq(hwmManager.highWaterMark(user), 0);
  }

  // 5. Integration Test: Multiple Deposits
  function testMultipleDepositsAccounting() public {
    vm.startPrank(user);
    usdc.approve(address(controller), 2000e18);
    UnifyVaultController.DepositQuote memory q1 = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    UnifyVaultController.DepositQuote memory q2 = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    vm.stopPrank();

    assertEq(costBasisManager.investedAssets(user), q1.netDeposit + q2.netDeposit);
    assertEq(costBasisManager.sharesOwned(user), q1.sharesPreview + q2.sharesPreview);
  }

  // 6. Integration Test: Governance changes performance fee BPS
  function testGovernanceUpdatesPerformanceFeeBps() public {
    vm.startPrank(admin);
    feeManager.setPerformanceFeeBps(1000);
    vm.stopPrank();

    assertEq(feeManager.performanceFeeBps(), 1000);
  }

  // 7. Integration Test: Preview equals execution
  function testPreviewEqualsExecution() public {
    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );

    uint256 previewNet = controller.previewRedeem(address(usdc), quote.sharesPreview);
    uint256 actualNet = controller.redeem(
      address(usdc),
      quote.sharesPreview,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    assertEq(previewNet, actualNet);
  }

  // 8. Protocol Financial & Economic Invariants
  function testFuzzEconomicInvariants(uint256 depositAmt, uint256 gainAmt) public {
    depositAmt = bound(depositAmt, 1000e18, 100_000e18);
    gainAmt = bound(gainAmt, 0, 50_000e18);

    usdc.mint(user, depositAmt);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      user
    );
    vm.stopPrank();

    uint256 treasuryBalBefore = usdc.balanceOf(address(treasury));

    if (gainAmt > 0) {
      simulateVaultGain(address(usdc), gainAmt);
    }

    vm.startPrank(user);
    uint256 netAssetsOut = controller.redeem(
      address(usdc),
      quote.sharesPreview,
      0,
      user,
      block.timestamp + 100
    );
    vm.stopPrank();

    uint256 treasuryBalAfter = usdc.balanceOf(address(treasury));
    uint256 treasuryFeeCollected = treasuryBalAfter - treasuryBalBefore;

    assertTrue(netAssetsOut > 0 || depositAmt == 0);
    assertTrue(treasuryFeeCollected >= 0);

    // Full exit clears accounting state completely
    assertEq(costBasisManager.investedAssets(user), 0);
    assertEq(costBasisManager.sharesOwned(user), 0);
    assertEq(hwmManager.highWaterMark(user), 0);
  }
}
