// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import 'forge-std/console2.sol';

import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { OracleManager } from '../src/oracle/OracleManager.sol';
import { ChainlinkOracleProvider } from '../src/oracle/ChainlinkOracleProvider.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { LiquidityManager } from '../src/vault/LiquidityManager.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';
import { UnifyVaultController } from '../src/controller/UnifyVaultController.sol';
import { StrategyManager } from '../src/strategy/StrategyManager.sol';
import { PortfolioManager } from '../src/strategy/PortfolioManager.sol';
import { SwapAdapter } from '../src/swap/SwapAdapter.sol';
import { FeeManager } from '../src/treasury/FeeManager.sol';
import { CostBasisManagerV2 } from '../src/treasury/CostBasisManagerV2.sol';
import { PerformanceManager } from '../src/treasury/PerformanceManager.sol';
import { P2PEscrowV2 } from '../src/escrow/P2PEscrowV2.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';

/**
 * @title DeployFreshBaseSepoliaScript
 * @notice COMPLETELY FRESH Base Sepolia (84532) protocol deployment.
 * @dev Deploys a brand-new ProtocolDirectory and every module from scratch. It does NOT
 *      reuse the legacy directory/token/contracts and does NOT migrate any accounting.
 *      The ERC-20 index token is UVBEV2 with on-chain symbol "UVBE" (18 decimals).
 *      Genesis state: totalSupply() == 0 and currentUVPrice() == $1.00 (1e18).
 *
 *      All asset addresses, Chainlink feeds, and the Uniswap V3 router below were read
 *      back from the validated live Base Sepolia deployment (do not change them).
 */
contract DeployFreshBaseSepoliaScript is Script {
  uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

  // --- Base Sepolia collateral & strategy assets (validated on-chain) ---
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // 6 decimals
  address public constant CBBTC = 0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29; // 8 decimals
  address public constant WETH = 0xd116ab1c943cf15904eC4c8dd701086f175FA323; // 18 decimals

  // --- Base Sepolia Chainlink USD price feeds (validated on-chain) ---
  address public constant USDC_FEED = 0x598D6E603Ed84b46Ac310209960b9810583133Af; // USDC/USD (6)
  address public constant CBBTC_FEED = 0x5399D3574e0E7944F5b11d266dC2F6e4cC53C01F; // cbBTC/USD (8)
  address public constant ETH_FEED = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1; // ETH/USD (8)

  // --- Base Sepolia Uniswap V3 SwapRouter (validated on-chain) ---
  address public constant UNISWAP_V3_ROUTER = 0x63f3432b1ca616bb8fdF46058e6d855262C195f7;

  uint32 public constant ORACLE_HEARTBEAT = 86400; // 24 hours stale threshold
  uint256 public constant P2P_ESCROW_FEE_BPS = 100; // 1.00%

  // --- 60/40 strategy: cbBTC 6000 BPS, WETH 4000 BPS ---
  uint256 public constant CBBTC_WEIGHT_BPS = 6000;
  uint256 public constant WETH_WEIGHT_BPS = 4000;

  // --- Deployed contracts ---
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  Treasury public treasury;
  FeeManager public feeManager;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  UVBEV2 public token;
  UnifyVaultController public controller;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  SwapAdapter public swapAdapter;
  CostBasisManagerV2 public costBasisManager;
  P2PEscrowV2 public p2pEscrow;
  PerformanceManager public performanceManager;

  function run() external {
    require(block.chainid == BASE_SEPOLIA_CHAIN_ID, 'FRESH DEPLOY: not Base Sepolia (84532)');

    address deployer = msg.sender;
    console2.log('======================================================');
    console2.log('  UNIFYVAULT FRESH BASE SEPOLIA DEPLOYMENT (84532)');
    console2.log('======================================================');
    console2.log('Deployer:       ', deployer);
    require(deployer.balance >= 0.05 ether, 'PREFLIGHT: insufficient ETH for broadcast');

    vm.startBroadcast();

    // ---------------------------------------------------------------
    // STEP 1 — Deploy all core contracts
    // ---------------------------------------------------------------
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();
    treasury = new Treasury();
    feeManager = new FeeManager(address(treasury));
    vault = new CustodyVault();
    liquidityManager = new LiquidityManager(deployer, address(directory));
    token = new UVBEV2(deployer); // name "UnifyVault BTC-ETH V2", symbol "UVBE", 18 decimals
    swapAdapter = new SwapAdapter(deployer, UNISWAP_V3_ROUTER);

    address[] memory strategyAssets = new address[](2);
    strategyAssets[0] = CBBTC;
    strategyAssets[1] = WETH;
    uint256[] memory strategyWeights = new uint256[](2);
    strategyWeights[0] = CBBTC_WEIGHT_BPS;
    strategyWeights[1] = WETH_WEIGHT_BPS;
    strategyManager = new StrategyManager(deployer, strategyAssets, strategyWeights);

    portfolioManager = new PortfolioManager(
      deployer,
      address(directory),
      address(strategyManager),
      address(oracleManager),
      address(vault),
      address(token)
    );

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    costBasisManager = new CostBasisManagerV2(deployer, address(directory));
    p2pEscrow = new P2PEscrowV2(address(treasury), P2P_ESCROW_FEE_BPS);
    performanceManager = new PerformanceManager(deployer, address(directory));

    require(address(directory).code.length > 0, 'deploy: directory');
    require(address(token).code.length > 0, 'deploy: token');
    require(address(controller).code.length > 0, 'deploy: controller');
    console2.log('[OK] STEP 1: 14 contracts deployed');

    // ---------------------------------------------------------------
    // STEP 2 — Register all modules in ProtocolDirectory
    // ---------------------------------------------------------------
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));
    directory.registerAddress(ModuleIds.STRATEGY_MANAGER, address(strategyManager));
    directory.registerAddress(ModuleIds.PORTFOLIO_MANAGER, address(portfolioManager));
    directory.registerAddress(ModuleIds.SWAP_ADAPTER, address(swapAdapter));
    directory.registerAddress(ModuleIds.COST_BASIS_MANAGER, address(costBasisManager));
    directory.registerAddress(ModuleIds.PERFORMANCE_MANAGER, address(performanceManager));
    directory.registerAddress(ModuleIds.P2P_ESCROW, address(p2pEscrow));

    require(directory.getAddress(ModuleIds.TOKEN) == address(token), 'dir: TOKEN');
    require(
      directory.getAddress(ModuleIds.DEPOSIT_MANAGER) == address(controller),
      'dir: controller'
    );
    console2.log('[OK] STEP 2: 13 modules registered');

    // ---------------------------------------------------------------
    // STEP 3 — Synchronize sub-module dependencies
    // ---------------------------------------------------------------
    liquidityManager.syncModules();
    portfolioManager.syncModules();
    costBasisManager.syncModules(); // pulls PORTFOLIO_MANAGER + TOKEN
    performanceManager.syncModules(); // pulls PM + CBM + ORACLE + TOKEN

    token.setCostBasisManager(address(costBasisManager));
    costBasisManager.setEscrowStatus(address(p2pEscrow), true);

    require(portfolioManager.indexToken() == address(token), 'sync: pm indexToken');
    require(performanceManager.indexToken() == address(token), 'sync: perf indexToken');
    require(performanceManager.costBasisManager() == address(costBasisManager), 'sync: perf cbm');
    console2.log('[OK] STEP 3: modules synchronized');

    // ---------------------------------------------------------------
    // STEP 4 — Configure Chainlink oracles (USDC, cbBTC, WETH)
    // ---------------------------------------------------------------
    bytes32 usdcId = bytes32(uint256(uint160(USDC)));
    bytes32 cbbtcId = bytes32(uint256(uint160(CBBTC)));
    bytes32 wethId = bytes32(uint256(uint160(WETH)));

    chainlinkProvider.registerFeed(usdcId, USDC_FEED, ORACLE_HEARTBEAT);
    chainlinkProvider.registerFeed(cbbtcId, CBBTC_FEED, ORACLE_HEARTBEAT);
    chainlinkProvider.registerFeed(wethId, ETH_FEED, ORACLE_HEARTBEAT);

    oracleManager.configureAsset(
      usdcId,
      address(chainlinkProvider),
      address(0),
      ORACLE_HEARTBEAT,
      true
    );
    oracleManager.configureAsset(
      cbbtcId,
      address(chainlinkProvider),
      address(0),
      ORACLE_HEARTBEAT,
      true
    );
    oracleManager.configureAsset(
      wethId,
      address(chainlinkProvider),
      address(0),
      ORACLE_HEARTBEAT,
      true
    );

    require(oracleManager.isPriceFresh(USDC), 'oracle: USDC not fresh');
    require(oracleManager.getAssetPrice(USDC) > 0, 'oracle: USDC price zero');
    require(oracleManager.isPriceFresh(CBBTC), 'oracle: cbBTC not fresh');
    require(oracleManager.getAssetPrice(CBBTC) > 0, 'oracle: cbBTC price zero');
    require(oracleManager.isPriceFresh(WETH), 'oracle: WETH not fresh');
    require(oracleManager.getAssetPrice(WETH) > 0, 'oracle: WETH price zero');
    console2.log('[OK] STEP 4: oracles configured & fresh');

    // ---------------------------------------------------------------
    // STEP 5 — Register assets in Vault & Treasury
    // ---------------------------------------------------------------
    vault.registerAsset(USDC, 6);
    vault.registerAsset(CBBTC, 8);
    vault.registerAsset(WETH, 18);
    treasury.registerAsset(USDC, 6);
    treasury.registerAsset(CBBTC, 8);
    treasury.registerAsset(WETH, 18);
    console2.log('[OK] STEP 5: assets registered');

    // ---------------------------------------------------------------
    // STEP 6 — Controller default slippage
    // ---------------------------------------------------------------
    controller.setSwapSlippageBps(100); // 1.00%
    require(controller.swapSlippageBps() == 100, 'controller: slippage');
    console2.log('[OK] STEP 6: controller slippage set');

    // ---------------------------------------------------------------
    // STEP 7 — Access control (roles)
    // ---------------------------------------------------------------
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    liquidityManager.grantRole(AccessRoles.CONTROLLER_ROLE, address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));
    costBasisManager.grantRole(costBasisManager.CONTROLLER_ROLE(), address(controller));

    // Deployer must not retain direct mint/burn authority on the token.
    token.revokeRole(token.CONTROLLER_ROLE(), deployer);

    require(vault.hasRole(vault.CONTROLLER_ROLE(), address(controller)), 'role: vault');
    require(treasury.hasRole(treasury.CONTROLLER_ROLE(), address(controller)), 'role: treasury');
    require(
      liquidityManager.hasRole(AccessRoles.CONTROLLER_ROLE, address(controller)),
      'role: liquidity'
    );
    require(token.hasRole(token.CONTROLLER_ROLE(), address(controller)), 'role: token controller');
    require(!token.hasRole(token.CONTROLLER_ROLE(), deployer), 'role: deployer mint not revoked');
    require(
      costBasisManager.hasRole(costBasisManager.CONTROLLER_ROLE(), address(controller)),
      'role: cbm'
    );
    console2.log('[OK] STEP 7: roles configured');

    // ---------------------------------------------------------------
    // STEP 8 — Genesis state verification (totalSupply == 0, price == $1)
    // ---------------------------------------------------------------
    require(
      keccak256(bytes(token.name())) == keccak256(bytes('UnifyVault BTC-ETH V2')),
      'genesis: name'
    );
    require(keccak256(bytes(token.symbol())) == keccak256(bytes('UVBE')), 'genesis: symbol');
    require(token.decimals() == 18, 'genesis: decimals');
    require(token.totalSupply() == 0, 'genesis: totalSupply not zero');

    (, uint256 genesisPrice) = portfolioManager.calculateUVPrice();
    require(genesisPrice == 1e18, 'genesis: price not $1.00');
    console2.log('[OK] STEP 8: genesis state verified (supply 0, price $1.00)');

    vm.stopBroadcast();

    _printManifest();
  }

  function _printManifest() internal view {
    console2.log('');
    console2.log('======================================================');
    console2.log('  FRESH BASE SEPOLIA DEPLOYMENT MANIFEST');
    console2.log('======================================================');
    console2.log('ProtocolDirectory:      ', address(directory));
    console2.log('OracleManager:          ', address(oracleManager));
    console2.log('ChainlinkOracleProvider:', address(chainlinkProvider));
    console2.log('Treasury:               ', address(treasury));
    console2.log('FeeManager:             ', address(feeManager));
    console2.log('CustodyVault:           ', address(vault));
    console2.log('LiquidityManager:       ', address(liquidityManager));
    console2.log('UVBEV2 (UVBE):          ', address(token));
    console2.log('StrategyManager:        ', address(strategyManager));
    console2.log('PortfolioManager:       ', address(portfolioManager));
    console2.log('SwapAdapter:            ', address(swapAdapter));
    console2.log('CostBasisManagerV2:     ', address(costBasisManager));
    console2.log('P2PEscrowV2:            ', address(p2pEscrow));
    console2.log('PerformanceManager:     ', address(performanceManager));
    console2.log('UnifyVaultController:   ', address(controller));
    console2.log('======================================================');
  }
}
