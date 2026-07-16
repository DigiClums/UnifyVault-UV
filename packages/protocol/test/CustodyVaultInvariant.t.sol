// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/vault/CustodyVault.sol';
import './CustodyVault.t.sol';
import '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

contract CustodyVaultHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  CustodyVault public vault;
  MockERC20 public tokenA;
  MockERC20 public tokenB;

  address public controller = address(0xDEF);
  address public guardian = address(0x111);
  address public gov = address(0xABC);
  address public user = address(0x222);

  uint256 public expectedBalA;
  uint256 public expectedBalB;

  bool public randoFailedAsExpected = true;
  bool public pauseFailedAsExpected = true;

  constructor(CustodyVault _vault, MockERC20 _tokenA, MockERC20 _tokenB) {
    vault = _vault;
    tokenA = _tokenA;
    tokenB = _tokenB;
  }

  function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
    if (min >= max) return min;
    return min + (x % (max - min + 1));
  }

  function depositA(uint256 amount) public {
    if (vault.paused()) return;
    amount = bound(amount, 1, 1000 * 10 ** 18);

    vm.prank(controller);
    vault.deposit(address(tokenA), user, amount);
    expectedBalA += amount;
  }

  function withdrawA(uint256 amount) public {
    if (vault.paused()) return;
    if (expectedBalA == 0) return;
    amount = bound(amount, 1, expectedBalA);

    vm.prank(controller);
    vault.withdraw(address(tokenA), user, amount);
    expectedBalA -= amount;
  }

  // Attempt movements when paused and verify they fail
  function tryPausedDepositA(uint256 amount) public {
    if (!vault.paused()) return;
    amount = bound(amount, 1, 1000 * 10 ** 18);

    vm.prank(controller);
    try vault.deposit(address(tokenA), user, amount) {
      pauseFailedAsExpected = false;
    } catch {
      // failed as expected
    }
  }

  function tryRandoDepositA(address rando, uint256 amount) public {
    if (rando == controller || rando == address(0)) return;
    amount = bound(amount, 1, 1000 * 10 ** 18);

    vm.prank(rando);
    try vault.deposit(address(tokenA), user, amount) {
      randoFailedAsExpected = false;
    } catch {
      // failed as expected
    }
  }

  function depositB(uint256 amount) public {
    if (vault.paused()) return;
    amount = bound(amount, 1, 1000 * 10 ** 6);

    vm.prank(controller);
    vault.deposit(address(tokenB), user, amount);
    expectedBalB += amount;
  }

  function withdrawB(uint256 amount) public {
    if (vault.paused()) return;
    if (expectedBalB == 0) return;
    amount = bound(amount, 1, expectedBalB);

    vm.prank(controller);
    vault.withdraw(address(tokenB), user, amount);
    expectedBalB -= amount;
  }

  function togglePause() public {
    if (vault.paused()) {
      vm.prank(gov);
      vault.unpause();
    } else {
      vm.prank(guardian);
      vault.pause();
    }
  }
}

contract CustodyVaultInvariantTest is Test {
  CustodyVault public vault;
  MockERC20 public tokenA;
  MockERC20 public tokenB;
  CustodyVaultHandler public handler;

  address[] public targetContracts;

  function setUp() public {
    vault = new CustodyVault();
    tokenA = new MockERC20('Token A', 'TKNA', 18);
    tokenB = new MockERC20('Token B', 'TKNB', 6);

    // Grant Roles
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this)); // test contract is governance
    vault.registerAsset(address(tokenA), 18);
    vault.registerAsset(address(tokenB), 6);

    handler = new CustodyVaultHandler(vault, tokenA, tokenB);

    // Configure roles for handler
    vault.grantRole(vault.CONTROLLER_ROLE(), handler.controller());
    vault.grantRole(vault.GUARDIAN_ROLE(), handler.guardian());
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, handler.gov());

    // Allocate tokens to user and approve
    tokenA.transfer(handler.user(), 1000000 * 10 ** 18);
    tokenB.transfer(handler.user(), 1000000 * 10 ** 6);

    vm.prank(handler.user());
    tokenA.approve(address(vault), type(uint256).max);
    vm.prank(handler.user());
    tokenB.approve(address(vault), type(uint256).max);

    targetContracts.push(address(handler));
  }

  // Invariant 1: Vault actual balance matches fuzzed internal tracking
  function invariant_vaultBalanceAccounting() public {
    assertEq(vault.totalAssetBalance(address(tokenA)), handler.expectedBalA());
    assertEq(vault.totalAssetBalance(address(tokenB)), handler.expectedBalB());
  }

  // Invariant 2: Paused blocks all movements
  function invariant_pausedBlocksMovement() public {
    assertTrue(handler.pauseFailedAsExpected());
  }

  // Invariant 3: Only controller can move assets
  function invariant_onlyControllerMovesAssets() public {
    assertTrue(handler.randoFailedAsExpected());
  }
}
