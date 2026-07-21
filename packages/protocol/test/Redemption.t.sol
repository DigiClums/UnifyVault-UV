// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/libraries/ShareLib.sol';

// Extended interface for Treasury to avoid compiling Treasury.sol directly
interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockERC20 is ERC20 {
  constructor() ERC20('MOCK', 'MOCK') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract RedemptionTest is Test {
  UnifyVaultController public controller;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;

  MockERC20 public tokenA;

  address public gov = address(0xABC);
  address public guardian = address(0x111);
  address public user = address(0x222);
  address public user2 = address(0x333);

  bytes32 public assetIdA;

  event RedeemCompleted(
    address indexed owner,
    address indexed receiver,
    address indexed asset,
    uint256 sharesBurned,
    uint256 grossAssets,
    uint256 protocolFee,
    uint256 netAssets
  );

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    // Deploy Treasury via bytecode
    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    token = new UVBTCETHToken();

    tokenA = new MockERC20();

    // 1. Grant governance access to this test contract for config
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    // 2. Register assets in Oracle Provider
    assetIdA = bytes32(uint256(uint160(address(tokenA))));
    oracleProvider.registerAsset(assetIdA, 1000 * 10 ** 18, 18, block.timestamp, 1);

    // 3. Register config in Oracle Manager
    oracleManager.configureAsset(assetIdA, address(oracleProvider), address(0), 3600, true);

    // 4. Register config in Vault
    vault.registerAsset(address(tokenA), 18);

    // 5. Register config in Treasury
    treasury.registerAsset(address(tokenA), 18);

    // 6. Deploy Controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);

    // Grant CONTROLLER_ROLE of CustodyVault, Treasury, and UVBTCETHToken to controller
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Renounce setup rights
    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));
  }

  /// @dev Helper: deposit collateral and return the net amount received as shares
  function _deposit(address depositor, uint256 amount) internal returns (uint256 sharesMinted) {
    uint256 expectedFee = FeeLib.calculateDepositFee(amount);
    uint256 expectedNet = FeeLib.calculateNetDeposit(amount);

    tokenA.mint(depositor, amount);

    vm.startPrank(depositor);
    tokenA.approve(address(vault), expectedNet);
    tokenA.approve(address(controller), expectedFee);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(tokenA),
      amount,
      0,
      depositor
    );
    vm.stopPrank();

    return quote.sharesPreview;
  }

  // --- Unit Tests ---

  function testFullRedemption() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    _deposit(user, depositAmount);

    uint256 shares = token.balanceOf(user);
    assertGt(shares, 0);

    uint256 grossAssets = ShareLib.sharesToAssets(
      shares,
      token.totalSupply(),
      vault.totalAssets(address(tokenA)),
      18
    );
    (uint256 grossOut, uint256 protocolFee, uint256 netAssets) = FeeLib.calculateRedemptionFee(
      grossAssets
    );

    uint256 receiverBalBefore = tokenA.balanceOf(user2);
    uint256 treasuryBalBefore = tokenA.balanceOf(address(treasury));

    vm.startPrank(user);
    vm.expectEmit(true, true, true, true);
    emit RedeemCompleted(user, user2, address(tokenA), shares, grossOut, protocolFee, netAssets);

    uint256 returned = controller.redeem(
      address(tokenA),
      shares,
      netAssets, // minAssetsOut exactly
      user2,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertEq(returned, netAssets);
    assertEq(token.balanceOf(user), 0);
    assertEq(token.totalSupply(), 0);
    assertEq(tokenA.balanceOf(user2) - receiverBalBefore, netAssets);
    // Treasury had deposit fee already; verify delta matches redemption fee
    assertEq(tokenA.balanceOf(address(treasury)) - treasuryBalBefore, protocolFee);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testPartialRedemption() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    uint256 redeemShares = sharesMinted / 2;

    uint256 grossAssets = ShareLib.sharesToAssets(
      redeemShares,
      token.totalSupply(),
      vault.totalAssets(address(tokenA)),
      18
    );
    (, , uint256 netAssets) = FeeLib.calculateRedemptionFee(grossAssets);

    uint256 receiverBalBefore = tokenA.balanceOf(user2);

    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      redeemShares,
      0,
      user2,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertEq(returned, netAssets);
    assertEq(token.balanceOf(user), sharesMinted - redeemShares);
    assertGt(token.totalSupply(), 0);
    assertEq(tokenA.balanceOf(user2) - receiverBalBefore, netAssets);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testReceiverDifferentFromOwner() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    assertEq(token.balanceOf(user), sharesMinted);
    assertEq(token.balanceOf(user2), 0);

    vm.startPrank(user);
    controller.redeem(address(tokenA), sharesMinted, 0, user2, block.timestamp + 1000);
    vm.stopPrank();

    assertEq(token.balanceOf(user), 0);
    assertGt(tokenA.balanceOf(user2), 0);
  }

  function testMinAssetsOutProtection() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    uint256 grossAssets = ShareLib.sharesToAssets(
      sharesMinted,
      token.totalSupply(),
      vault.totalAssets(address(tokenA)),
      18
    );
    (, , uint256 netAssets) = FeeLib.calculateRedemptionFee(grossAssets);

    // Request more than available
    vm.startPrank(user);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.SlippageLimitExceeded.selector,
        netAssets + 1,
        netAssets
      )
    );
    controller.redeem(address(tokenA), sharesMinted, netAssets + 1, user, block.timestamp + 1000);
    vm.stopPrank();
  }

  function testZeroSharesRevert() public {
    _deposit(user, 10000 * 10 ** 18);

    vm.startPrank(user);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    controller.redeem(address(tokenA), 0, 0, user, block.timestamp + 1000);
    vm.stopPrank();
  }

  function testInsufficientSharesRevert() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    vm.startPrank(user);
    // Try to redeem more than owned
    vm.expectRevert(); // ERC20 burn will revert with ERC20InsufficientBalance
    controller.redeem(address(tokenA), sharesMinted + 1, 0, user, block.timestamp + 1000);
    vm.stopPrank();
  }

  function testDeadlineExpiryRevert() public {
    _deposit(user, 10000 * 10 ** 18);

    vm.warp(block.timestamp + 2000);

    vm.startPrank(user);
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultController.DeadlineExpired.selector,
        block.timestamp - 1000,
        block.timestamp
      )
    );
    controller.redeem(address(tokenA), 100, 0, user, block.timestamp - 1000);
    vm.stopPrank();
  }

  function testPausedRedemptionRevert() public {
    _deposit(user, 10000 * 10 ** 18);

    vm.prank(guardian);
    controller.emergencyPause();

    vm.startPrank(user);
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    controller.redeem(address(tokenA), 100, 0, user, block.timestamp + 1000);
    vm.stopPrank();
  }

  function testUnsupportedAssetRevert() public {
    _deposit(user, 10000 * 10 ** 18);
    address unsupported = address(0x999);

    vm.startPrank(user);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.AssetNotSupported.selector,
        bytes32(uint256(uint160(unsupported)))
      )
    );
    controller.redeem(unsupported, 100, 0, user, block.timestamp + 1000);
    vm.stopPrank();
  }

  function testZeroReceiverRevert() public {
    _deposit(user, 10000 * 10 ** 18);

    vm.startPrank(user);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    controller.redeem(address(tokenA), 100, 0, address(0), block.timestamp + 1000);
    vm.stopPrank();
  }

  function testFeeCorrectness() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    uint256 grossAssets = ShareLib.sharesToAssets(
      sharesMinted,
      token.totalSupply(),
      vault.totalAssets(address(tokenA)),
      18
    );

    uint256 expectedFee = FeeLib.calculateRedeemFee(grossAssets);
    uint256 expectedNet = grossAssets - expectedFee;

    uint256 treasuryBalBefore = tokenA.balanceOf(address(treasury));

    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      sharesMinted,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertEq(returned, expectedNet);
    assertEq(tokenA.balanceOf(address(treasury)) - treasuryBalBefore, expectedFee);
  }

  function testPreviewRedeemMatchesExecution() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    uint256 preview = controller.previewRedeem(address(tokenA), sharesMinted);
    uint256 estimate = controller.estimateRedemption(address(tokenA), sharesMinted);
    assertEq(preview, estimate);

    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      sharesMinted,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertEq(preview, returned);
  }

  function testDepositRedeemCycleConservation() public {
    // Complete deposit + redeem cycle should return to zero state
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    assertGt(sharesMinted, 0);
    assertGt(token.totalSupply(), 0);
    assertGt(vault.totalAssets(address(tokenA)), 0);

    // Full redemption
    vm.startPrank(user);
    controller.redeem(address(tokenA), sharesMinted, 0, user, block.timestamp + 1000);
    vm.stopPrank();

    // State should be back to near-zero (only treasury has fee)
    assertEq(token.totalSupply(), 0);
    assertEq(vault.totalAssets(address(tokenA)), 0);
    assertEq(token.balanceOf(user), 0);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testDonationsDoNotAffectRedemptionPricing() public {
    uint256 depositAmount = 10000 * 10 ** 18;
    uint256 sharesMinted = _deposit(user, depositAmount);

    // Pre-compute expected redemption amounts
    uint256 accountedBefore = vault.totalAssets(address(tokenA));
    uint256 supplyBefore = token.totalSupply();
    uint256 grossAssets = ShareLib.sharesToAssets(sharesMinted, supplyBefore, accountedBefore, 18);
    (, , uint256 expectedNet) = FeeLib.calculateRedemptionFee(grossAssets);

    // Someone sends tokens directly to CustodyVault (donation / surplus)
    tokenA.mint(address(this), 5000 * 10 ** 18);
    tokenA.transfer(address(vault), 5000 * 10 ** 18);

    // Surplus should have increased
    assertGt(vault.surplusAssets(address(tokenA)), 0);

    // Redemption should still use accountedAssets, not actual balance
    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      sharesMinted,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    // Redemption output should match pre-donation calculation
    assertEq(returned, expectedNet);
    assertEq(token.totalSupply(), 0);
    assertEq(vault.totalAssets(address(tokenA)), 0);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testMultipleUsersDepositAndRedeem() public {
    uint256 amount1 = 10000 * 10 ** 18;
    uint256 amount2 = 5000 * 10 ** 18;

    uint256 shares1 = _deposit(user, amount1);
    uint256 shares2 = _deposit(user2, amount2);

    uint256 totalShares = token.totalSupply();
    assertEq(totalShares, shares1 + shares2);

    // User 1 redeems fully
    vm.startPrank(user);
    uint256 returned1 = controller.redeem(
      address(tokenA),
      shares1,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertGt(returned1, 0);
    assertEq(token.balanceOf(user), 0);
    assertGt(token.balanceOf(user2), 0);
    assertGt(token.totalSupply(), 0);

    // User 2 redeems fully
    vm.startPrank(user2);
    uint256 returned2 = controller.redeem(
      address(tokenA),
      shares2,
      0,
      user2,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertGt(returned2, 0);
    assertEq(token.totalSupply(), 0);
    assertEq(vault.totalAssets(address(tokenA)), 0);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }
}
