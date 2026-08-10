// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';
import '../src/treasury/CostBasisManager.sol';
import '../src/treasury/PerformanceManager.sol';

contract DeployUpdatedV2ContractsScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;

  function run() external {
    vm.startBroadcast();

    address deployer = msg.sender;
    console2.log('Deployer address:', deployer);
    console2.log('ProtocolDirectory:', DIRECTORY);

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    address admin = deployer;

    address strategyManager = dir.getAddress(ModuleIds.STRATEGY_MANAGER);
    address oracleManager = dir.getAddress(ModuleIds.ORACLE);
    address custodyVault = dir.getAddress(ModuleIds.VAULT);
    address treasury = dir.getAddress(ModuleIds.TREASURY);
    address indexToken = dir.getAddress(ModuleIds.TOKEN);

    console2.log('StrategyManager:', strategyManager);
    console2.log('OracleManager:', oracleManager);
    console2.log('CustodyVault:', custodyVault);
    console2.log('Treasury:', treasury);
    console2.log('IndexToken:', indexToken);

    // 1. Deploy fixed PortfolioManager
    PortfolioManager newPM = new PortfolioManager(
      admin,
      DIRECTORY,
      strategyManager,
      oracleManager,
      custodyVault,
      indexToken
    );
    console2.log('New PortfolioManager deployed at:', address(newPM));

    // 2. Deploy fresh CostBasisManager & PerformanceManager
    CostBasisManager newCBM = new CostBasisManager(admin, DIRECTORY);
    console2.log('New CostBasisManager deployed at:', address(newCBM));

    PerformanceManager newPerf = new PerformanceManager(admin, DIRECTORY);
    console2.log('New PerformanceManager deployed at:', address(newPerf));

    // 3. Deploy updated UnifyVaultController
    UnifyVaultController newController = new UnifyVaultController(
      DIRECTORY,
      oracleManager,
      custodyVault,
      treasury,
      indexToken
    );
    console2.log('New UnifyVaultController deployed at:', address(newController));

    // 4. Update ProtocolDirectory entries
    dir.updateAddress(ModuleIds.PORTFOLIO_MANAGER, address(newPM));
    console2.log('Updated PORTFOLIO_MANAGER in ProtocolDirectory to:', address(newPM));

    if (dir.exists(ModuleIds.COST_BASIS_MANAGER)) {
      dir.updateAddress(ModuleIds.COST_BASIS_MANAGER, address(newCBM));
    } else {
      dir.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(newCBM));
    }
    console2.log('Registered/Updated COST_BASIS_MANAGER in ProtocolDirectory to:', address(newCBM));

    if (dir.exists(ModuleIds.PERFORMANCE_MANAGER)) {
      dir.updateAddress(ModuleIds.PERFORMANCE_MANAGER, address(newPerf));
    } else {
      dir.registerAddress(ModuleIds.PERFORMANCE_MANAGER, address(newPerf));
    }
    console2.log(
      'Registered/Updated PERFORMANCE_MANAGER in ProtocolDirectory to:',
      address(newPerf)
    );

    if (dir.exists(ModuleIds.DEPOSIT_MANAGER)) {
      dir.updateAddress(ModuleIds.DEPOSIT_MANAGER, address(newController));
    } else {
      dir.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(newController));
    }
    console2.log(
      'Registered/Updated DEPOSIT_MANAGER in ProtocolDirectory to:',
      address(newController)
    );

    bytes32 legacyControllerId = keccak256('Controller');
    if (dir.exists(legacyControllerId)) {
      dir.updateAddress(legacyControllerId, address(newController));
    } else {
      dir.registerAddress(legacyControllerId, address(newController));
    }

    newPM.syncModules();
    newCBM.syncModules();
    newPerf.syncModules();
    console2.log('Synced modules on PortfolioManager, CostBasisManager, PerformanceManager');

    newPM.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    newCBM.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    newPerf.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);

    bytes32 ctrlRole = keccak256('CONTROLLER_ROLE');
    newCBM.grantRole(ctrlRole, address(newController));
    newCBM.grantRole(ctrlRole, admin);

    IAccessControl(indexToken).grantRole(ctrlRole, address(newController));
    IAccessControl(custodyVault).grantRole(ctrlRole, address(newController));
    IAccessControl(treasury).grantRole(ctrlRole, address(newController));

    vm.stopBroadcast();
  }
}
