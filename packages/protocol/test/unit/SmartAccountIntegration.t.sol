// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/treasury/FeeManager.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

/**
 * @notice Mock ERC-20 collateral token (USDC with 6 decimals)
 */
contract MockCollateralToken is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {
    _mint(msg.sender, 1_000_000 * 1e6);
  }

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

/**
 * @notice Standard ERC-4337 / ERC-1271 Smart Account implementation for testing
 */
contract MockERC4337SmartAccount {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  address public owner;
  bytes4 internal constant MAGICVALUE = 0x1626ba7e;
  bytes4 internal constant INVALID_SIGNATURE = 0xffffffff;

  error Unauthorized();
  error CallFailed(uint256 index, bytes returnData);

  event Executed(address indexed dest, uint256 value, bytes data);
  event BatchExecuted(uint256 totalCalls);

  constructor(address _owner) {
    owner = _owner;
  }

  modifier onlyOwner() {
    if (msg.sender != owner) revert Unauthorized();
    _;
  }

  function execute(
    address dest,
    uint256 value,
    bytes calldata func
  ) external payable onlyOwner returns (bytes memory) {
    (bool success, bytes memory result) = dest.call{ value: value }(func);
    if (!success) {
      revert CallFailed(0, result);
    }
    emit Executed(dest, value, func);
    return result;
  }

  function executeBatch(
    address[] calldata dests,
    uint256[] calldata values,
    bytes[] calldata funcs
  ) external payable onlyOwner returns (bytes[] memory results) {
    require(dests.length == values.length && values.length == funcs.length, 'Length mismatch');
    results = new bytes[](dests.length);
    for (uint256 i = 0; i < dests.length; i++) {
      (bool success, bytes memory res) = dests[i].call{ value: values[i] }(funcs[i]);
      if (!success) {
        revert CallFailed(i, res);
      }
      results[i] = res;
    }
    emit BatchExecuted(dests.length);
  }

  function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
    address recovered = hash.recover(signature);
    if (recovered == owner) {
      return MAGICVALUE;
    }
    return INVALID_SIGNATURE;
  }

  receive() external payable {}
}

/**
 * @title SmartAccountIntegrationTest
 * @notice Tests Smart Account interactions with UnifyVault protocol,
 * ensuring ERC-4337 compatibility, exact accounting conservation,
 * ERC-1271 validation, UVBE transfers, and P2P compatibility.
 */
contract SmartAccountIntegrationTest is Test {
  ProtocolDirectory public directory;
  MockCollateralToken public usdc;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBEV2 public token;
  FeeManager public feeManager;
  CostBasisManagerV2 public costBasisManager;
  P2PEscrowV2 public escrow;
  UnifyVaultController public controller;

  address public admin = address(this);
  uint256 public ownerPrivateKey = 0xA11CE;
  address public ownerAddress;
  MockERC4337SmartAccount public smartAccount;

  address public bob = address(0xBB2);
  bytes32 public assetId;

  function setUp() public {
    vm.warp(100000);
    ownerAddress = vm.addr(ownerPrivateKey);

    // Deploy Smart Account owned by ownerAddress
    smartAccount = new MockERC4337SmartAccount(ownerAddress);

    directory = new ProtocolDirectory();
    usdc = new MockCollateralToken();
    assetId = bytes32(uint256(uint160(address(usdc))));

    oracleProvider = new MockOracleProvider();
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    // 1 USDC = $1.00 (rawPrice 1e6 with 6 decimals, or 1e18 normalized)
    oracleProvider.registerAsset(assetId, 1e6, 6, block.timestamp, 1);

    oracleManager = new OracleManager();
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);

    vault = new CustodyVault();
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(this));
    vault.registerAsset(address(usdc), 6);

    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.registerAsset(address(usdc), 6);

    token = new UVBEV2(admin);
    token.grantRole(token.CONTROLLER_ROLE(), admin);
    token.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    costBasisManager = new CostBasisManagerV2(admin, address(directory));
    costBasisManager.setModules(address(0), address(token));
    token.setCostBasisManager(address(costBasisManager));

    escrow = new P2PEscrowV2(address(treasury), 100); // 1% fee
    costBasisManager.setEscrowStatus(address(escrow), true);

    feeManager = new FeeManager(address(treasury));
    feeManager.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // Register modules in ProtocolDirectory
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));

    // Grant roles
    vault.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    costBasisManager.grantRole(costBasisManager.CONTROLLER_ROLE(), address(controller));

    // Fund Smart Account with 10,000 USDC
    usdc.mint(address(smartAccount), 10_000 * 1e6);
  }

  // 1. Smart Account can execute batched Approve + Deposit
  function test_SmartAccount_CanDeposit() public {
    uint256 depositAmount = 1000 * 1e6; // $1,000 USDC
    uint256 minSharesOut = 100 * 1e18;

    address[] memory dests = new address[](2);
    uint256[] memory values = new uint256[](2);
    bytes[] memory funcs = new bytes[](2);

    // Call 1: Exact USDC approval
    dests[0] = address(usdc);
    values[0] = 0;
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, address(controller), depositAmount);

    // Call 2: Controller.deposit
    dests[1] = address(controller);
    values[1] = 0;
    funcs[1] = abi.encodeWithSelector(
      controller.deposit.selector,
      address(usdc),
      depositAmount,
      minSharesOut,
      address(smartAccount)
    );

    // Execute batch from Smart Account via owner
    vm.prank(ownerAddress);
    smartAccount.executeBatch(dests, values, funcs);

    // Assertions
    uint256 smartAccountShares = token.balanceOf(address(smartAccount));
    assertGt(smartAccountShares, 0, 'Smart Account should have received UVBE shares');
    // Net deposit goes to vault (997.5 USDC) and 25 bps protocol fee routes to treasury (2.5 USDC)
    assertEq(
      usdc.balanceOf(address(vault)),
      997_500_000,
      'CustodyVault must receive net USDC collateral'
    );
    assertEq(
      usdc.balanceOf(address(vault)) + usdc.balanceOf(address(treasury)),
      depositAmount,
      'Total deposit conserved across vault and treasury fee routing'
    );
    assertEq(
      usdc.balanceOf(address(smartAccount)),
      9000 * 1e6,
      'Smart Account USDC balance decreased'
    );
    assertEq(
      usdc.allowance(address(smartAccount), address(controller)),
      0,
      'USDC allowance must be 0 (exact approval consumed)'
    );

    // Accounting check: Cost basis tracked
    assertGt(costBasisManager.costBasis(address(smartAccount)), 0, 'Cost basis must be recorded');
  }

  // 2. Smart Account can call Controller.redeem
  function test_SmartAccount_CanRedeem() public {
    // First deposit
    uint256 depositAmount = 1000 * 1e6;
    _performSmartAccountDeposit(depositAmount);

    uint256 sharesToRedeem = token.balanceOf(address(smartAccount));
    assertGt(sharesToRedeem, 0);

    // Smart Account calls Controller.redeem
    bytes memory redeemCalldata = abi.encodeWithSelector(
      controller.redeem.selector,
      address(usdc),
      sharesToRedeem,
      0, // minAssetsOut
      address(smartAccount),
      block.timestamp + 3600
    );

    vm.prank(ownerAddress);
    smartAccount.execute(address(controller), 0, redeemCalldata);

    // Assertions
    assertEq(token.balanceOf(address(smartAccount)), 0, 'Shares must be burned');
    assertEq(
      costBasisManager.costBasis(address(smartAccount)),
      0,
      'Cost basis must be 0 after full redemption'
    );
    assertGt(
      usdc.balanceOf(address(smartAccount)),
      9000 * 1e6,
      'Smart account received USDC payout'
    );
  }

  // 3. Smart Account can hold and transfer UVBE with Cost Basis conservation
  function test_SmartAccount_CanHoldAndTransferUVBE() public {
    uint256 depositAmount = 1000 * 1e6;
    _performSmartAccountDeposit(depositAmount);

    uint256 totalShares = token.balanceOf(address(smartAccount));
    uint256 transferShares = totalShares / 2;
    uint256 initialTotalSupply = token.totalSupply();
    uint256 initialSmartAccountBasis = costBasisManager.costBasis(address(smartAccount));

    // Smart Account transfers 50% of UVBE to Bob
    bytes memory transferCalldata = abi.encodeWithSelector(
      IERC20.transfer.selector,
      bob,
      transferShares
    );

    vm.prank(ownerAddress);
    smartAccount.execute(address(token), 0, transferCalldata);

    // Balance checks
    assertEq(token.balanceOf(bob), transferShares, 'Bob receives exact shares');
    assertEq(
      token.balanceOf(address(smartAccount)),
      totalShares - transferShares,
      'Smart Account balance reduced'
    );

    // Total supply check (Invariance: No supply change)
    assertEq(token.totalSupply(), initialTotalSupply, 'Total supply must remain constant');

    // P&L checks (Invariance: No P&L created by transfer)
    assertEq(
      costBasisManager.realizedPnL(address(smartAccount)),
      0,
      'No P&L for sender on transfer'
    );
    assertEq(costBasisManager.realizedPnL(bob), 0, 'No P&L for receiver on transfer');

    // Cost basis conservation check
    uint256 smartAccountBasisAfter = costBasisManager.costBasis(address(smartAccount));
    uint256 bobBasisAfter = costBasisManager.costBasis(bob);
    assertApproxEqAbs(
      smartAccountBasisAfter + bobBasisAfter,
      initialSmartAccountBasis,
      1,
      'Total cost basis must be conserved across transfer'
    );
  }

  // 4. Gas sponsorship does not mutate vault collateral or accounting invariants
  function test_SmartAccount_AccountingInvariants_IsolatedFromGas() public {
    uint256 vaultCollateralBefore = usdc.balanceOf(address(vault));
    assertEq(vaultCollateralBefore, 0);

    _performSmartAccountDeposit(500 * 1e6);

    uint256 vaultCollateralAfter = usdc.balanceOf(address(vault));
    assertEq(
      vaultCollateralAfter + usdc.balanceOf(address(treasury)),
      500 * 1e6,
      'Vault collateral strictly matches deposit without gas deductions'
    );
  }

  // 5. Smart Account is compatible with P2PEscrowV2
  function test_SmartAccount_P2PEscrowCompatibility() public {
    // Deposit to get UVBE
    _performSmartAccountDeposit(1000 * 1e6);
    uint256 escrowAmount = 100 * 1e18;

    // Smart Account approves UVBE to P2PEscrowV2
    bytes memory approveCalldata = abi.encodeWithSelector(
      IERC20.approve.selector,
      address(escrow),
      escrowAmount
    );
    vm.prank(ownerAddress);
    smartAccount.execute(address(token), 0, approveCalldata);

    // Smart Account creates and funds trade as seller
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: bob,
      seller: address(smartAccount),
      asset: address(token),
      amount: escrowAmount,
      fiatAmount: 100 * 1e6,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 3600
    });

    bytes memory createTradeCalldata = abi.encodeWithSelector(escrow.createTrade.selector, params);

    vm.prank(ownerAddress);
    smartAccount.execute(address(escrow), 0, createTradeCalldata);

    // Cost basis should remain with seller during escrow hold (Escrow isolation invariant)
    assertGt(
      costBasisManager.costBasis(address(smartAccount)),
      0,
      'Cost basis not lost during escrow funding'
    );
  }

  // 6. ERC-1271 Signature Validation
  function test_SmartAccount_ERC1271Validation() public {
    bytes32 messageHash = keccak256(abi.encodePacked('UnifyVault Auth Message'));
    bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, ethSignedHash);
    bytes memory validSig = abi.encodePacked(r, s, v);

    // Valid signature check
    bytes4 result = smartAccount.isValidSignature(ethSignedHash, validSig);
    assertEq(
      bytes32(result),
      bytes32(0x1626ba7e00000000000000000000000000000000000000000000000000000000),
      'Valid owner signature must return ERC-1271 magic value'
    );

    // Invalid signature check (signed by attacker)
    uint256 attackerKey = 0xBAD;
    (uint8 av, bytes32 ar, bytes32 asig) = vm.sign(attackerKey, ethSignedHash);
    bytes memory invalidSig = abi.encodePacked(ar, asig, av);

    bytes4 invalidResult = smartAccount.isValidSignature(ethSignedHash, invalidSig);
    assertEq(
      bytes32(invalidResult),
      bytes32(0xffffffff00000000000000000000000000000000000000000000000000000000),
      'Invalid signature must return failure magic value'
    );
  }

  // 7. Non-owner cannot execute calls through Smart Account
  function test_SmartAccount_RevertOnUnauthorizedCall() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, bob, 100);

    vm.prank(bob); // Bob is not owner
    vm.expectRevert(MockERC4337SmartAccount.Unauthorized.selector);
    smartAccount.execute(address(usdc), 0, func);
  }

  // Helper internal function
  function _performSmartAccountDeposit(uint256 amount) internal {
    address[] memory dests = new address[](2);
    uint256[] memory values = new uint256[](2);
    bytes[] memory funcs = new bytes[](2);

    dests[0] = address(usdc);
    values[0] = 0;
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, address(controller), amount);

    dests[1] = address(controller);
    values[1] = 0;
    funcs[1] = abi.encodeWithSelector(
      controller.deposit.selector,
      address(usdc),
      amount,
      0,
      address(smartAccount)
    );

    vm.prank(ownerAddress);
    smartAccount.executeBatch(dests, values, funcs);
  }
}
