// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/vault/CustodyVault.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

contract MockERC20 is ERC20 {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
    _mint(msg.sender, 1000000 * 10 ** decimals_);
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }
}

contract CustodyVaultTest is Test {
  CustodyVault public vault;
  MockERC20 public tokenA;
  MockERC20 public tokenB;

  address public gov = address(0xABC);
  address public controller = address(0xDEF);
  address public guardian = address(0x111);
  address public user = address(0x222);

  event AssetRegistered(address indexed asset, uint8 decimals, address indexed caller);
  event AssetEnabled(address indexed asset, address indexed caller);
  event AssetDisabled(address indexed asset, address indexed caller);
  event AssetRemoved(address indexed asset, address indexed caller);

  event DepositExecuted(
    address indexed asset,
    address indexed from,
    uint256 amount,
    address indexed caller
  );
  event WithdrawalExecuted(
    address indexed asset,
    address indexed to,
    uint256 amount,
    address indexed caller
  );

  function setUp() public {
    vault = new CustodyVault();

    tokenA = new MockERC20('Token A', 'TKNA', 18);
    tokenB = new MockERC20('Token B', 'TKNB', 6);

    // Grant Roles
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    vault.grantRole(vault.CONTROLLER_ROLE(), controller);
    vault.grantRole(vault.GUARDIAN_ROLE(), guardian);

    // Renounce deployer access for strict RBAC checks
    vault.renounceRole(vault.CONTROLLER_ROLE(), address(this));
    vault.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.renounceRole(vault.GUARDIAN_ROLE(), address(this));

    // Pre-register TokenA
    vm.startPrank(gov);
    vault.registerAsset(address(tokenA), 18);
    vm.stopPrank();

    // Deal some tokens to user
    tokenA.transfer(user, 10000 * 10 ** 18);
    tokenB.transfer(user, 10000 * 10 ** 6);

    // User approves vault
    vm.prank(user);
    tokenA.approve(address(vault), type(uint256).max);
    vm.prank(user);
    tokenB.approve(address(vault), type(uint256).max);
  }

  // --- Unit Tests ---

  function testRegisterAssetSuccess() public {
    vm.startPrank(gov);
    vm.expectEmit(true, false, false, true);
    emit AssetRegistered(address(tokenB), 6, gov);
    vault.registerAsset(address(tokenB), 6);
    vm.stopPrank();

    assertTrue(vault.isSupported(address(tokenB)));
    assertEq(vault.assetConfig(address(tokenB)).decimals, 6);
  }

  function testRegisterDuplicateAssetRevert() public {
    vm.startPrank(gov);
    vm.expectRevert(
      abi.encodeWithSelector(
        Errors.EntryAlreadyExists.selector,
        bytes32(uint256(uint160(address(tokenA))))
      )
    );
    vault.registerAsset(address(tokenA), 18);
    vm.stopPrank();
  }

  function testRemoveAssetSuccess() public {
    vm.startPrank(gov);
    vm.expectEmit(true, false, false, true);
    emit AssetRemoved(address(tokenA), gov);
    vault.removeAsset(address(tokenA));
    vm.stopPrank();

    assertFalse(vault.isSupported(address(tokenA)));
  }

  function testDisableAndEnableAsset() public {
    vm.startPrank(gov);
    // Disable
    vm.expectEmit(true, false, false, true);
    emit AssetDisabled(address(tokenA), gov);
    vault.disableAsset(address(tokenA));
    assertFalse(vault.isSupported(address(tokenA)));

    // Enable
    vm.expectEmit(true, false, false, true);
    emit AssetEnabled(address(tokenA), gov);
    vault.enableAsset(address(tokenA));
    assertTrue(vault.isSupported(address(tokenA)));
    vm.stopPrank();
  }

  function testDepositSuccess() public {
    uint256 amount = 100 * 10 ** 18;

    vm.expectEmit(true, true, false, true);
    emit DepositExecuted(address(tokenA), user, amount, controller);

    vm.prank(controller);
    vault.deposit(address(tokenA), user, amount);

    assertEq(vault.balance(address(tokenA)), amount);
    assertEq(vault.totalAssetBalance(address(tokenA)), amount);
  }

  function testDepositUnsupportedRevert() public {
    vm.prank(controller);
    vm.expectRevert(
      abi.encodeWithSelector(
        Errors.AssetNotSupported.selector,
        bytes32(uint256(uint160(address(tokenB))))
      )
    );
    vault.deposit(address(tokenB), user, 100 * 10 ** 6);
  }

  function testWithdrawSuccess() public {
    uint256 amount = 100 * 10 ** 18;

    // Deposit first
    vm.prank(controller);
    vault.deposit(address(tokenA), user, amount);

    // Withdraw
    vm.expectEmit(true, true, false, true);
    emit WithdrawalExecuted(address(tokenA), user, amount, controller);

    vm.prank(controller);
    vault.withdraw(address(tokenA), user, amount);

    assertEq(vault.balance(address(tokenA)), 0);
  }

  function testWithdrawInsufficientBalanceRevert() public {
    vm.prank(controller);
    vm.expectRevert(
      abi.encodeWithSelector(
        Errors.InsufficientReserves.selector,
        address(tokenA),
        100 * 10 ** 18,
        0
      )
    );
    vault.withdraw(address(tokenA), user, 100 * 10 ** 18);
  }

  function testPauseBlocksDepositAndWithdraw() public {
    vm.prank(guardian);
    vault.pause();
    assertTrue(vault.paused());

    // Deposit fails
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    vm.prank(controller);
    vault.deposit(address(tokenA), user, 100 * 10 ** 18);

    // Withdraw fails
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    vm.prank(controller);
    vault.withdraw(address(tokenA), user, 100 * 10 ** 18);
  }

  function testUnpauseGovSuccess() public {
    vm.prank(guardian);
    vault.pause();

    vm.prank(gov);
    vault.unpause();
    assertFalse(vault.paused());
  }

  function testZeroAmountDepositWithdrawRevert() public {
    vm.expectRevert(abi.encodeWithSelector(Errors.MathCalculationOverflow.selector));
    vm.prank(controller);
    vault.deposit(address(tokenA), user, 0);

    vm.expectRevert(abi.encodeWithSelector(Errors.MathCalculationOverflow.selector));
    vm.prank(controller);
    vault.withdraw(address(tokenA), user, 0);
  }

  function testRBACReverts() public {
    // Register asset (only gov)
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    vm.prank(user);
    vault.registerAsset(address(tokenB), 6);

    // Deposit (only controller)
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        vault.CONTROLLER_ROLE()
      )
    );
    vm.prank(user);
    vault.deposit(address(tokenA), user, 100 * 10 ** 18);
  }

  // --- Fuzz Tests ---

  function testFuzzDepositWithdraw(uint256 depositAmt, uint256 withdrawAmt) public {
    vm.assume(depositAmt > 0 && depositAmt <= 1000 * 10 ** 18);
    vm.assume(withdrawAmt > 0 && withdrawAmt <= depositAmt);

    vm.startPrank(controller);
    vault.deposit(address(tokenA), user, depositAmt);
    assertEq(vault.balance(address(tokenA)), depositAmt);

    vault.withdraw(address(tokenA), user, withdrawAmt);
    assertEq(vault.balance(address(tokenA)), depositAmt - withdrawAmt);
    vm.stopPrank();
  }
}
