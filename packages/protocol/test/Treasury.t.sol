// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/vault/Treasury.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';
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

contract TreasuryTest is Test {
  Treasury public treasury;
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

  event FeeCollected(address indexed asset, address indexed from, uint256 amount);
  event TreasuryWithdrawal(
    address indexed asset,
    address indexed recipient,
    uint256 amount,
    address indexed caller
  );

  event NativeReceived(address indexed sender, uint256 amount);
  event NativeWithdrawn(address indexed recipient, uint256 amount, address indexed caller);

  function setUp() public {
    treasury = new Treasury();

    tokenA = new MockERC20('Token A', 'TKNA', 18);
    tokenB = new MockERC20('Token B', 'TKNB', 6);

    // Configure roles
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    treasury.grantRole(treasury.CONTROLLER_ROLE(), controller);
    treasury.grantRole(treasury.GUARDIAN_ROLE(), guardian);

    // Renounce deployer rights
    treasury.renounceRole(treasury.CONTROLLER_ROLE(), address(this));
    treasury.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.renounceRole(treasury.GUARDIAN_ROLE(), address(this));

    // Pre-register TokenA
    vm.startPrank(gov);
    treasury.registerAsset(address(tokenA), 18);
    vm.stopPrank();

    // Transfer tokens to controller to pay fees
    tokenA.transfer(controller, 10000 * 10 ** 18);
    tokenB.transfer(controller, 10000 * 10 ** 6);

    // Controller approves treasury
    vm.prank(controller);
    tokenA.approve(address(treasury), type(uint256).max);
    vm.prank(controller);
    tokenB.approve(address(treasury), type(uint256).max);
  }

  // --- Unit Tests ---

  function testRegisterAssetSuccess() public {
    vm.startPrank(gov);
    vm.expectEmit(true, false, false, true);
    emit AssetRegistered(address(tokenB), 6, gov);
    treasury.registerAsset(address(tokenB), 6);
    vm.stopPrank();

    assertTrue(treasury.isSupported(address(tokenB)));
  }

  function testRegisterDuplicateAssetRevert() public {
    vm.startPrank(gov);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.EntryAlreadyExists.selector,
        bytes32(uint256(uint160(address(tokenA))))
      )
    );
    treasury.registerAsset(address(tokenA), 18);
    vm.stopPrank();
  }

  function testCollectFeeSuccess() public {
    uint256 amount = 50 * 10 ** 18;

    vm.expectEmit(true, true, false, true);
    emit FeeCollected(address(tokenA), controller, amount);

    vm.prank(controller);
    treasury.collectFee(address(tokenA), amount);

    assertEq(treasury.balance(address(tokenA)), amount);
  }

  function testCollectFeeUnsupportedRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.AssetNotSupported.selector,
        bytes32(uint256(uint160(address(tokenB))))
      )
    );
    vm.prank(controller);
    treasury.collectFee(address(tokenB), 50 * 10 ** 6);
  }

  function testWithdrawERC20Success() public {
    uint256 amount = 100 * 10 ** 18;

    // Collect fee first
    vm.prank(controller);
    treasury.collectFee(address(tokenA), amount);

    // Withdraw
    vm.expectEmit(true, true, false, true);
    emit TreasuryWithdrawal(address(tokenA), user, amount, gov);

    vm.prank(gov);
    treasury.withdraw(address(tokenA), user, amount);

    assertEq(treasury.balance(address(tokenA)), 0);
    assertEq(tokenA.balanceOf(user), amount);
  }

  function testWithdrawInsufficientBalanceRevert() public {
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InsufficientReserves.selector,
        address(tokenA),
        100 * 10 ** 18,
        0
      )
    );
    vm.prank(gov);
    treasury.withdraw(address(tokenA), user, 100 * 10 ** 18);
  }

  function testNativeETHReceivedAndWithdrawn() public {
    uint256 amount = 1.5 ether;

    // 1. Receive ETH
    vm.expectEmit(true, false, false, true);
    emit NativeReceived(address(this), amount);

    (bool success, ) = address(treasury).call{ value: amount }('');
    assertTrue(success);

    assertEq(treasury.nativeBalance(), amount);

    // 2. Withdraw ETH
    vm.expectEmit(true, false, false, true);
    emit NativeWithdrawn(payable(user), amount, gov);

    vm.prank(gov);
    treasury.withdrawNative(payable(user), amount);

    assertEq(treasury.nativeBalance(), 0);
    assertEq(user.balance, amount);
  }

  function testPauseBlocksMovements() public {
    vm.prank(guardian);
    treasury.pause();

    // Collect Fee fails
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    vm.prank(controller);
    treasury.collectFee(address(tokenA), 10 * 10 ** 18);

    // Withdraw fails
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    vm.prank(gov);
    treasury.withdraw(address(tokenA), user, 10 * 10 ** 18);
  }

  function testUnpauseGovSuccess() public {
    vm.prank(guardian);
    treasury.pause();

    vm.prank(gov);
    treasury.unpause();
    assertFalse(treasury.paused());
  }

  function testZeroAmountReverts() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    vm.prank(controller);
    treasury.collectFee(address(tokenA), 0);

    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    vm.prank(gov);
    treasury.withdraw(address(tokenA), user, 0);
  }

  function testRBACReverts() public {
    // Rando tries to collect fee
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        treasury.CONTROLLER_ROLE()
      )
    );
    vm.prank(user);
    treasury.collectFee(address(tokenA), 10 * 10 ** 18);

    // Rando tries to withdraw
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    vm.prank(user);
    treasury.withdraw(address(tokenA), user, 10 * 10 ** 18);
  }

  // --- Fuzz Tests ---

  function testFuzzCollectAndWithdraw(uint256 collectAmt, uint256 withdrawAmt) public {
    vm.assume(collectAmt > 0 && collectAmt <= 1000 * 10 ** 18);
    vm.assume(withdrawAmt > 0 && withdrawAmt <= collectAmt);

    vm.prank(controller);
    treasury.collectFee(address(tokenA), collectAmt);

    vm.prank(gov);
    treasury.withdraw(address(tokenA), user, withdrawAmt);

    assertEq(treasury.balance(address(tokenA)), collectAmt - withdrawAmt);
  }
}
