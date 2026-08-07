// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/events/Events.sol';
import '../src/oracle/OracleManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/governance/UnifyVaultTimelock.sol';

contract SecurityMonitoringEventsTest is Test {
  OracleManager public oracleManager;
  StrategyManager public strategyManager;
  UnifyVaultTimelock public timelock;

  address public admin = address(this);
  address public user = address(0x1111);

  function setUp() public {
    oracleManager = new OracleManager();

    address[] memory initialAssets = new address[](1);
    initialAssets[0] = address(0x1);
    uint256[] memory initialWeights = new uint256[](1);
    initialWeights[0] = 10000;

    strategyManager = new StrategyManager(admin, initialAssets, initialWeights);

    address[] memory proposers = new address[](1);
    proposers[0] = admin;
    address[] memory executors = new address[](1);
    executors[0] = address(0);

    timelock = new UnifyVaultTimelock(48 hours, proposers, executors, admin);
  }

  function test_StrategyRebalancedEventEmitted() public {
    address[] memory assets = new address[](2);
    assets[0] = address(0x1);
    assets[1] = address(0x2);
    uint256[] memory weights = new uint256[](2);
    weights[0] = 6000;
    weights[1] = 4000;

    vm.expectEmit(true, false, false, true);
    emit StrategyManager.StrategyRebalanced(admin, assets, weights);
    strategyManager.setStrategy(assets, weights);
  }

  function test_TimelockQueuedAndExecutedEventsEmitted() public {
    bytes memory payload = abi.encodeWithSignature('test()');
    bytes32 predecessor = bytes32(0);
    bytes32 salt = keccak256('salt');

    vm.expectEmit(true, true, true, true);
    emit UnifyVaultTimelock.TimelockQueued(
      timelock.hashOperation(address(0x99), 0, payload, predecessor, salt),
      address(0x99),
      0,
      payload,
      block.timestamp + 48 hours
    );
    timelock.schedule(address(0x99), 0, payload, predecessor, salt, 48 hours);

    vm.warp(block.timestamp + 48 hours + 1);

    vm.expectEmit(true, true, true, true);
    emit UnifyVaultTimelock.TimelockExecuted(
      timelock.hashOperation(address(0x99), 0, payload, predecessor, salt),
      address(0x99),
      0,
      payload
    );
    timelock.execute(address(0x99), 0, payload, predecessor, salt);
  }
}
