// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console } from 'forge-std/Test.sol';
import { DeployMainnetScript } from '../../script/DeployMainnet.s.sol';
import { ProtocolDirectory } from '../../src/ProtocolDirectory.sol';
import { OracleManager } from '../../src/oracle/OracleManager.sol';
import { ChainlinkOracleProvider } from '../../src/oracle/ChainlinkOracleProvider.sol';
import { CustodyVault } from '../../src/vault/CustodyVault.sol';
import { LiquidityManager } from '../../src/vault/LiquidityManager.sol';
import { Treasury } from '../../src/vault/Treasury.sol';
import { UVBTCETHToken } from '../../src/token/UVBTCETHToken.sol';
import { UnifyVaultController } from '../../src/controller/UnifyVaultController.sol';
import { StrategyManager } from '../../src/strategy/StrategyManager.sol';
import { PortfolioManager } from '../../src/strategy/PortfolioManager.sol';
import { SwapAdapter } from '../../src/swap/SwapAdapter.sol';
import { FeeManager } from '../../src/treasury/FeeManager.sol';
import { UnifyVaultTimelock } from '../../src/governance/UnifyVaultTimelock.sol';
import { ModuleIds } from '../../src/constants/ModuleIds.sol';
import { AccessRoles } from '../../src/libraries/AccessRoles.sol';

contract MainnetDeploymentValidationTest is Test {
  DeployMainnetScript public deployScript;

  // Expected Addresses
  address public constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address public constant BASE_MAINNET_CBBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf;
  address public constant BASE_MAINNET_WETH = 0x4200000000000000000000000000000000000006;
  address public constant BASE_MAINNET_USDC_FEED = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B;
  address public constant BASE_MAINNET_CBBTC_FEED = 0x07b96265B54d0f09062F81B4D0840C5f2142E0a6;
  address public constant BASE_MAINNET_ETH_FEED = 0x71041DDdaDB357Cb0061e89ef2399D55986fc000;
  address public constant BASE_MAINNET_UNISWAP_V3_ROUTER =
    0x2626664c2603336E57B271c5C0b26F421741e481;
  address public constant TARGET_TIMELOCK_SAFE = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  function setUp() public {
    deployScript = new DeployMainnetScript();
    deployScript.run();
  }

  function test_ValidateFullMainnetDeployment() public {
    console.log('=== EXECUTING PRODUCTION DEPLOYMENT VALIDATION ON BASE MAINNET FORK ===');

    // Task 5: Verify DeployMainnet.s.sol script properties
    assertEq(block.chainid, 8453, 'Chain ID must be Base Mainnet (8453)');
    assertEq(deployScript.BASE_MAINNET_CHAIN_ID(), 8453);
    assertEq(deployScript.BASE_MAINNET_USDC(), BASE_MAINNET_USDC);
    assertEq(deployScript.BASE_MAINNET_CBBTC(), BASE_MAINNET_CBBTC);
    assertEq(deployScript.BASE_MAINNET_WETH(), BASE_MAINNET_WETH);
    assertEq(deployScript.BASE_MAINNET_USDC_FEED(), BASE_MAINNET_USDC_FEED);
    assertEq(deployScript.BASE_MAINNET_CBBTC_FEED(), BASE_MAINNET_CBBTC_FEED);
    assertEq(deployScript.BASE_MAINNET_ETH_FEED(), BASE_MAINNET_ETH_FEED);
    assertEq(deployScript.BASE_MAINNET_UNISWAP_V3_ROUTER(), BASE_MAINNET_UNISWAP_V3_ROUTER);
    console.log('[PASS] Task 5: DeployMainnet.s.sol constants & structure verified');

    // Task 8: Verify ProtocolDirectory
    ProtocolDirectory directory = deployScript.directory();
    assertTrue(address(directory) != address(0));
    assertEq(directory.getAddress(ModuleIds.TREASURY), address(deployScript.treasury()));
    assertEq(directory.getAddress(ModuleIds.FEE_MANAGER), address(deployScript.feeManager()));
    assertEq(directory.getAddress(ModuleIds.VAULT), address(deployScript.vault()));
    assertEq(
      directory.getAddress(ModuleIds.LIQUIDITY_MANAGER),
      address(deployScript.liquidityManager())
    );
    assertEq(directory.getAddress(ModuleIds.DEPOSIT_MANAGER), address(deployScript.controller()));
    assertEq(directory.getAddress(ModuleIds.ORACLE), address(deployScript.oracleManager()));
    assertEq(directory.getAddress(ModuleIds.TOKEN), address(deployScript.token()));
    assertEq(
      directory.getAddress(ModuleIds.STRATEGY_MANAGER),
      address(deployScript.strategyManager())
    );
    assertEq(
      directory.getAddress(ModuleIds.PORTFOLIO_MANAGER),
      address(deployScript.portfolioManager())
    );
    assertEq(directory.getAddress(ModuleIds.SWAP_ADAPTER), address(deployScript.swapAdapter()));
    console.log('[PASS] Task 8: ProtocolDirectory all 10 modules registered correctly');

    // Task 9: Verify Oracle Feeds
    OracleManager oracleMgr = deployScript.oracleManager();
    ChainlinkOracleProvider clProvider = deployScript.chainlinkProvider();
    bytes32 usdcId = bytes32(uint256(uint160(BASE_MAINNET_USDC)));
    bytes32 cbbtcId = bytes32(uint256(uint160(BASE_MAINNET_CBBTC)));
    bytes32 wethId = bytes32(uint256(uint160(BASE_MAINNET_WETH)));

    OracleManager.AssetConfig memory usdcCfg = oracleMgr.getAssetConfig(usdcId);
    assertEq(usdcCfg.primaryProvider, address(clProvider));
    assertEq(usdcCfg.heartbeat, 86400);
    assertTrue(usdcCfg.enabled);

    OracleManager.AssetConfig memory cbbtcCfg = oracleMgr.getAssetConfig(cbbtcId);
    assertEq(cbbtcCfg.primaryProvider, address(clProvider));
    assertEq(cbbtcCfg.heartbeat, 86400);
    assertTrue(cbbtcCfg.enabled);

    OracleManager.AssetConfig memory wethCfg = oracleMgr.getAssetConfig(wethId);
    assertEq(wethCfg.primaryProvider, address(clProvider));
    assertEq(wethCfg.heartbeat, 86400);
    assertTrue(wethCfg.enabled);

    // Fetch live on-chain prices from Base Mainnet Chainlink feeds via OracleManager
    uint256 usdcPrice = oracleMgr.getAssetPrice(BASE_MAINNET_USDC);
    uint256 cbbtcPrice = oracleMgr.getAssetPrice(BASE_MAINNET_CBBTC);
    uint256 wethPrice = oracleMgr.getAssetPrice(BASE_MAINNET_WETH);

    assertTrue(usdcPrice > 0, 'USDC price must be > 0');
    assertTrue(cbbtcPrice > 0, 'cbBTC price must be > 0');
    assertTrue(wethPrice > 0, 'WETH price must be > 0');
    console.log('[PASS] Task 9: Oracle Feeds verified live on Base Mainnet fork');
    console.log('       USDC Price (18 dec):', usdcPrice);
    console.log('       cbBTC Price (18 dec):', cbbtcPrice);
    console.log('       WETH Price (18 dec):', wethPrice);

    // Task 10: Verify Strategy
    StrategyManager stratMgr = deployScript.strategyManager();
    (address[] memory stratAssets, uint256[] memory stratWeights) = stratMgr.getTargetWeights();
    assertEq(stratAssets.length, 2);
    assertEq(stratAssets[0], BASE_MAINNET_CBBTC);
    assertEq(stratAssets[1], BASE_MAINNET_WETH);
    assertEq(stratWeights[0], 5000);
    assertEq(stratWeights[1], 5000);
    console.log('[PASS] Task 10: Strategy configured for 50% cbBTC / 50% WETH');

    // Task 11: Verify Treasury
    Treasury treasury = deployScript.treasury();
    assertTrue(treasury.isSupported(BASE_MAINNET_USDC));
    assertTrue(treasury.isSupported(BASE_MAINNET_CBBTC));
    assertTrue(treasury.isSupported(BASE_MAINNET_WETH));
    assertTrue(treasury.hasRole(treasury.CONTROLLER_ROLE(), address(deployScript.controller())));
    console.log('[PASS] Task 11: Treasury registered assets & granted controller role');

    // Task 12: Verify FeeManager
    FeeManager feeMgr = deployScript.feeManager();
    assertEq(feeMgr.treasury(), address(treasury));
    console.log('[PASS] Task 12: FeeManager correctly configured with Treasury target');
  }
}
