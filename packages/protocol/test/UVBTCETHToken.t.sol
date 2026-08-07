// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

contract UVBTCETHTokenTest is Test {
  UVBTCETHToken public token;

  address public gov = address(0xABC);
  address public controller = address(0xDEF);
  address public guardian = address(0x111);
  address public user = address(0x222);

  function setUp() public {
    token = new UVBTCETHToken();

    // Grant roles
    token.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    token.grantRole(token.CONTROLLER_ROLE(), controller);
    token.grantRole(token.GUARDIAN_ROLE(), guardian);

    // Remove deployer controller/governance/guardian access for clean testing
    token.renounceRole(token.CONTROLLER_ROLE(), address(this));
    token.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.renounceRole(token.GUARDIAN_ROLE(), address(this));
  }

  // --- Unit Tests ---

  function testDeploymentAndMetadata() public {
    assertEq(token.name(), 'UnifyVault BTC ETH Index');
    assertEq(token.symbol(), 'UVBTCETH');
    assertEq(token.decimals(), 18);
    assertEq(token.totalSupply(), 0);
  }

  function testMintSuccess() public {
    vm.prank(controller);
    token.mint(user, 1000 * 10 ** 18);

    assertEq(token.balanceOf(user), 1000 * 10 ** 18);
    assertEq(token.totalSupply(), 1000 * 10 ** 18);
  }

  function testMintZeroAmountRevert() public {
    vm.prank(controller);
    vm.expectRevert(abi.encodeWithSignature('InvalidAmount()'));
    token.mint(user, 0);
  }

  function testMintZeroAddressRevert() public {
    vm.prank(controller);
    vm.expectRevert(abi.encodeWithSelector(Errors.ZeroAddressDetected.selector));
    token.mint(address(0), 1000 * 10 ** 18);
  }

  function testMintUnauthorizedRevert() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        token.CONTROLLER_ROLE()
      )
    );
    vm.prank(user);
    token.mint(user, 1000 * 10 ** 18);
  }

  function testBurnSuccess() public {
    // Mint first
    vm.prank(controller);
    token.mint(user, 1000 * 10 ** 18);

    // Burn
    vm.prank(controller);
    token.burn(user, 400 * 10 ** 18);

    assertEq(token.balanceOf(user), 600 * 10 ** 18);
    assertEq(token.totalSupply(), 600 * 10 ** 18);
  }

  function testBurnZeroAmountRevert() public {
    vm.prank(controller);
    vm.expectRevert(abi.encodeWithSignature('InvalidAmount()'));
    token.burn(user, 0);
  }

  function testBurnZeroAddressRevert() public {
    vm.prank(controller);
    vm.expectRevert(abi.encodeWithSelector(Errors.ZeroAddressDetected.selector));
    token.burn(address(0), 1000 * 10 ** 18);
  }

  function testBurnUnauthorizedRevert() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        token.CONTROLLER_ROLE()
      )
    );
    vm.prank(user);
    token.burn(user, 100 * 10 ** 18);
  }

  function testPauseGuardianUnpauseGovSuccess() public {
    // Guardian pauses
    vm.prank(guardian);
    token.pause();
    assertTrue(token.paused());

    // Gov unpauses
    vm.prank(gov);
    token.unpause();
    assertFalse(token.paused());
  }

  function testPauseUnauthorizedRevert() public {
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        user,
        token.GUARDIAN_ROLE()
      )
    );
    vm.prank(user);
    token.pause();
  }

  function testUnpauseUnauthorizedRevert() public {
    vm.prank(guardian);
    token.pause();

    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        guardian,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    vm.prank(guardian);
    token.unpause();
  }

  function testTransfersAndMintBurnWhilePausedRevert() public {
    // Mint some tokens to user
    vm.prank(controller);
    token.mint(user, 1000 * 10 ** 18);

    // Pause
    vm.prank(guardian);
    token.pause();

    // 1. Mint fails
    vm.prank(controller);
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    token.mint(user, 100 * 10 ** 18);

    // 2. Burn fails
    vm.prank(controller);
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    token.burn(user, 100 * 10 ** 18);

    // 3. Transfer fails
    vm.prank(user);
    vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
    token.transfer(address(0x333), 100 * 10 ** 18);
  }

  function testPermitSuccess() public {
    uint256 privateKey = 0xA11CE;
    address owner = vm.addr(privateKey);
    address spender = address(0xDEE);
    uint256 value = 1000 * 10 ** 18;
    uint256 deadline = block.timestamp + 1 days;
    uint256 nonce = token.nonces(owner);

    bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
    bytes32 structHash = keccak256(
      abi.encode(
        keccak256(
          'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
        ),
        owner,
        spender,
        value,
        nonce,
        deadline
      )
    );
    bytes32 digest = keccak256(abi.encodePacked('\x19\x01', domainSeparator, structHash));

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

    token.permit(owner, spender, value, deadline, v, r, s);

    assertEq(token.allowance(owner, spender), value);
  }

  // --- Fuzz Tests ---

  function testFuzzMintBurn(uint256 mintAmt, uint256 burnAmt) public {
    vm.assume(mintAmt > 0 && mintAmt < type(uint128).max);
    vm.assume(burnAmt > 0 && burnAmt <= mintAmt);

    vm.startPrank(controller);
    token.mint(user, mintAmt);
    assertEq(token.balanceOf(user), mintAmt);

    token.burn(user, burnAmt);
    assertEq(token.balanceOf(user), mintAmt - burnAmt);
    vm.stopPrank();
  }

  function testFuzzTransfer(uint256 mintAmt, uint256 transferAmt, address recipient) public {
    vm.assume(mintAmt > 0 && mintAmt < type(uint128).max);
    vm.assume(transferAmt > 0 && transferAmt <= mintAmt);
    vm.assume(recipient != address(0) && recipient != user);

    vm.prank(controller);
    token.mint(user, mintAmt);

    vm.prank(user);
    token.transfer(recipient, transferAmt);

    assertEq(token.balanceOf(recipient), transferAmt);
    assertEq(token.balanceOf(user), mintAmt - transferAmt);
  }
}
