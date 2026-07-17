// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

// Simple mock for Treasury to avoid Address.sol global naming collision
contract MockTreasury {}

contract MockERC20 is ERC20 {
  constructor() ERC20('MOCK', 'MOCK') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockFeeOnTransferERC20 is ERC20 {
  constructor() ERC20('FOT', 'FOT') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
    uint256 fee = amount / 10;
    uint256 netAmount = amount - fee;
    _transfer(from, to, netAmount);
    _transfer(from, address(0xdead), fee);
    _spendAllowance(from, msg.sender, amount);
    return true;
  }
}

contract MockRebasingERC20 is ERC20 {
  constructor() ERC20('REBASE', 'REBASE') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
    uint256 netAmount = (amount * 95) / 100;
    _transfer(from, to, netAmount);
    _spendAllowance(from, msg.sender, amount);
    return true;
  }
}

contract DepositCollateralTest is Test {
  UnifyVaultController public controller;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  MockTreasury public treasury;
  UVBTCETHToken public token;

  MockERC20 public tokenA;
  MockFeeOnTransferERC20 public tokenFOT;
  MockRebasingERC20 public tokenRebase;

  address public gov = address(0xABC);
  address public guardian = address(0x111);
  address public user = address(0x222);

  bytes32 public assetIdA;
  bytes32 public assetIdFOT;
  bytes32 public assetIdRebase;

  event DepositCollateralReceived(
    address indexed asset,
    address indexed user,
    address indexed receiver,
    uint256 requestedAmount,
    uint256 receivedAmount,
    uint256 timestamp
  );

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasury = new MockTreasury();
    token = new UVBTCETHToken();

    tokenA = new MockERC20();
    tokenFOT = new MockFeeOnTransferERC20();
    tokenRebase = new MockRebasingERC20();

    // 1. Grant governance access to this test contract for config
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    // 2. Register assets in Oracle Provider
    assetIdA = bytes32(uint256(uint160(address(tokenA))));
    assetIdFOT = bytes32(uint256(uint160(address(tokenFOT))));
    assetIdRebase = bytes32(uint256(uint160(address(tokenRebase))));

    oracleProvider.registerAsset(assetIdA, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(assetIdFOT, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(assetIdRebase, 1000 * 10 ** 18, 18, block.timestamp, 1);

    // 3. Register config in Oracle Manager
    oracleManager.configureAsset(assetIdA, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(assetIdFOT, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(assetIdRebase, address(oracleProvider), address(0), 3600, true);

    // 4. Register config in Vault
    vault.registerAsset(address(tokenA), 18);
    vault.registerAsset(address(tokenFOT), 18);
    vault.registerAsset(address(tokenRebase), 18);

    // 5. Deploy Controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);

    // Grant CONTROLLER_ROLE of CustodyVault to controller
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));

    // Renounce setup rights
    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
  }

  // --- Unit Tests ---

  function testSuccessfulDepositCollateralTransfer() public {
    uint256 amount = 10 * 10 ** 18;
    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), amount);

    // Expect event emission
    vm.expectEmit(true, true, true, true);
    emit DepositCollateralReceived(address(tokenA), user, user, amount, amount, block.timestamp);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(tokenA),
      amount,
      0,
      user
    );
    vm.stopPrank();

    // Verify balance movements
    assertEq(tokenA.balanceOf(user), 0);
    assertEq(tokenA.balanceOf(address(vault)), amount);
    assertEq(tokenA.balanceOf(address(controller)), 0);

    // Verify quote
    assertEq(quote.sharesOut, amount * 1000);
  }

  function testInsufficientAllowanceRevert() public {
    uint256 amount = 10 * 10 ** 18;
    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), amount - 1);

    // Reverts inside safeTransferFrom due to allowance exhaustion
    vm.expectRevert();
    controller.deposit(address(tokenA), amount, 0, user);
    vm.stopPrank();
  }

  function testInsufficientBalanceRevert() public {
    uint256 amount = 10 * 10 ** 18;
    tokenA.mint(user, amount - 1);

    vm.startPrank(user);
    tokenA.approve(address(vault), amount);

    // Reverts inside safeTransferFrom due to insufficient balance
    vm.expectRevert();
    controller.deposit(address(tokenA), amount, 0, user);
    vm.stopPrank();
  }

  function testUnsupportedAssetRevert() public {
    address unsupported = address(0x999);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.AssetNotSupported.selector,
        bytes32(uint256(uint160(unsupported)))
      )
    );
    controller.deposit(unsupported, 10 * 10 ** 18, 0, user);
  }

  function testPausedProtocolRevert() public {
    vm.prank(guardian);
    controller.emergencyPause();

    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    controller.deposit(address(tokenA), 10 * 10 ** 18, 0, user);
  }

  function testFeeOnTransferTokenRejected() public {
    uint256 amount = 10 * 10 ** 18;
    tokenFOT.mint(user, amount);

    vm.startPrank(user);
    tokenFOT.approve(address(vault), amount);

    // Reverts with InsufficientReserves due to balance mismatch (10% fee taken)
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InsufficientReserves.selector,
        address(tokenFOT),
        amount,
        amount - (amount / 10)
      )
    );
    controller.deposit(address(tokenFOT), amount, 0, user);
    vm.stopPrank();
  }

  function testRebasingMockRejected() public {
    uint256 amount = 100 * 10 ** 18;
    tokenRebase.mint(user, amount);

    vm.startPrank(user);
    tokenRebase.approve(address(vault), amount);

    // Reverts with InsufficientReserves due to balance mismatch (5% rebase reduction)
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InsufficientReserves.selector,
        address(tokenRebase),
        amount,
        (amount * 95) / 100
      )
    );
    controller.deposit(address(tokenRebase), amount, 0, user);
    vm.stopPrank();
  }

  // --- Fuzz Tests ---

  function testFuzzDepositCollateral(uint256 amount, uint256 price) public {
    vm.assume(amount > 100 && amount < 10000000 * 10 ** 18);
    vm.assume(price > 100 && price < 10000000 * 10 ** 18);

    oracleProvider.setPrice(assetIdA, price);
    oracleProvider.setTimestamp(assetIdA, uint32(block.timestamp));

    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), amount);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(tokenA),
      amount,
      0,
      user
    );
    vm.stopPrank();

    assertEq(tokenA.balanceOf(user), 0);
    assertEq(tokenA.balanceOf(address(vault)), amount);
    assertEq(tokenA.balanceOf(address(controller)), 0);

    uint256 expectedShares = (amount * price) / 10 ** 18;
    assertEq(quote.sharesOut, expectedShares);
  }
}
