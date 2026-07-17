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

// Simple mock for Treasury to avoid Address.sol global naming collision
contract MockTreasury {}

contract MockERC20 is ERC20 {
  constructor() ERC20('MOCK', 'MOCK') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract DepositCollateralHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  UnifyVaultController public controller;
  CustodyVault public vault;
  UVBTCETHToken public token;
  MockERC20 public tokenA;

  address public user = address(0x222);

  uint256 public cumulativeExpectedReceived = 0;

  constructor(
    UnifyVaultController _controller,
    CustodyVault _vault,
    UVBTCETHToken _token,
    MockERC20 _tokenA
  ) {
    controller = _controller;
    vault = _vault;
    token = _token;
    tokenA = _tokenA;
  }

  function deposit(uint256 amount) public {
    amount = (amount % 1000000) + 1; // Keep it bounded and positive

    tokenA.mint(user, amount);

    vm.startPrank(user);
    tokenA.approve(address(vault), amount);

    try controller.deposit(address(tokenA), amount, 0, user) {
      cumulativeExpectedReceived += amount;
    } catch {}
    vm.stopPrank();
  }
}

contract DepositCollateralInvariantTest is Test {
  UnifyVaultController public controller;
  CustodyVault public vault;
  UVBTCETHToken public token;
  DepositCollateralHandler public handler;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  MockTreasury public treasury;

  MockERC20 public tokenA;

  address[] public targetContracts;

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasury = new MockTreasury();
    token = new UVBTCETHToken();

    tokenA = new MockERC20();

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));

    // Setup asset
    bytes32 assetId = bytes32(uint256(uint160(address(tokenA))));
    oracleProvider.registerAsset(assetId, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);
    vault.registerAsset(address(tokenA), 18);

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));

    handler = new DepositCollateralHandler(controller, vault, token, tokenA);

    targetContracts.push(address(handler));
  }

  // Invariant 1: Controller never retains collateral tokens
  function invariant_controllerBalanceNeutral() public {
    assertEq(tokenA.balanceOf(address(controller)), 0);
  }

  // Invariant 2: CustodyVault contains exactly the cumulative successfully deposited collateral
  function invariant_vaultBalanceAccounting() public {
    assertEq(tokenA.balanceOf(address(vault)), handler.cumulativeExpectedReceived());
  }

  // Invariant 3: No shares are minted or protocol supply altered
  function invariant_tokenSupplyNeutral() public {
    assertEq(token.totalSupply(), 0);
  }

  // Invariant 4: Treasury is untouched
  function invariant_treasuryBalanceNeutral() public {
    assertEq(tokenA.balanceOf(address(treasury)), 0);
  }
}
