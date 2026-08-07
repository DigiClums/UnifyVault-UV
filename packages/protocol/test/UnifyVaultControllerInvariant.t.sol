// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/libraries/AccessRoles.sol';

contract MockDirectory {}

contract MockOracle {}

contract MockVault {}

contract MockTreasury {}

contract MockToken {}

contract UnifyVaultControllerHandler {
  Vm constant vm = Vm(address(uint160(uint256(keccak256('hevm')))));

  UnifyVaultController public controller;

  address public directory;
  address public oracle;
  address public vault;
  address public treasury;
  address public token;

  address public gov = address(0xABC);
  address public guardian = address(0x111);

  bool public pauseStateConsistent = true;

  constructor(
    UnifyVaultController _controller,
    address _directory,
    address _oracle,
    address _vault,
    address _treasury,
    address _token
  ) {
    controller = _controller;
    directory = _directory;
    oracle = _oracle;
    vault = _vault;
    treasury = _treasury;
    token = _token;
  }

  function togglePause() public {
    bool wasPaused = controller.paused();
    if (wasPaused) {
      vm.prank(gov);
      controller.resume();
      if (controller.paused()) {
        pauseStateConsistent = false;
      }
    } else {
      vm.prank(guardian);
      controller.emergencyPause();
      if (!controller.paused()) {
        pauseStateConsistent = false;
      }
    }
  }
}

contract UnifyVaultControllerInvariantTest is Test {
  UnifyVaultController public controller;
  UnifyVaultControllerHandler public handler;

  MockDirectory public directory;
  MockOracle public oracle;
  MockVault public vault;
  MockTreasury public treasury;
  MockToken public token;

  address[] public targetContracts;

  function setUp() public {
    directory = new MockDirectory();
    oracle = new MockOracle();
    vault = new MockVault();
    treasury = new MockTreasury();
    token = new MockToken();

    controller = new UnifyVaultController(
      address(directory),
      address(oracle),
      address(vault),
      address(treasury),
      address(token)
    );

    // Grant Roles
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this)); // test contract is governance
    controller.grantRole(controller.GUARDIAN_ROLE(), address(0x111));
    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, address(0xABC));

    handler = new UnifyVaultControllerHandler(
      controller,
      address(directory),
      address(oracle),
      address(vault),
      address(treasury),
      address(token)
    );

    targetContracts.push(address(handler));
  }

  // Invariant 1: Configured module addresses remain immutable and matching
  function invariant_immutableConfiguration() public {
    assertEq(controller.directory(), handler.directory());
    assertEq(controller.oracle(), handler.oracle());
    assertEq(controller.vault(), handler.vault());
    assertEq(controller.treasury(), handler.treasury());
    assertEq(controller.token(), handler.token());
  }

  // Invariant 2: Pause state transitions are consistent
  function invariant_pauseConsistency() public {
    assertTrue(handler.pauseStateConsistent());
  }
}
