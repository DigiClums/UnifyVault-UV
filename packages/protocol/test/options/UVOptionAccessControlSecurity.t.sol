// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/options/UVOptionMarketFactory.sol';
import '../../src/options/UVLiquidityVault.sol';
import '../../src/options/UVOptionPositionManager.sol';
import '../../src/options/UVOptionSettlementVault.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20TokenLocal is ERC20 {
  constructor() ERC20('UVBE Token', 'UVBE') {}
  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract UVOptionAccessControlSecurityTest is Test {
  UVOptionMarketFactory public factory;
  UVLiquidityVault public vault;
  MockERC20TokenLocal public uvbe;

  address public admin = address(this);
  address public attacker = address(0x999);

  function setUp() public {
    uvbe = new MockERC20TokenLocal();
    factory = new UVOptionMarketFactory(admin);
    vault = new UVLiquidityVault(admin, address(uvbe));
  }

  function test_UnauthorizedCallerCannotCreateSeries() public {
    vm.prank(attacker);
    vm.expectRevert();
    factory.createSeries(keccak256('UV-NIFTY'), 1000e18, block.timestamp + 1 days, 1e18, 0, 5000);
  }

  function test_UnauthorizedCallerCannotDeactivateSeries() public {
    vm.prank(attacker);
    vm.expectRevert();
    factory.deactivateSeries(keccak256('SERIES'));
  }

  function test_UnauthorizedCallerCannotLockCollateralDirectly() public {
    vm.prank(attacker);
    vm.expectRevert();
    vault.lockCollateral(keccak256('POS'), keccak256('SERIES'), attacker, 1000e18);
  }

  function test_UnauthorizedCallerCannotTransitionSnapshotLiability() public {
    vm.prank(attacker);
    vm.expectRevert();
    vault.transitionSnapshotLiability(keccak256('SERIES'), 1000e18);
  }

  function test_UnauthorizedCallerCannotTransferSettlementPayout() public {
    vm.prank(attacker);
    vm.expectRevert();
    vault.transferSeriesSettlementPayout(keccak256('SERIES'), attacker, 1000e18);
  }
}
