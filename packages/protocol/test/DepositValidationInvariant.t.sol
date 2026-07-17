// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';
import './DepositValidation.t.sol'; // imports MockTreasury

contract DepositValidationHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  UnifyVaultController public controller;
  CustodyVault public vault;
  UVBTCETHToken public token;

  address public tokenA;

  constructor(
    UnifyVaultController _controller,
    CustodyVault _vault,
    UVBTCETHToken _token,
    address _tokenA
  ) {
    controller = _controller;
    vault = _vault;
    token = _token;
    tokenA = _tokenA;
  }

  function tryDeposit(uint256 amount, uint256 minShares, address receiver) public {
    // Calling deposit will always revert (either ValidationComplete or another error)
    // We catch all reverts to prevent the state machine from failing
    try controller.deposit(tokenA, amount, minShares, receiver) {} catch {}
  }

  function tryPreview(uint256 amount) public {
    try controller.previewDeposit(tokenA, amount) {} catch {}
  }

  function tryEstimate(uint256 amount) public {
    try controller.estimateMint(tokenA, amount) {} catch {}
  }
}

contract DepositValidationInvariantTest is Test {
  UnifyVaultController public controller;
  CustodyVault public vault;
  UVBTCETHToken public token;
  DepositValidationHandler public handler;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  MockTreasury public treasury;

  address public tokenA = address(0x333);

  uint256 public initialSupply;
  uint256 public initialVaultBalance;

  address[] public targetContracts;

  function setUp() public {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasury = new MockTreasury();
    token = new UVBTCETHToken();

    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));

    // Setup asset
    bytes32 assetId = bytes32(uint256(uint160(tokenA)));
    oracleProvider.registerAsset(assetId, 1000 * 10 ** 18, 18, block.timestamp, 1);

    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);
    vault.registerAsset(tokenA, 18);

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    handler = new DepositValidationHandler(controller, vault, token, tokenA);

    initialSupply = token.totalSupply();
    initialVaultBalance = token.balanceOf(address(vault));

    // Revoke controller role on token from test contract to prevent fuzzer calling mint
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));

    targetContracts.push(address(handler));
  }

  // Invariant 1: State remains completely unchanged
  function invariant_validationNoSideEffects() public {
    assertEq(token.totalSupply(), initialSupply);
    assertEq(token.balanceOf(address(vault)), initialVaultBalance);
  }
}
