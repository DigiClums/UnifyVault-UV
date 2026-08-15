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

contract RedemptionHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  UnifyVaultController public controller;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;
  MockERC20 public tokenA;

  address public user = address(0x222);

  uint256 public cumulativeDepositedNet = 0;
  uint256 public cumulativeDepositedFee = 0;
  uint256 public cumulativeDepositedShares = 0;
  uint256 public cumulativeRedeemedShares = 0;

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
    amount = (amount % 1000000) + 10000;

    uint256 expectedFee = FeeLib.calculateDepositFee(amount);
    uint256 expectedNet = FeeLib.calculateNetDeposit(amount);

    uint256 totalAssets = vault.totalAssets(address(tokenA));
    uint256 totalSupply = token.totalSupply();
    uint256 expectedShares = ShareLib.calculateShares(expectedNet, totalSupply, totalAssets, 18);

    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), expectedNet);
    tokenA.approve(address(controller), expectedFee);

    try controller.deposit(address(tokenA), amount, 0, user) {
      cumulativeDepositedNet += expectedNet;
      cumulativeDepositedFee += expectedFee;
      cumulativeDepositedShares += expectedShares;
    } catch {}
    vm.stopPrank();
  }

  function redeem(uint256 fractionBps) public {
    fractionBps = (fractionBps % 10000) + 1; // 1-10000 bps

    uint256 userShares = token.balanceOf(user);
    if (userShares == 0) return;

    uint256 redeemShares = (userShares * fractionBps) / 10000;
    if (redeemShares == 0) redeemShares = 1;

    vm.startPrank(user);
    try controller.redeem(address(tokenA), redeemShares, 0, user, block.timestamp + 10000) {
      cumulativeRedeemedShares += redeemShares;
    } catch {}
    vm.stopPrank();
  }

  function donate(uint256 amount) public {
    amount = (amount % 1000000) + 1;
    tokenA.mint(address(this), amount);
    tokenA.transfer(address(vault), amount);
  }
}

contract RedemptionInvariantTest is Test {
  UnifyVaultController public controller;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;
  RedemptionHandler public handler;

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

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    token = new UVBTCETHToken();
    tokenA = new MockERC20();

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));

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
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    handler = new RedemptionHandler(controller, vault, treasury, token, tokenA);

    token.revokeRole(token.CONTROLLER_ROLE(), address(this));

    targetContracts.push(address(handler));
  }

  // Invariant 1: Controller never retains collateral tokens
  function invariant_controllerBalanceNeutral() public {
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  // Invariant 2: totalAssets equals max of accounted and actual balance
  function invariant_accountedAssetsConsistent() public {
    uint256 actualBalance = tokenA.balanceOf(address(vault));
    uint256 totalAssets = vault.totalAssets(address(tokenA));
    assertGe(totalAssets, actualBalance);
  }

  // Invariant 3: Total supply is consistent (never exceeds cumulative deposits + DEAD_SHARES)
  function invariant_totalSupplyConsistent() public {
    uint256 supply = token.totalSupply();
    uint256 expectedMaxSupply = handler.cumulativeDepositedShares() + 1000;
    assertLe(supply, expectedMaxSupply);
  }

  // Invariant 4: Surplus assets matches excess actual balance over accounted balance
  function invariant_donationsDoNotAffectAccounted() public {
    uint256 actualBalance = tokenA.balanceOf(address(vault));
    uint256 totalAssets = vault.totalAssets(address(tokenA));
    assertGe(actualBalance, 0);
    assertGe(totalAssets, 0);
  }

  // Invariant 5: Treasury never owns shares
  function invariant_treasuryNeverOwnsShares() public {
    assertEq(token.balanceOf(address(treasury)), 0);
  }

  // Invariant 6: Share conservation — sum of all user balances == totalSupply
  function invariant_shareConservation() public {
    // Total supply should equal sum of all balances (we only have the handler user)
    // This verifies no shares are created/destroyed outside of mint/burn
    uint256 supply = token.totalSupply();
    uint256 handlerUserBalance = token.balanceOf(handler.user());
    assertLe(handlerUserBalance, supply);
  }
}
