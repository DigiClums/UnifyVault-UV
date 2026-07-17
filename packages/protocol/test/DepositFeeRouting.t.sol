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

contract DepositFeeRoutingTest is Test {
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

  event DepositCollateralReceived(
    address indexed asset,
    address indexed user,
    address indexed receiver,
    uint256 requestedAmount,
    uint256 receivedAmount,
    uint256 timestamp
  );

  event ProtocolFeeCollected(address indexed payer, address indexed asset, uint256 feeAmount);

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

    // 5. Register config in Treasury (passing decimals: 18)
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

    // Grant CONTROLLER_ROLE of CustodyVault and Treasury to controller
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));

    // Renounce setup rights
    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
  }

  // --- FeeLib Unit Tests ---

  function testFeeLibCalculation() public {
    uint256 amount = 10000;
    uint256 expectedFee = 25; // 25 BPS of 10000 = 25
    uint256 expectedNet = 9975;

    assertEq(FeeLib.calculateDepositFee(amount), expectedFee);
    assertEq(FeeLib.calculateNetDeposit(amount), expectedNet);
  }

  // --- Controller Routing Unit Tests ---

  function testSuccessfulFeeRouting() public {
    uint256 amount = 10000 * 10 ** 18;
    uint256 expectedFee = (amount * FeeLib.DEPOSIT_FEE_BPS) / FeeLib.BPS_DENOMINATOR;
    uint256 expectedNet = amount - expectedFee;

    tokenA.mint(user, amount);

    vm.startPrank(user);
    // Approve net to vault, fee to controller
    tokenA.approve(address(vault), expectedNet);
    tokenA.approve(address(controller), expectedFee);

    // Expect event emissions
    vm.expectEmit(true, true, true, true);
    emit DepositCollateralReceived(
      address(tokenA),
      user,
      user,
      amount,
      expectedNet,
      block.timestamp
    );

    vm.expectEmit(true, true, true, true);
    emit ProtocolFeeCollected(user, address(tokenA), expectedFee);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(tokenA),
      amount,
      0,
      user
    );
    vm.stopPrank();

    // Verify balance splits
    assertEq(tokenA.balanceOf(user), 0);
    assertEq(tokenA.balanceOf(address(vault)), expectedNet);
    assertEq(tokenA.balanceOf(address(treasury)), expectedFee);
    assertEq(tokenA.balanceOf(address(controller)), 0);

    // Verify quote calculations
    assertEq(quote.depositAmount, amount);
    assertEq(quote.protocolFee, expectedFee);
    assertEq(quote.netDeposit, expectedNet);
    assertEq(quote.sharesPreview, expectedNet * 1000);
  }

  function testPausedRoutingRevert() public {
    vm.prank(guardian);
    controller.emergencyPause();

    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    controller.deposit(address(tokenA), 1000, 0, user);
  }

  // --- Fuzz Tests ---

  function testFuzzFeeRoutingPrecision(uint256 amount) public {
    vm.assume(amount > 10000 && amount < 1000000000 * 10 ** 18);

    uint256 expectedFee = (amount * FeeLib.DEPOSIT_FEE_BPS) / FeeLib.BPS_DENOMINATOR;
    uint256 expectedNet = amount - expectedFee;

    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), expectedNet);
    tokenA.approve(address(controller), expectedFee);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(tokenA),
      amount,
      0,
      user
    );
    vm.stopPrank();

    assertEq(tokenA.balanceOf(user), 0);
    assertEq(tokenA.balanceOf(address(vault)), expectedNet);
    assertEq(tokenA.balanceOf(address(treasury)), expectedFee);
    assertEq(tokenA.balanceOf(address(controller)), 0);

    assertEq(quote.protocolFee, expectedFee);
    assertEq(quote.netDeposit, expectedNet);
    assertEq(quote.depositAmount, amount);
  }
}
