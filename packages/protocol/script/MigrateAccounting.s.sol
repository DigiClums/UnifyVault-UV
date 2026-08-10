// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/treasury/CostBasisManager.sol';
import '../src/constants/ModuleIds.sol';

contract MigrateAccountingScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;

  address public constant USER = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  address public constant OLD_CBM = 0x627bDaEf795df800d91a949d5cb3148022763A38;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);

    CostBasisManager oldCBM = CostBasisManager(OLD_CBM);

    CostBasisManager newCBM = CostBasisManager(dir.getAddress(ModuleIds.COST_BASIS_MANAGER));

    uint256 costBasis = oldCBM.costBasis(USER);
    int256 realizedPnL = oldCBM.realizedPnL(USER);
    uint256 firstDeposit = oldCBM.firstDepositTimestamp(USER);

    console2.log('=== ACCOUNTING MIGRATION ===');
    console2.log('User:', USER);
    console2.log('Old CBM:', OLD_CBM);
    console2.log('New CBM:', address(newCBM));
    console2.log('Cost Basis:', costBasis);
    console2.log('Realized PnL:', realizedPnL);
    console2.log('First Deposit:', firstDeposit);

    require(costBasis > 0, 'Old cost basis is zero');
    require(address(newCBM) != OLD_CBM, 'New CBM must differ from old CBM');

    newCBM.migrateAccounting(USER, costBasis, realizedPnL, firstDeposit);

    require(newCBM.costBasis(USER) == costBasis, 'Cost basis migration failed');

    require(newCBM.realizedPnL(USER) == realizedPnL, 'Realized PnL migration failed');

    require(newCBM.firstDepositTimestamp(USER) == firstDeposit, 'First deposit migration failed');

    console2.log('=== MIGRATION VERIFIED ===');

    vm.stopBroadcast();
  }
}
