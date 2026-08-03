// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { OracleManager } from '../src/oracle/OracleManager.sol';
import { ChainlinkOracleProvider } from '../src/oracle/ChainlinkOracleProvider.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { LiquidityManager } from '../src/vault/LiquidityManager.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import { UVBTCETHToken } from '../src/token/UVBTCETHToken.sol';
import { UnifyVaultController } from '../src/controller/UnifyVaultController.sol';
import { StrategyManager } from '../src/strategy/StrategyManager.sol';
import { PortfolioManager } from '../src/strategy/PortfolioManager.sol';
import { SwapAdapter } from '../src/swap/SwapAdapter.sol';
import { FeeManager } from '../src/treasury/FeeManager.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';

/**
 * @title DeployMainnetScript
 * @notice Production deployment script for UnifyVault V2 on Base Mainnet (Chain ID: 8453).
 * @dev Deploys production infrastructure using real Base Mainnet asset tokens, Chainlink price feeds,
 *      and Uniswap V3 Swap Router. Contains zero mock contracts or testnet artifacts.
 */
contract DeployMainnetScript is Script {
  // -------------------------------------------------------------------
  // Production Constants - Base Mainnet (Chain ID: 8453)
  // -------------------------------------------------------------------
  uint256 public constant BASE_MAINNET_CHAIN_ID = 8453;

  // Base Mainnet Core Token Addresses (checksummed)
  address public constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // 6 decimals
  address public constant BASE_MAINNET_CBBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf; // 8 decimals
  address public constant BASE_MAINNET_WETH = 0x4200000000000000000000000000000000000006; // 18 decimals

  // Base Mainnet Chainlink Price Feed Oracles (checksummed)
  address public constant BASE_MAINNET_USDC_FEED = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B; // USDC/USD
  address public constant BASE_MAINNET_CBBTC_FEED = 0x07b96265B54d0f09062F81B4D0840C5f2142E0a6; // cbBTC/USD
  address public constant BASE_MAINNET_ETH_FEED = 0x71041DDdaDB357Cb0061e89ef2399D55986fc000; // ETH/USD

  // Base Mainnet Uniswap V3 Swap Router
  address public constant BASE_MAINNET_UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;

  // Oracle Stale Heartbeat Threshold (24 Hours = 86400 seconds)
  uint32 public constant ORACLE_HEARTBEAT = 86400;

  // Deployed Protocol Contracts
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  Treasury public treasury;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  FeeManager public feeManager;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;

  address public deployer;

  function run() external {
    // -------------------------------------------------------------------
    // Pre-flight Verification & Safety Checks
    // -------------------------------------------------------------------

    vm.startBroadcast();
    deployer = tx.origin;

    console.log('==================================================================');
    console.log('UNIFYVAULT V2 - PRODUCTION BASE MAINNET DEPLOYMENT ENGINE');
    console.log('Deployer Address: ', deployer);
    console.log('Chain ID:         ', block.chainid);
    console.log('==================================================================');

    if (block.chainid != BASE_MAINNET_CHAIN_ID) {
      console.log('[WARNING] Executing script outside Base Mainnet chain ID 8453!');
    }

    // -------------------------------------------------------------------
    // STEP 1: Deploy Core Infrastructure Contracts
    // -------------------------------------------------------------------
    console.log('\n--- Step 1: Deploying Core Infrastructure Contracts ---');

    directory = new ProtocolDirectory();
    require(address(directory) != address(0), 'Deploy Failed: ProtocolDirectory');

    oracleManager = new OracleManager();
    require(address(oracleManager) != address(0), 'Deploy Failed: OracleManager');

    chainlinkProvider = new ChainlinkOracleProvider();
    require(address(chainlinkProvider) != address(0), 'Deploy Failed: ChainlinkOracleProvider');

    treasury = new Treasury();
    require(address(treasury) != address(0), 'Deploy Failed: Treasury');

    feeManager = new FeeManager(address(treasury));
    require(address(feeManager) != address(0), 'Deploy Failed: FeeManager');

    vault = new CustodyVault();
    require(address(vault) != address(0), 'Deploy Failed: CustodyVault');

    liquidityManager = new LiquidityManager(deployer, address(directory));
    require(address(liquidityManager) != address(0), 'Deploy Failed: LiquidityManager');

    token = new UVBTCETHToken();
    require(address(token) != address(0), 'Deploy Failed: UVBTCETHToken');

    swapAdapter = new SwapAdapter(deployer, BASE_MAINNET_UNISWAP_V3_ROUTER);
    require(address(swapAdapter) != address(0), 'Deploy Failed: SwapAdapter');

    // Strategy Configuration: 50% cbBTC (5000 BPS), 50% WETH (5000 BPS)
    address[] memory strategyAssets = new address[](2);
    strategyAssets[0] = BASE_MAINNET_CBBTC;
    strategyAssets[1] = BASE_MAINNET_WETH;

    uint256[] memory strategyWeights = new uint256[](2);
    strategyWeights[0] = 5000;
    strategyWeights[1] = 5000;

    strategyManager = new StrategyManager(deployer, strategyAssets, strategyWeights);
    require(address(strategyManager) != address(0), 'Deploy Failed: StrategyManager');

    portfolioManager = new PortfolioManager(
      deployer,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );
    require(address(portfolioManager) != address(0), 'Deploy Failed: PortfolioManager');

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );
    require(address(controller) != address(0), 'Deploy Failed: UnifyVaultController');

    // -------------------------------------------------------------------
    // STEP 2: Register Modules in ProtocolDirectory (Idempotent)
    // -------------------------------------------------------------------
    console.log('\n--- Step 2: Registering Modules in ProtocolDirectory ---');

    _registerOrUpdate(directory, ModuleIds.TREASURY, address(treasury));
    _registerOrUpdate(directory, ModuleIds.FEE_MANAGER, address(feeManager));
    _registerOrUpdate(directory, ModuleIds.VAULT, address(vault));
    _registerOrUpdate(directory, ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    _registerOrUpdate(directory, ModuleIds.DEPOSIT_MANAGER, address(controller));
    _registerOrUpdate(directory, ModuleIds.ORACLE, address(oracleManager));
    _registerOrUpdate(directory, ModuleIds.TOKEN, address(token));
    _registerOrUpdate(directory, ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    _registerOrUpdate(directory, ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    _registerOrUpdate(directory, ModuleIds.SWAP_ADAPTER, address(swapAdapter));

    // Hard Assertions for Registration Verification
    require(directory.getAddress(ModuleIds.TREASURY) == address(treasury), 'Reg Verification Failed: Treasury');
    require(directory.getAddress(ModuleIds.FEE_MANAGER) == address(feeManager), 'Reg Verification Failed: FeeManager');
    require(directory.getAddress(ModuleIds.VAULT) == address(vault), 'Reg Verification Failed: CustodyVault');
    require(directory.getAddress(ModuleIds.LIQUIDITY_MANAGER) == address(liquidityManager), 'Reg Verification Failed: LiquidityManager');
    require(directory.getAddress(ModuleIds.DEPOSIT_MANAGER) == address(controller), 'Reg Verification Failed: Controller');
    require(directory.getAddress(ModuleIds.ORACLE) == address(oracleManager), 'Reg Verification Failed: OracleManager');
    require(directory.getAddress(ModuleIds.TOKEN) == address(token), 'Reg Verification Failed: Token');
    require(directory.getAddress(ModuleIds.STRATEGY_MANAGER) == address(strategyManager), 'Reg Verification Failed: StrategyManager');
    require(directory.getAddress(ModuleIds.PORTFOLIO_MANAGER) == address(portfolioManager), 'Reg Verification Failed: PortfolioManager');
    require(directory.getAddress(ModuleIds.SWAP_ADAPTER) == address(swapAdapter), 'Reg Verification Failed: SwapAdapter');

    console.log('[+] All 10 Core Modules Registered & Verified!');

    // -------------------------------------------------------------------
    // STEP 3: Sync Sub-module Dependencies
    // -------------------------------------------------------------------
    console.log('\n--- Step 3: Synchronizing Sub-module Dependencies ---');

    liquidityManager.syncModules();
    require(liquidityManager.custodyVault() == address(vault), 'Sync Failed: LiquidityManager CustodyVault');

    portfolioManager.syncModules();

    console.log('[+] LiquidityManager & PortfolioManager Synchronized!');

    // -------------------------------------------------------------------
    // STEP 4: Configure Production Price Feeds & OracleManager
    // -------------------------------------------------------------------
    console.log('\n--- Step 4: Configuring Chainlink Oracle Feeds ---');

    bytes32 usdcId = bytes32(uint256(uint160(BASE_MAINNET_USDC)));
    bytes32 cbbtcId = bytes32(uint256(uint160(BASE_MAINNET_CBBTC)));
    bytes32 wethId = bytes32(uint256(uint160(BASE_MAINNET_WETH)));

    chainlinkProvider.registerFeed(usdcId, BASE_MAINNET_USDC_FEED, ORACLE_HEARTBEAT);
    chainlinkProvider.registerFeed(cbbtcId, BASE_MAINNET_CBBTC_FEED, ORACLE_HEARTBEAT);
    chainlinkProvider.registerFeed(wethId, BASE_MAINNET_ETH_FEED, ORACLE_HEARTBEAT);

    oracleManager.configureAsset(usdcId, address(chainlinkProvider), address(0), ORACLE_HEARTBEAT, true);
    oracleManager.configureAsset(cbbtcId, address(chainlinkProvider), address(0), ORACLE_HEARTBEAT, true);
    oracleManager.configureAsset(wethId, address(chainlinkProvider), address(0), ORACLE_HEARTBEAT, true);

    console.log('[+] Chainlink Oracles Configured for USDC, cbBTC, and WETH!');

    // -------------------------------------------------------------------
    // STEP 5: Register Asset Configs in Vault & Treasury
    // -------------------------------------------------------------------
    console.log('\n--- Step 5: Registering Assets in Vault & Treasury ---');

    vault.registerAsset(BASE_MAINNET_USDC, 6);
    vault.registerAsset(BASE_MAINNET_CBBTC, 8);
    vault.registerAsset(BASE_MAINNET_WETH, 18);

    treasury.registerAsset(BASE_MAINNET_USDC, 6);
    treasury.registerAsset(BASE_MAINNET_CBBTC, 8);
    treasury.registerAsset(BASE_MAINNET_WETH, 18);

    console.log('[+] Assets (USDC, cbBTC, WETH) Registered in Vault & Treasury!');

    // -------------------------------------------------------------------
    // STEP 6: Configure Controller Default Slippage
    // -------------------------------------------------------------------
    console.log('\n--- Step 6: Setting Controller Default Parameters ---');

    controller.setSwapSlippageBps(100); // 1.00% default slippage limit
    require(controller.swapSlippageBps() == 100, 'Slippage Set Verification Failed');

    // -------------------------------------------------------------------
    // STEP 7: Configure AccessControl RBAC Roles
    // -------------------------------------------------------------------
    console.log('\n--- Step 7: Configuring RBAC Role Permissions ---');

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    token.revokeRole(token.CONTROLLER_ROLE(), deployer);
    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));

    // Hard Post-Grant Verification Assertions
    require(vault.hasRole(vault.CONTROLLER_ROLE(), address(controller)), 'Role Verification Failed: Vault Controller Role');
    require(treasury.hasRole(treasury.CONTROLLER_ROLE(), address(controller)), 'Role Verification Failed: Treasury Controller Role');
    require(token.hasRole(token.CONTROLLER_ROLE(), address(controller)), 'Role Verification Failed: Token Controller Role');
    require(!token.hasRole(token.CONTROLLER_ROLE(), deployer), 'Role Verification Failed: Token Deployer Revocation');
    require(liquidityManager.hasRole(AccessRoles.CONTROLLER_ROLE, address(controller)), 'Role Verification Failed: LiquidityManager Controller Role');

    console.log('[+] AccessControl Roles Granted & Verified!');

    vm.stopBroadcast();

    // -------------------------------------------------------------------
    // STEP 8: Deployed Address Manifest Log
    // -------------------------------------------------------------------
    console.log('\n==================================================================');
    console.log('UNIFYVAULT V2 - PRODUCTION MAINNET DEPLOYMENT SUCCESSFUL');
    console.log('==================================================================');
    console.log('ProtocolDirectory:       ', address(directory));
    console.log('Treasury:                ', address(treasury));
    console.log('FeeManager:              ', address(feeManager));
    console.log('OracleManager:           ', address(oracleManager));
    console.log('ChainlinkOracleProvider: ', address(chainlinkProvider));
    console.log('CustodyVault:            ', address(vault));
    console.log('LiquidityManager:        ', address(liquidityManager));
    console.log('UVBTCETHToken ($uvBTCETH):', address(token));
    console.log('UnifyVaultController:    ', address(controller));
    console.log('StrategyManager:         ', address(strategyManager));
    console.log('PortfolioManager:        ', address(portfolioManager));
    console.log('SwapAdapter:             ', address(swapAdapter));
    console.log('------------------------------------------------------------------');
    console.log('Uniswap V3 Router:       ', BASE_MAINNET_UNISWAP_V3_ROUTER);
    console.log('USDC Address:            ', BASE_MAINNET_USDC);
    console.log('cbBTC Address:           ', BASE_MAINNET_CBBTC);
    console.log('WETH Address:            ', BASE_MAINNET_WETH);
    console.log('==================================================================\n');
  }

  /**
   * @dev Helper function to register or update module addresses in ProtocolDirectory idempotently.
   */
  function _registerOrUpdate(ProtocolDirectory dir, bytes32 id, address target) internal {
    if (dir.exists(id)) {
      if (dir.getAddress(id) != target) {
        dir.updateAddress(id, target);
      }
    } else {
      dir.registerAddress(id, target);
    }
  }
}
