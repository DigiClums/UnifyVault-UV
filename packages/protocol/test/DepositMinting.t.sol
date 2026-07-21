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

contract DepositMintingTest is Test {
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

  event DepositCompleted(
    address indexed receiver,
    address indexed asset,
    uint256 grossDeposit,
    uint256 protocolFee,
    uint256 netDeposit,
    uint256 sharesMinted
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

  // --- ShareLib Unit Tests ---

  function testShareLibCalculation() public {
    // Bootstrap: supply == 0
    assertEq(ShareLib.calculateShares(100, 0, 0, 18), 100);
    assertEq(ShareLib.calculateShares(100, 0, 5000, 18), 100);

    // Proportional: supply > 0
    // shares = (netDeposit * supply) / assets = (100 * 1000) / 200 = 500
    assertEq(ShareLib.calculateShares(100, 1000, 200, 18), 500);
  }

  // --- Minting Engine Unit Tests ---

  function testFirstDepositBootstrap() public {
    uint256 amount = 10 * 10 ** 18;
    uint256 expectedFee = FeeLib.calculateDepositFee(amount);
    uint256 expectedNet = FeeLib.calculateNetDeposit(amount);

    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), expectedNet);
    tokenA.approve(address(controller), expectedFee);

    vm.expectEmit(true, true, true, true);
    emit DepositCompleted(user, address(tokenA), amount, expectedFee, expectedNet, expectedNet);

    controller.deposit(address(tokenA), amount, 0, user);
    vm.stopPrank();

    // Check shares minted
    assertEq(token.balanceOf(user), expectedNet);
    assertEq(token.totalSupply(), expectedNet);
    assertEq(tokenA.balanceOf(address(vault)), expectedNet);
    assertEq(tokenA.balanceOf(address(treasury)), expectedFee);
  }

  function testSecondDepositProportional() public {
    uint256 amount1 = 10 * 10 ** 18;
    uint256 fee1 = FeeLib.calculateDepositFee(amount1);
    uint256 net1 = amount1 - fee1;

    tokenA.mint(user, amount1);
    vm.startPrank(user);
    tokenA.approve(address(vault), net1);
    tokenA.approve(address(controller), fee1);
    controller.deposit(address(tokenA), amount1, 0, user);
    vm.stopPrank();

    // Second deposit: 5 tokens
    uint256 amount2 = 5 * 10 ** 18;
    uint256 fee2 = FeeLib.calculateDepositFee(amount2);
    uint256 net2 = amount2 - fee2;
    // Expected shares = (net2 * supply) / assets = (net2 * net1) / net1 = net2
    uint256 expectedShares = net2;

    tokenA.mint(user2, amount2);
    vm.startPrank(user2);
    tokenA.approve(address(vault), net2);
    tokenA.approve(address(controller), fee2);

    controller.deposit(address(tokenA), amount2, 0, user2);
    vm.stopPrank();

    assertEq(token.balanceOf(user2), expectedShares);
    assertEq(token.totalSupply(), net1 + expectedShares);
  }

  function testUnauthorizedMintRevert() public {
    // Rando tries to mint UVBTCETHToken
    vm.prank(user);
    vm.expectRevert();
    token.mint(user, 100);
  }

  function testZeroDepositRevert() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    controller.deposit(address(tokenA), 0, 0, user);
  }

  function testPausedMintRevert() public {
    vm.prank(guardian);
    controller.emergencyPause();

    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    controller.deposit(address(tokenA), 10 * 10 ** 18, 0, user);
  }

  function testControllerZeroBalance() public {
    uint256 amount = 10 * 10 ** 18;
    uint256 fee = FeeLib.calculateDepositFee(amount);
    uint256 net = amount - fee;

    tokenA.mint(user, amount);
    vm.startPrank(user);
    tokenA.approve(address(vault), net);
    tokenA.approve(address(controller), fee);
    controller.deposit(address(tokenA), amount, 0, user);
    vm.stopPrank();

    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  // --- Fuzz Tests ---

  function testFuzzDepositMinting(uint256 amount) public {
    vm.assume(amount > 10000 && amount < 1000000000 * 10 ** 18);

    uint256 fee = FeeLib.calculateDepositFee(amount);
    uint256 net = amount - fee;

    tokenA.mint(user, amount);
    vm.startPrank(user);
    tokenA.approve(address(vault), net);
    tokenA.approve(address(controller), fee);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(tokenA),
      amount,
      0,
      user
    );
    vm.stopPrank();

    assertEq(token.balanceOf(user), quote.sharesPreview);
    assertEq(token.totalSupply(), quote.sharesPreview);
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }
}
