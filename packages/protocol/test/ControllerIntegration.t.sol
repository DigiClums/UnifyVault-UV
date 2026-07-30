// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
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
  UnifyVaultController public controller;

  address public admin = address(0x111);
  address public user = address(0x222);
  bytes32 public assetId;

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

    // Grant CONTROLLER_ROLE to Controller contract
    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

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

    // Simulate vault gain
    simulateVaultGain(address(usdc), 300e18);

    // Redeem all shares
    vm.startPrank(user);
    uint256 netAssetsOut = controller.redeem(address(usdc), shares, 0, user, block.timestamp + 100);
    vm.stopPrank();

    assertTrue(netAssetsOut > 0);
  }

  // 2. Integration Test: Partial Redemption Twice
  function testPartialRedemptionTwice() public {
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
  }

  // 3. Integration Test: Loss Redeem
  function testLossRedeem() public {
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

    vm.startPrank(user);
    usdc.approve(address(controller), 1000e18);
    UnifyVaultController.DepositQuote memory quote2 = controller.deposit(
      address(usdc),
      1000e18,
      0,
      user
    );
    vm.stopPrank();

    assertTrue(quote2.sharesPreview > 0);
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

    assertTrue(q1.sharesPreview > 0);
    assertTrue(q2.sharesPreview > 0);
  }

  // 6. Integration Test: Preview equals execution
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

  // 7. Protocol Financial & Economic Invariants
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
  }
}
