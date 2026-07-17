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
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/libraries/ShareLib.sol';

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

contract RedemptionFuzzTest is Test {
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

  bytes32 public assetIdA;

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    token = new UVBTCETHToken();
    tokenA = new MockERC20();

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    assetIdA = bytes32(uint256(uint160(address(tokenA))));
    oracleProvider.registerAsset(assetIdA, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetIdA, address(oracleProvider), address(0), 3600, true);
    vault.registerAsset(address(tokenA), 18);
    treasury.registerAsset(address(tokenA), 18);

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));
  }

  function _deposit(address depositor, uint256 amount) internal returns (uint256) {
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

  // --- Fuzz Tests ---

  function testFuzzFullRedemption(uint256 amount) public {
    vm.assume(amount >= 1 ether && amount < 1000000000 * 10 ** 18);

    _deposit(user, amount);

    uint256 shares = token.balanceOf(user);
    vm.assume(shares > 0);

    uint256 accountedAssets = vault.totalAssets(address(tokenA));
    uint256 totalSupply = token.totalSupply();
    uint256 grossAssets = ShareLib.sharesToAssets(shares, totalSupply, accountedAssets);
    (, uint256 protocolFee, uint256 netAssets) = FeeLib.calculateRedemptionFee(grossAssets);

    uint256 treasuryBalBefore = tokenA.balanceOf(address(treasury));

    vm.startPrank(user);
    uint256 returned = controller.redeem(address(tokenA), shares, 0, user, block.timestamp + 1000);
    vm.stopPrank();

    assertEq(returned, netAssets);
    assertEq(token.balanceOf(user), 0);
    assertEq(token.totalSupply(), 0);
    assertEq(tokenA.balanceOf(address(treasury)) - treasuryBalBefore, protocolFee);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testFuzzPartialRedemption(uint256 depositAmount, uint256 redeemFraction) public {
    vm.assume(depositAmount >= 1 ether && depositAmount < 1000000000 * 10 ** 18);
    vm.assume(redeemFraction > 0 && redeemFraction <= 100);

    uint256 sharesMinted = _deposit(user, depositAmount);
    uint256 redeemShares = (sharesMinted * redeemFraction) / 100;
    vm.assume(redeemShares > 0);

    uint256 sharesBefore = token.balanceOf(user);
    uint256 supplyBefore = token.totalSupply();

    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      redeemShares,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertGt(returned, 0);
    assertEq(token.balanceOf(user), sharesBefore - redeemShares);
    assertEq(token.totalSupply(), supplyBefore - redeemShares);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testFuzzDepositRedeemCycles(uint256 seed) public {
    // Multiple deposit/redeem cycles should maintain consistency
    vm.assume(seed > 0);

    address alice = address(uint160(1000 + (seed % 10000)));
    address bob = address(uint160(2000 + (seed % 20000)));

    for (uint256 i = 0; i < 3; i++) {
      uint256 depositAmount = 10000 * 10 ** 18;

      // Alice deposits
      tokenA.mint(alice, depositAmount);
      vm.startPrank(alice);
      uint256 fee = FeeLib.calculateDepositFee(depositAmount);
      uint256 net = FeeLib.calculateNetDeposit(depositAmount);
      tokenA.approve(address(vault), net);
      tokenA.approve(address(controller), fee);
      controller.deposit(address(tokenA), depositAmount, 0, alice);
      vm.stopPrank();

      // Bob deposits
      tokenA.mint(bob, depositAmount);
      vm.startPrank(bob);
      fee = FeeLib.calculateDepositFee(depositAmount);
      net = FeeLib.calculateNetDeposit(depositAmount);
      tokenA.approve(address(vault), net);
      tokenA.approve(address(controller), fee);
      controller.deposit(address(tokenA), depositAmount, 0, bob);
      vm.stopPrank();

      // Alice redeems half
      uint256 aliceShares = token.balanceOf(alice);
      uint256 redeemHalf = aliceShares / 2;
      vm.assume(redeemHalf > 0);
      vm.startPrank(alice);
      controller.redeem(address(tokenA), redeemHalf, 0, alice, block.timestamp + 1000);
      vm.stopPrank();

      // Verify core invariants
      assertEq(tokenA.balanceOf(address(controller)), 0);
      assertEq(token.totalSupply(), token.balanceOf(alice) + token.balanceOf(bob));
    }
  }

  function testFuzzDonationBeforeRedemption(uint256 depositAmount, uint256 donationAmount) public {
    vm.assume(depositAmount > 10000 && depositAmount < 1000000000 * 10 ** 18);
    vm.assume(donationAmount > 0 && donationAmount < 10000000 * 10 ** 18);

    uint256 sharesMinted = _deposit(user, depositAmount);

    uint256 accountedBefore = vault.totalAssets(address(tokenA));
    uint256 supplyBefore = token.totalSupply();
    uint256 grossAssets = ShareLib.sharesToAssets(sharesMinted, supplyBefore, accountedBefore);
    (, , uint256 expectedNet) = FeeLib.calculateRedemptionFee(grossAssets);

    // Donate tokens directly to vault (creates surplus, not accounted)
    tokenA.mint(address(this), donationAmount);
    tokenA.transfer(address(vault), donationAmount);

    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      sharesMinted,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    // Redemption should NOT be affected by donation — uses accountedAssets
    assertEq(returned, expectedNet);
    assertEq(vault.totalAssets(address(tokenA)), 0);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testFuzzDonationAfterPartialRedemption(
    uint256 depositAmount,
    uint256 donationAmount
  ) public {
    vm.assume(depositAmount > 10000 && depositAmount < 1000000000 * 10 ** 18);
    vm.assume(donationAmount > 0 && donationAmount < 10000000 * 10 ** 18);

    uint256 sharesMinted = _deposit(user, depositAmount);
    uint256 redeemShares = sharesMinted / 2;
    vm.assume(redeemShares > 0);

    // Redeem half first
    vm.startPrank(user);
    controller.redeem(address(tokenA), redeemShares, 0, user, block.timestamp + 1000);
    vm.stopPrank();

    uint256 remainingShares = token.balanceOf(user);
    uint256 accountedBefore = vault.totalAssets(address(tokenA));
    uint256 supplyBefore = token.totalSupply();
    uint256 grossAssets = ShareLib.sharesToAssets(remainingShares, supplyBefore, accountedBefore);
    (, , uint256 expectedNet) = FeeLib.calculateRedemptionFee(grossAssets);

    // Donate after partial redemption
    tokenA.mint(address(this), donationAmount);
    tokenA.transfer(address(vault), donationAmount);

    // Redeem remaining
    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      remainingShares,
      0,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();

    assertEq(returned, expectedNet);
    assertEq(token.totalSupply(), 0);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  function testFuzzMinAssetsOutBoundary(uint256 amount) public {
    vm.assume(amount > 10000 && amount < 1000000000 * 10 ** 18);

    uint256 sharesMinted = _deposit(user, amount);

    uint256 grossAssets = ShareLib.sharesToAssets(
      sharesMinted,
      token.totalSupply(),
      vault.totalAssets(address(tokenA))
    );
    (, , uint256 netAssets) = FeeLib.calculateRedemptionFee(grossAssets);

    // Exact minAssetsOut should succeed
    vm.startPrank(user);
    uint256 returned = controller.redeem(
      address(tokenA),
      sharesMinted,
      netAssets,
      user,
      block.timestamp + 1000
    );
    vm.stopPrank();
    assertEq(returned, netAssets);
  }
}
