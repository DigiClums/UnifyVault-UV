// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/PythOracleProvider.sol';
import '../src/constants/ModuleIds.sol';

contract DeployPythProviderAndSetFallbackScript is Script {
  address public constant DIRECTORY_SEPOLIA = 0x61572e7207057A0394Ec087995cA337556b95D5c;
  address public constant PYTH_BASE_SEPOLIA = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729;

  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant CBBTC = 0xD3eBa4947b8e2e33CE1B428F617aE90De70f5bD9;
  address public constant WETH = 0x5ab31FD7c54E2E915A84E13Fa1310E2C96F7F5Ae;

  bytes32 public constant PYTH_USDC_FEED =
    0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a;
  bytes32 public constant PYTH_BTC_FEED =
    0x4b34bca07e0c4068593a1cfbb42d54407abfa93d05b57f00d235c3c0cf05b0b2;
  bytes32 public constant PYTH_ETH_FEED =
    0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

  function run() external {
    vm.startBroadcast();

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY_SEPOLIA);
    OracleManager oracleManager = OracleManager(dir.getAddress(ModuleIds.ORACLE));

    // 1. Deploy PythOracleProvider adapter
    PythOracleProvider pythProvider = new PythOracleProvider(PYTH_BASE_SEPOLIA);

    bytes32 usdcId = bytes32(uint256(uint160(USDC)));
    bytes32 cbbtcId = bytes32(uint256(uint160(CBBTC)));
    bytes32 wethId = bytes32(uint256(uint160(WETH)));

    // 2. Register Pyth Price IDs in PythOracleProvider
    pythProvider.registerFeed(usdcId, PYTH_USDC_FEED, 6, 86400);
    pythProvider.registerFeed(cbbtcId, PYTH_BTC_FEED, 8, 86400);
    pythProvider.registerFeed(wethId, PYTH_ETH_FEED, 8, 86400);

    // 3. Configure Fallback Provider in OracleManager for all assets
    OracleManager.AssetConfig memory cfgUSDC = oracleManager.getAssetConfig(usdcId);
    oracleManager.configureAsset(
      usdcId,
      cfgUSDC.primaryProvider,
      address(pythProvider),
      cfgUSDC.heartbeat,
      true
    );

    OracleManager.AssetConfig memory cfgBTC = oracleManager.getAssetConfig(cbbtcId);
    oracleManager.configureAsset(
      cbbtcId,
      cfgBTC.primaryProvider,
      address(pythProvider),
      cfgBTC.heartbeat,
      true
    );

    OracleManager.AssetConfig memory cfgETH = oracleManager.getAssetConfig(wethId);
    oracleManager.configureAsset(
      wethId,
      cfgETH.primaryProvider,
      address(pythProvider),
      cfgETH.heartbeat,
      true
    );

    vm.stopBroadcast();

    console.log('=== PYTH FALLBACK DEPLOYED & CONFIGURED ===');
    console.log('PythOracleProvider Address:', address(pythProvider));
  }
}
