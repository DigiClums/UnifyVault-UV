// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';

contract UVBTCETHTokenHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  UVBTCETHToken public token;

  address public controller = address(0xDEF);
  address public guardian = address(0x111);
  address public owner;

  address[] public users;
  mapping(address => uint256) public expectedBalances;
  uint256 public expectedTotalSupply;

  constructor(UVBTCETHToken _token, address _owner) {
    token = _token;
    owner = _owner;

    users.push(address(0x11));
    users.push(address(0x22));
    users.push(address(0x33));
  }

  function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
    if (min >= max) return min;
    return min + (x % (max - min + 1));
  }

  function mint(uint256 userIdx, uint256 amount) public {
    if (token.paused()) return;
    amount = bound(amount, 1, type(uint96).max);
    address targetUser = users[userIdx % users.length];

    vm.prank(controller);
    token.mint(targetUser, amount);

    expectedBalances[targetUser] += amount;
    expectedTotalSupply += amount;
  }

  function burn(uint256 userIdx, uint256 amount) public {
    if (token.paused()) return;
    address targetUser = users[userIdx % users.length];
    uint256 userBalance = expectedBalances[targetUser];
    if (userBalance == 0) return;

    amount = bound(amount, 1, userBalance);

    vm.prank(controller);
    token.burn(targetUser, amount);

    expectedBalances[targetUser] -= amount;
    expectedTotalSupply -= amount;
  }

  function transfer(uint256 fromIdx, uint256 toIdx, uint256 amount) public {
    if (token.paused()) return;
    address fromUser = users[fromIdx % users.length];
    address toUser = users[toIdx % users.length];
    if (fromUser == toUser) return;

    uint256 userBalance = expectedBalances[fromUser];
    if (userBalance == 0) return;

    amount = bound(amount, 1, userBalance);

    vm.prank(fromUser);
    token.transfer(toUser, amount);

    expectedBalances[fromUser] -= amount;
    expectedBalances[toUser] += amount;
  }

  function togglePause() public {
    if (token.paused()) {
      vm.prank(owner);
      token.unpause();
    } else {
      vm.prank(guardian);
      token.pause();
    }
  }

  function getUsers() external view returns (address[] memory) {
    return users;
  }
}

contract UVBTCETHTokenInvariantTest is Test {
  UVBTCETHToken public token;
  UVBTCETHTokenHandler public handler;
  address[] public targetContracts;

  function setUp() public {
    token = new UVBTCETHToken();
    handler = new UVBTCETHTokenHandler(token, address(this));

    token.grantRole(token.CONTROLLER_ROLE(), handler.controller());
    token.grantRole(token.GUARDIAN_ROLE(), handler.guardian());

    targetContracts.push(address(handler));
  }

  // Invariant 1: Total supply matches sum of all balances
  function invariant_supplyIntegrity() public {
    uint256 sum = 0;
    address[] memory users = handler.getUsers();
    for (uint256 i = 0; i < users.length; i++) {
      sum += token.balanceOf(users[i]);
    }
    assertEq(token.totalSupply(), sum);
    assertEq(token.totalSupply(), handler.expectedTotalSupply());
  }

  // Invariant 2: Normal transfer fails while paused
  function invariant_pausedBlocksTransfers() public {
    if (token.paused()) {
      address[] memory users = handler.getUsers();
      address from = users[0];
      address to = users[1];
      uint256 balance = token.balanceOf(from);
      if (balance > 0) {
        vm.prank(from);
        vm.expectRevert(abi.encodeWithSignature('EnforcedPause()'));
        token.transfer(to, 1);
      }
    }
  }
}
