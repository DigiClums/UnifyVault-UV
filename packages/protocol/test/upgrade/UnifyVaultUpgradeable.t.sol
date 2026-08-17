// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from 'forge-std/Test.sol';
import {UnifyVaultUpgradeable} from '../../src/upgrade/UnifyVaultUpgradeable.sol';
import {UnifyVaultProxy} from '../../src/upgrade/UnifyVaultProxy.sol';
import {IUnifyVaultModule} from '../../src/upgrade/IUnifyVaultModule.sol';

contract MockModuleV1 is IUnifyVaultModule {
  bytes32 internal constant ID = keccak256('TEST_MODULE');

  function moduleId() external pure returns (bytes32) {
    return ID;
  }

  function moduleVersion() external pure returns (uint64) {
    return 1;
  }
}

contract MockUnifyVaultV2 is UnifyVaultUpgradeable {
  function architectureVersion() external pure returns (uint256) {
    return 2;
  }
}

contract UnifyVaultUpgradeableTest is Test {
  address internal governance = makeAddr('governance');
  address internal attacker = makeAddr('attacker');

  UnifyVaultUpgradeable internal implementation;
  UnifyVaultUpgradeable internal vault;
  UnifyVaultProxy internal proxy;

  function setUp() public {
    implementation = new UnifyVaultUpgradeable();
    proxy = new UnifyVaultProxy(
      address(implementation),
      abi.encodeCall(UnifyVaultUpgradeable.initialize, (governance, address(new MockDirectory())))
    );
    vault = UnifyVaultUpgradeable(address(proxy));
  }

  function testProxyInitializationAndStableState() public {
    assertEq(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), governance), true);
    assertEq(vault.hasRole(vault.UPGRADER_ROLE(), governance), true);

    MockModuleV1 module = new MockModuleV1();
    vm.prank(governance);
    vault.registerModule(address(module));

    (address implementationAddress, uint64 version, bool enabled) = vault.getModule(module.moduleId());
    assertEq(implementationAddress, address(module));
    assertEq(version, 1);
    assertTrue(enabled);
  }

  function testOnlyUpgraderCanUpgrade() public {
    MockUnifyVaultV2 v2 = new MockUnifyVaultV2();

    vm.prank(attacker);
    vm.expectRevert();
    vault.upgradeToAndCall(address(v2), '');
  }

  function testUpgradePreservesProxyAddressAndModuleState() public {
    MockModuleV1 module = new MockModuleV1();
    vm.prank(governance);
    vault.registerModule(address(module));

    address stableAddress = address(vault);
    MockUnifyVaultV2 v2 = new MockUnifyVaultV2();

    vm.prank(governance);
    vault.upgradeToAndCall(address(v2), '');

    UnifyVaultUpgradeable upgraded = UnifyVaultUpgradeable(stableAddress);
    assertEq(address(upgraded), stableAddress);
    assertEq(MockUnifyVaultV2(stableAddress).architectureVersion(), 2);

    (address implementationAddress, uint64 version, bool enabled) = upgraded.getModule(module.moduleId());
    assertEq(implementationAddress, address(module));
    assertEq(version, 1);
    assertTrue(enabled);
  }

  function testModuleCanBeDisabledAndRemoved() public {
    MockModuleV1 module = new MockModuleV1();
    bytes32 id = module.moduleId();

    vm.startPrank(governance);
    vault.registerModule(address(module));
    vault.disableModule(id);
    vm.stopPrank();

    assertFalse(vault.isModuleEnabled(id));

    vm.prank(governance);
    vault.removeModule(id);

    vm.expectRevert(UnifyVaultUpgradeable.ModuleNotRegistered.selector);
    vault.getModule(id);
  }
}

contract MockDirectory {}
