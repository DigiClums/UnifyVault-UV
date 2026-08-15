// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

contract DeployUpdatedPortfolioManagerScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;

  function run() external {
    vm.startBroadcast();

    address deployer = msg.sender;
    console2.log('Deployer address (msg.sender):', deployer);
    console2.log('ProtocolDirectory:', DIRECTORY);

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    address admin = deployer;

    address strategyManager = dir.getAddress(ModuleIds.STRATEGY_MANAGER);
    address oracleManager = dir.getAddress(ModuleIds.ORACLE);
    address custodyVault = dir.getAddress(ModuleIds.VAULT);
    address indexToken = dir.getAddress(ModuleIds.TOKEN);

    console2.log('StrategyManager:', strategyManager);
    console2.log('OracleManager:', oracleManager);
    console2.log('CustodyVault:', custodyVault);
    console2.log('IndexToken:', indexToken);

    PortfolioManager newPM = new PortfolioManager(
      admin,
      DIRECTORY,
      strategyManager,
      oracleManager,
      custodyVault,
      indexToken
    );
    console2.log('New PortfolioManager deployed at:', address(newPM));

    dir.updateAddress(ModuleIds.PORTFOLIO_MANAGER, address(newPM));
    console2.log('Updated ProtocolDirectory PORTFOLIO_MANAGER module to:', address(newPM));

    newPM.syncModules();
    console2.log('Synced modules on new PortfolioManager');

    newPM.grantRole(AccessRoles.GOVERNANCE_ROLE, admin);
    console2.log('Granted GOVERNANCE_ROLE to admin on new PortfolioManager');

    vm.stopBroadcast();
  }
}
