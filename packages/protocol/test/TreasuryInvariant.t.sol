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

contract TreasuryHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  Treasury public treasury;
  MockERC20 public tokenA;
  MockERC20 public tokenB;

  address public controller = address(0xDEF);
  address public guardian = address(0x111);
  address public gov = address(0xABC);
  address public user = address(0x222);

  uint256 public expectedBalA;
  uint256 public expectedBalB;

  bool public randoFeeFailedAsExpected = true;
  bool public randoWithdrawFailedAsExpected = true;
  bool public pauseFailedAsExpected = true;

  constructor(Treasury _treasury, MockERC20 _tokenA, MockERC20 _tokenB) {
    treasury = _treasury;
    tokenA = _tokenA;
    tokenB = _tokenB;
  }

  function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
    if (min >= max) return min;
    return min + (x % (max - min + 1));
  }

  function collectFeeA(uint256 amount) public {
    if (treasury.paused()) return;
    amount = bound(amount, 1, 1000 * 10 ** 18);

    vm.prank(controller);
    treasury.collectFee(address(tokenA), amount);
    expectedBalA += amount;
  }

  function withdrawA(uint256 amount) public {
    if (treasury.paused()) return;
    if (expectedBalA == 0) return;
    amount = bound(amount, 1, expectedBalA);

    vm.prank(gov);
    treasury.withdraw(address(tokenA), user, amount);
    expectedBalA -= amount;
  }

  function tryPausedCollectA(uint256 amount) public {
    if (!treasury.paused()) return;
    amount = bound(amount, 1, 1000 * 10 ** 18);

    vm.prank(controller);
    try treasury.collectFee(address(tokenA), amount) {
      pauseFailedAsExpected = false;
    } catch {
      // failed as expected
    }
  }

  function tryRandoCollectA(address rando, uint256 amount) public {
    if (rando == controller || rando == address(0)) return;
    amount = bound(amount, 1, 1000 * 10 ** 18);

    vm.prank(rando);
    try treasury.collectFee(address(tokenA), amount) {
      randoFeeFailedAsExpected = false;
    } catch {
      // failed as expected
    }
  }

  function tryRandoWithdrawA(address rando, uint256 amount) public {
    if (rando == gov || rando == address(0)) return;
    if (expectedBalA == 0) return;
    amount = bound(amount, 1, expectedBalA);

    vm.prank(rando);
    try treasury.withdraw(address(tokenA), user, amount) {
      randoWithdrawFailedAsExpected = false;
    } catch {
      // failed as expected
    }
  }

  function collectFeeB(uint256 amount) public {
    if (treasury.paused()) return;
    amount = bound(amount, 1, 1000 * 10 ** 6);

    vm.prank(controller);
    treasury.collectFee(address(tokenB), amount);
    expectedBalB += amount;
  }

  function withdrawB(uint256 amount) public {
    if (treasury.paused()) return;
    if (expectedBalB == 0) return;
    amount = bound(amount, 1, expectedBalB);

    vm.prank(gov);
    treasury.withdraw(address(tokenB), user, amount);
    expectedBalB -= amount;
  }

  function togglePause() public {
    if (treasury.paused()) {
      vm.prank(gov);
      treasury.unpause();
    } else {
      vm.prank(guardian);
      treasury.pause();
    }
  }
}

contract TreasuryInvariantTest is Test {
  Treasury public treasury;
  MockERC20 public tokenA;
  MockERC20 public tokenB;
  TreasuryHandler public handler;

  address[] public targetContracts;

  function setUp() public {
    treasury = new Treasury();
    tokenA = new MockERC20('Token A', 'TKNA', 18);
    tokenB = new MockERC20('Token B', 'TKNB', 6);

    // Grant Roles
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this)); // test contract is governance
    treasury.registerAsset(address(tokenA), 18);
    treasury.registerAsset(address(tokenB), 6);

    handler = new TreasuryHandler(treasury, tokenA, tokenB);

    // Configure roles for handler
    treasury.grantRole(treasury.CONTROLLER_ROLE(), handler.controller());
    treasury.grantRole(treasury.GUARDIAN_ROLE(), handler.guardian());
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, handler.gov());

    // Allocate tokens to controller and approve
    tokenA.transfer(handler.controller(), 1000000 * 10 ** 18);
    tokenB.transfer(handler.controller(), 1000000 * 10 ** 6);

    vm.prank(handler.controller());
    tokenA.approve(address(treasury), type(uint256).max);
    vm.prank(handler.controller());
    tokenB.approve(address(treasury), type(uint256).max);

    targetContracts.push(address(handler));
  }

  // Invariant 1: Treasury balance matches expected balances fuzzed
  function invariant_treasuryBalanceAccounting() public {
    assertEq(treasury.totalAssetBalance(address(tokenA)), handler.expectedBalA());
    assertEq(treasury.totalAssetBalance(address(tokenB)), handler.expectedBalB());
  }

  // Invariant 2: Paused blocks collections
  function invariant_pausedBlocksMovement() public {
    assertTrue(handler.pauseFailedAsExpected());
  }

  // Invariant 3: Only Controller collects fees
  function invariant_onlyControllerCollectsFees() public {
    assertTrue(handler.randoFeeFailedAsExpected());
  }

  // Invariant 4: Only Governance withdraws
  function invariant_onlyGovernanceWithdraws() public {
    assertTrue(handler.randoWithdrawFailedAsExpected());
  }
}
