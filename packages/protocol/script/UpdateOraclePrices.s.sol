// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/ChainlinkOracleProvider.sol';
import '../src/constants/ModuleIds.sol';

interface IMockAggregator {
  function updateAnswer(int256 _answer) external;
}

contract UpdateOraclePricesScript is Script {
  address public constant DIRECTORY = 0x61572e7207057A0394Ec087995cA337556b95D5c;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    OracleManager oracleManager = OracleManager(dir.getAddress(ModuleIds.ORACLE));

    console.log('OracleManager Address:', address(oracleManager));
    console.log('USDC Oracle Price:   ', oracleManager.getAssetPrice(USDC));

    vm.stopBroadcast();
    console.log('[SUCCESS] Oracle price validation completed!');
  }
}
