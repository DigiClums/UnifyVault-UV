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
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import './DepositFeeRouting.t.sol'; // imports MockERC20

contract DepositFeeRoutingHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  UnifyVaultController public controller;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;
  MockERC20 public tokenA;

  address public user = address(0x222);

  uint256 public cumulativeExpectedNet = 0;
  uint256 public cumulativeExpectedFee = 0;

  constructor(
    UnifyVaultController _controller,
    CustodyVault _vault,
    ITestTreasury _treasury,
    UVBTCETHToken _token,
    MockERC20 _tokenA
  ) {
    controller = _controller;
    vault = _vault;
    treasury = _treasury;
    token = _token;
    tokenA = _tokenA;
  }

  function deposit(uint256 amount) public {
    amount = (amount % 1000000) + 10000; // Keep it bounded and positive

    uint256 expectedFee = FeeLib.calculateDepositFee(amount);
    uint256 expectedNet = FeeLib.calculateNetDeposit(amount);

    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), expectedNet);
    tokenA.approve(address(controller), expectedFee);

    try controller.deposit(address(tokenA), amount, 0, user) {
      cumulativeExpectedNet += expectedNet;
      cumulativeExpectedFee += expectedFee;
    } catch {}
    vm.stopPrank();
  }
}

contract DepositFeeRoutingInvariantTest is Test {
  UnifyVaultController public controller;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;
  DepositFeeRoutingHandler public handler;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;

  MockERC20 public tokenA;

  address[] public targetContracts;

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

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));

    // Setup asset
    bytes32 assetId = bytes32(uint256(uint160(address(tokenA))));
    oracleProvider.registerAsset(assetId, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);
    vault.registerAsset(address(tokenA), 18);
    treasury.registerAsset(address(tokenA), 18);

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));

    handler = new DepositFeeRoutingHandler(controller, vault, treasury, token, tokenA);

    // Revoke controller role on token from test contract to prevent fuzzer calling mint
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));

    targetContracts.push(address(handler));
  }

  // Invariant 1: Controller never retains collateral tokens
  function invariant_controllerBalanceNeutral() public {
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  // Invariant 2: CustodyVault contains exactly the cumulative successfully deposited net collateral
  function invariant_vaultBalanceAccounting() public {
    assertEq(tokenA.balanceOf(address(vault)), handler.cumulativeExpectedNet());
  }

  // Invariant 3: Treasury contains exactly the cumulative successfully deposited protocol fees
  function invariant_treasuryBalanceAccounting() public {
    assertEq(tokenA.balanceOf(address(treasury)), handler.cumulativeExpectedFee());
  }

  // Invariant 4: No shares are minted or protocol supply altered
  function invariant_tokenSupplyNeutral() public {
    assertEq(token.totalSupply(), 0);
  }
}
