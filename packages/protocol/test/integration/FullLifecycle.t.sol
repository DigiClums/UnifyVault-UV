// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/libraries/FeeLib.sol';
import '../../src/libraries/ShareLib.sol';
import '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

// Interface for Treasury to avoid compiling Treasury.sol directly (namespace clash)
interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
  function collectFee(address asset, uint256 amount) external;
}

contract MockERC20 is ERC20 {
  constructor() ERC20('Mock Collateral', 'MCOL') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract FullLifecycleTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  ITestTreasury public treasury;
  CustodyVault public vault;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  MockERC20 public mockCollateral;

  address public gov = address(0xABC);
  address public guardian = address(0x111);
  address public user1 = address(0x222);
  address public user2 = address(0x333);
  address public donor = address(0x444);

  bytes32 public assetId;

  function setUp() public {
    vm.warp(100000);

    // 1. Deploy base infrastructure
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();

    // Deploy Treasury via bytecode to bypass compiler namespace collisions
    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    vault = new CustodyVault();
    token = new UVBTCETHToken();
    mockCollateral = new MockERC20();

    // 2. Deploy Controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // 3. Register modules in directory
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));

    // 4. Configure Oracle Price Feeds
    assetId = bytes32(uint256(uint160(address(mockCollateral))));
    oracleProvider.registerAsset(assetId, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);

    // 5. Register asset configs
    vault.registerAsset(address(mockCollateral), 18);
    treasury.registerAsset(address(mockCollateral), 18);

    // 6. Setup Access Control roles
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Revoke deployer control from token controller role to conform to production standards
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));
  }

  function testFullLifecycleWorkflow() public {
    uint256 depositAmt1 = 100 * 10 ** 18;
    uint256 expectedFee1 = FeeLib.calculateDepositFee(depositAmt1);
    uint256 expectedNet1 = depositAmt1 - expectedFee1;

    // --- Step 1: Mint & Approve ---
    mockCollateral.mint(user1, depositAmt1);

    vm.startPrank(user1);
    mockCollateral.approve(address(vault), expectedNet1);
    mockCollateral.approve(address(controller), expectedFee1);

    // --- Step 2: First Deposit (Bootstrap) ---
    controller.deposit(address(mockCollateral), depositAmt1, 0, user1);
    vm.stopPrank();

    // Verification of first deposit state
    assertEq(token.balanceOf(user1), expectedNet1);
    assertEq(token.totalSupply(), expectedNet1);
    assertEq(vault.totalAssets(address(mockCollateral)), expectedNet1);
    assertEq(mockCollateral.balanceOf(address(treasury)), expectedFee1);
    assertEq(mockCollateral.balanceOf(address(controller)), 0);

    // --- Step 3: Second Deposit (Proportional Shares) ---
    uint256 depositAmt2 = 50 * 10 ** 18;
    uint256 expectedFee2 = FeeLib.calculateDepositFee(depositAmt2);
    uint256 expectedNet2 = depositAmt2 - expectedFee2;

    mockCollateral.mint(user2, depositAmt2);

    vm.startPrank(user2);
    mockCollateral.approve(address(vault), expectedNet2);
    mockCollateral.approve(address(controller), expectedFee2);

    controller.deposit(address(mockCollateral), depositAmt2, 0, user2);
    vm.stopPrank();

    // Verification of second deposit state (shares = expectedNet2)
    assertEq(token.balanceOf(user2), expectedNet2);
    assertEq(token.totalSupply(), expectedNet1 + expectedNet2);
    assertEq(vault.totalAssets(address(mockCollateral)), expectedNet1 + expectedNet2);
    assertEq(mockCollateral.balanceOf(address(treasury)), expectedFee1 + expectedFee2);

    // --- Step 4: Partial Redemption ---
    uint256 redeemShares1 = expectedNet1 / 2; // Redeem 50% of user1 shares
    uint256 grossRedeem1 = ShareLib.sharesToAssets(
      redeemShares1,
      token.totalSupply(),
      vault.totalAssets(address(mockCollateral)),
      18
    );
    (, , uint256 netRedeem1) = FeeLib.calculateRedemptionFee(grossRedeem1);

    uint256 balBeforeRedeem = mockCollateral.balanceOf(user1);

    vm.prank(user1);
    uint256 redeemedOut1 = controller.redeem(
      address(mockCollateral),
      redeemShares1,
      0,
      user1,
      block.timestamp + 100
    );

    assertEq(redeemedOut1, netRedeem1);
    assertEq(mockCollateral.balanceOf(user1), balBeforeRedeem + netRedeem1);
    assertEq(token.balanceOf(user1), expectedNet1 - redeemShares1);

    // --- Step 5: Donation Immunity Verification ---
    uint256 donationAmt = 10 * 10 ** 18;
    mockCollateral.mint(address(vault), donationAmt);

    // Verify direct donations are tracked as surplus but excluded from active NAV totalAssets
    assertEq(vault.surplusAssets(address(mockCollateral)), donationAmt);
    assertEq(
      vault.totalAssets(address(mockCollateral)),
      (expectedNet1 + expectedNet2) - grossRedeem1
    );

    // --- Step 6: Full Redemption ---
    uint256 remainingUser1Shares = token.balanceOf(user1);
    uint256 grossRedeem2 = ShareLib.sharesToAssets(
      remainingUser1Shares,
      token.totalSupply(),
      vault.totalAssets(address(mockCollateral)),
      18
    );
    (, , uint256 netRedeem2) = FeeLib.calculateRedemptionFee(grossRedeem2);

    balBeforeRedeem = mockCollateral.balanceOf(user1);

    vm.prank(user1);
    uint256 redeemedOut2 = controller.redeem(
      address(mockCollateral),
      remainingUser1Shares,
      0,
      user1,
      block.timestamp + 100
    );

    assertEq(redeemedOut2, netRedeem2);
    assertEq(mockCollateral.balanceOf(user1), balBeforeRedeem + netRedeem2);
    assertEq(token.balanceOf(user1), 0);

    // --- Step 7: Final Balances & Zero State Verification ---
    assertEq(mockCollateral.balanceOf(address(controller)), 0);
    assertEq(token.balanceOf(user1), 0);
    assertEq(vault.totalAssets(address(mockCollateral)), expectedNet2); // Only user2's shares remain active
    assertEq(token.totalSupply(), expectedNet2);
  }
}
