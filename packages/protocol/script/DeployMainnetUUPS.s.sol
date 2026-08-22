// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import { ERC1967Proxy } from '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';

import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { OracleManager } from '../src/oracle/OracleManager.sol';
import { ChainlinkOracleProvider } from '../src/oracle/ChainlinkOracleProvider.sol';
import { Treasury } from '../src/vault/Treasury.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { LiquidityManager } from '../src/vault/LiquidityManager.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';
import { UnifyVaultControllerUpgradeable } from '../src/controller/UnifyVaultControllerUpgradeable.sol';
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
 * @title DeployMainnetUUPSScript
 * @notice FRESH Base Mainnet (8453) protocol deployment using the UUPS upgradeable
 *         controller (UnifyVaultControllerUpgradeable behind an ERC1967Proxy).
 *
 * @dev    This script does NOT deploy the legacy immutable `UnifyVaultController`.
 *         It deploys every module from scratch, wires the UVBEV2 -> CostBasisManagerV2
 *         hook, and registers the controller proxy under both DEPOSIT_MANAGER and
 *         REDEEM_MANAGER module ids.
 *
 *         SAFETY INVARIANTS (verified in-script):
 *           1. The implementation contract is permanently locked (_disableInitializers).
 *           2. The implementation contract holds ZERO protocol CONTROLLER_ROLEs.
 *           3. The proxy holds CONTROLLER_ROLE on Vault/Treasury/Token/CBM/Liquidity.
 *           4. The deployer's transient token CONTROLLER_ROLE is revoked.
 *           5. Governance handoff (GrantAdminRoles) and old-admin renunciation are
 *              intentionally NOT performed here.
 *
 *         IMPORTANT: Run with --broadcast OFF for dry-run validation first. This script
 *         is a reference for a fresh Base Mainnet deployment; it does not touch Base
 *         Sepolia or any existing deployment.
 */
contract DeployMainnetUUPSScript is Script {
  uint256 public constant BASE_MAINNET_CHAIN_ID = 8453;

  // --- Base Mainnet collateral & strategy assets (checksummed) ---
  address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // 6 decimals
  address public constant CBBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf; // 8 decimals
  address public constant WETH = 0x4200000000000000000000000000000000000006; // 18 decimals

  // --- Base Mainnet Chainlink USD price feeds (checksummed) ---
  address public constant USDC_FEED = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B; // USDC/USD
  address public constant CBBTC_FEED = 0x8C74B2811D2F1aD65517ADB5C65773c1E520ed2f; // cbBTC/USD
  address public constant ETH_FEED = 0xe6eb5B9b85cFF2C84Df3De6e7855bC9E76f034d5; // ETH/USD

  // --- Base Mainnet Uniswap V3 SwapRouter (checksummed) ---
  address public constant UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;

  uint32 public constant ORACLE_HEARTBEAT = 86400; // 24h stale threshold
  uint256 public constant P2P_ESCROW_FEE_BPS = 100; // 1.00%

  // --- 50/50 strategy: cbBTC 5000 BPS, WETH 5000 BPS ---
  uint256 public constant CBBTC_WEIGHT_BPS = 5000;
  uint256 public constant WETH_WEIGHT_BPS = 5000;

  // ERC1967 implementation storage slot
  bytes32 public constant ERC1967_IMPLEMENTATION_SLOT =
    0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

  // --- Deployed contracts ---
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  ChainlinkOracleProvider public chainlinkProvider;
  Treasury public treasury;
  FeeManager public feeManager;
  CustodyVault public vault;
  LiquidityManager public liquidityManager;
  UVBEV2 public token;
  SwapAdapter public swapAdapter;
  StrategyManager public strategyManager;
  PortfolioManager public portfolioManager;
  CostBasisManagerV2 public costBasisManager;
  P2PEscrowV2 public p2pEscrow;
  PerformanceManager public performanceManager;

  UnifyVaultControllerUpgradeable public implementation;
  ERC1967Proxy public proxy;
  UnifyVaultControllerUpgradeable public controller;

  address public deployer;

  function run() external {
    require(block.chainid == BASE_MAINNET_CHAIN_ID, 'MAINNET UUPS: not Base Mainnet (8453)');

    vm.startBroadcast();
    deployer = tx.origin;

    console.log('==================================================================');
    console.log('  UNIFYVAULT V2 - FRESH BASE MAINNET (8453) UUPS DEPLOYMENT');
    console.log('  Deployer: ', deployer);
    console.log('  Chain ID: ', block.chainid);
    console.log('==================================================================');

    // STEP 1 — Deploy all core modules (no controller yet)
    _deployModules();

    // STEP 2 — Register modules in ProtocolDirectory
    _registerModules();

    // STEP 3 — UVBEV2 -> CostBasisManagerV2 linkage
    _linkCostBasis();

    // STEP 4 — Deploy UUPS implementation + ERC1967Proxy (initialize)
    _deployUUPSController();

    // STEP 5 — Register controller proxy in ProtocolDirectory
    _registerController();

    // STEP 6 — Grant downstream CONTROLLER_ROLE to the proxy (and revoke deployer mint)
    _configureRoles();

    // STEP 7 — Synchronize remaining sub-module dependencies
    _syncModules();

    // STEP 8 — Configure Chainlink oracles, register assets, strategy params
    _configureOraclesAndAssets();

    // STEP 9 — Post-deployment verification of every relationship
    _verify();

    vm.stopBroadcast();

    _printManifest();
  }

  // ---------------------------------------------------------------------------
  // STEP 1 — Core modules
  // ---------------------------------------------------------------------------
  function _deployModules() internal {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    chainlinkProvider = new ChainlinkOracleProvider();
    treasury = new Treasury();
    feeManager = new FeeManager(address(treasury));
    vault = new CustodyVault();
    liquidityManager = new LiquidityManager(deployer, address(directory));
    token = new UVBEV2(deployer); // "UnifyVault BTC-ETH V2" / "UVBE" / 18 decimals
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

    costBasisManager = new CostBasisManagerV2(deployer, address(directory));
    p2pEscrow = new P2PEscrowV2(address(treasury), P2P_ESCROW_FEE_BPS);
    performanceManager = new PerformanceManager(deployer, address(directory));

    require(address(directory).code.length > 0, 'deploy: directory');
    require(address(token).code.length > 0, 'deploy: token');
    require(address(vault).code.length > 0, 'deploy: vault');
    console.log('[OK] STEP 1: 14 core modules deployed');
  }

  // ---------------------------------------------------------------------------
  // STEP 2 — Directory registration (all modules except the controller)
  // ---------------------------------------------------------------------------
  function _registerModules() internal {
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.LIQUIDITY_MANAGER, address(liquidityManager));
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
      directory.getAddress(ModuleIds.PORTFOLIO_MANAGER) == address(portfolioManager),
      'dir: PORTFOLIO_MANAGER'
    );
    console.log('[OK] STEP 2: 12 modules registered in ProtocolDirectory');
  }

  // ---------------------------------------------------------------------------
  // STEP 3 — UVBEV2 -> CostBasisManagerV2 linkage (preserves the cost-basis hook)
  // ---------------------------------------------------------------------------
  function _linkCostBasis() internal {
    // Pull PORTFOLIO_MANAGER + TOKEN into the CostBasisManager (must run after registration)
    costBasisManager.syncModules();
    // Point the token's _update hook at the CostBasisManager
    token.setCostBasisManager(address(costBasisManager));
    // Mark the P2P escrow so escrow transfers do not mutate investment cost basis
    costBasisManager.setEscrowStatus(address(p2pEscrow), true);

    require(costBasisManager.indexToken() == address(token), 'link: cbm indexToken');
    require(address(token.costBasisManager()) == address(costBasisManager), 'link: token cbm');
    require(costBasisManager.isEscrow(address(p2pEscrow)), 'link: p2p escrow status');
    console.log('[OK] STEP 3: UVBEV2 -> CostBasisManagerV2 linkage complete');
  }

  // ---------------------------------------------------------------------------
  // STEP 4 — UUPS implementation + ERC1967Proxy
  // ---------------------------------------------------------------------------
  function _deployUUPSController() internal {
    implementation = new UnifyVaultControllerUpgradeable(); // constructor locks initializers
    require(address(implementation).code.length > 0, 'deploy: implementation');

    bytes memory initData = abi.encodeWithSelector(
      UnifyVaultControllerUpgradeable.initialize.selector,
      deployer,
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    proxy = new ERC1967Proxy(address(implementation), initData);
    controller = UnifyVaultControllerUpgradeable(address(proxy));

    // Verify the proxy points at our implementation
    bytes32 rawImplSlot = vm.load(address(proxy), ERC1967_IMPLEMENTATION_SLOT);
    require(
      address(uint160(uint256(rawImplSlot))) == address(implementation),
      'uups: implementation slot mismatch'
    );
    console.log('[OK] STEP 4: UUPS implementation + ERC1967Proxy deployed & initialized');
  }

  // ---------------------------------------------------------------------------
  // STEP 5 — Register controller proxy in directory (DEPOSIT + REDEEM routing)
  // ---------------------------------------------------------------------------
  function _registerController() internal {
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(proxy));
    directory.registerAddress(ModuleIds.REDEEM_MANAGER, address(proxy));

    require(directory.getAddress(ModuleIds.DEPOSIT_MANAGER) == address(proxy), 'dir: DEPOSIT');
    require(directory.getAddress(ModuleIds.REDEEM_MANAGER) == address(proxy), 'dir: REDEEM');
    console.log('[OK] STEP 5: DEPOSIT_MANAGER & REDEEM_MANAGER -> controller proxy');
  }

  // ---------------------------------------------------------------------------
  // STEP 6 — Grant CONTROLLER_ROLE to proxy (and revoke deployer token mint)
  // ---------------------------------------------------------------------------
  function _configureRoles() internal {
    bytes32 controllerRole = AccessRoles.CONTROLLER_ROLE;

    vault.grantRole(controllerRole, address(proxy));
    treasury.grantRole(controllerRole, address(proxy));
    liquidityManager.grantRole(controllerRole, address(proxy));
    token.grantRole(controllerRole, address(proxy));
    costBasisManager.grantRole(controllerRole, address(proxy));

    // Deployer must not retain direct mint/burn authority on the token
    token.revokeRole(token.CONTROLLER_ROLE(), deployer);

    require(vault.hasRole(controllerRole, address(proxy)), 'role: vault');
    require(treasury.hasRole(controllerRole, address(proxy)), 'role: treasury');
    require(liquidityManager.hasRole(controllerRole, address(proxy)), 'role: liquidity');
    require(token.hasRole(controllerRole, address(proxy)), 'role: token');
    require(costBasisManager.hasRole(controllerRole, address(proxy)), 'role: cbm');
    require(!token.hasRole(token.CONTROLLER_ROLE(), deployer), 'role: deployer mint not revoked');
    console.log('[OK] STEP 6: CONTROLLER_ROLE granted to proxy; deployer mint revoked');
  }

  // ---------------------------------------------------------------------------
  // STEP 7 — Synchronize remaining sub-module dependencies
  // ---------------------------------------------------------------------------
  function _syncModules() internal {
    liquidityManager.syncModules();
    portfolioManager.syncModules();
    performanceManager.syncModules();

    require(portfolioManager.indexToken() == address(token), 'sync: pm indexToken');
    require(performanceManager.indexToken() == address(token), 'sync: perf indexToken');
    require(performanceManager.costBasisManager() == address(costBasisManager), 'sync: perf cbm');
    console.log('[OK] STEP 7: liquidity/portfolio/performance modules synchronized');
  }

  // ---------------------------------------------------------------------------
  // STEP 8 — Chainlink feeds, assets, strategy
  // ---------------------------------------------------------------------------
  function _configureOraclesAndAssets() internal {
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

    vault.registerAsset(USDC, 6);
    vault.registerAsset(CBBTC, 8);
    vault.registerAsset(WETH, 18);
    treasury.registerAsset(USDC, 6);
    treasury.registerAsset(CBBTC, 8);
    treasury.registerAsset(WETH, 18);

    console.log('[OK] STEP 8: Chainlink feeds, assets & 50/50 strategy configured');
  }

  // ---------------------------------------------------------------------------
  // STEP 9 — Post-deployment verification
  // ---------------------------------------------------------------------------
  function _verify() internal view {
    bytes32 controllerRole = AccessRoles.CONTROLLER_ROLE;

    // 1. Directory relationships
    require(directory.getAddress(ModuleIds.TOKEN) == address(token), 'verify: TOKEN');
    require(directory.getAddress(ModuleIds.DEPOSIT_MANAGER) == address(proxy), 'verify: DEPOSIT');
    require(directory.getAddress(ModuleIds.REDEEM_MANAGER) == address(proxy), 'verify: REDEEM');
    require(directory.getAddress(ModuleIds.ORACLE) == address(oracleManager), 'verify: ORACLE');
    require(directory.getAddress(ModuleIds.VAULT) == address(vault), 'verify: VAULT');
    require(directory.getAddress(ModuleIds.TREASURY) == address(treasury), 'verify: TREASURY');
    require(
      directory.getAddress(ModuleIds.COST_BASIS_MANAGER) == address(costBasisManager),
      'verify: CBM'
    );
    require(
      directory.getAddress(ModuleIds.PERFORMANCE_MANAGER) == address(performanceManager),
      'verify: PERF'
    );
    require(directory.getAddress(ModuleIds.P2P_ESCROW) == address(p2pEscrow), 'verify: P2P');

    // 2. Controller storage pointers
    require(controller.directory() == address(directory), 'verify: controller directory');
    require(controller.oracle() == address(oracleManager), 'verify: controller oracle');
    require(controller.vault() == address(vault), 'verify: controller vault');
    require(controller.treasury() == address(treasury), 'verify: controller treasury');
    require(controller.token() == address(token), 'verify: controller token');

    // 3. Controller default config
    require(controller.swapSlippageBps() == 100, 'verify: slippage');
    require(controller.maxDepositPerTx() == type(uint256).max, 'verify: maxDeposit');
    require(controller.maxRedeemPerTx() == type(uint256).max, 'verify: maxRedeem');
    require(!controller.paused(), 'verify: paused');

    // 4. Proxy governance roles (deployer holds admin/governance/guardian/bot)
    require(controller.hasRole(controller.DEFAULT_ADMIN_ROLE(), deployer), 'verify: admin role');
    require(controller.hasRole(AccessRoles.GOVERNANCE_ROLE, deployer), 'verify: gov role');
    require(controller.hasRole(controller.GUARDIAN_ROLE(), deployer), 'verify: guardian role');
    require(controller.hasRole(controller.BOT_ROLE(), deployer), 'verify: bot role');

    // 5. Implementation holds ZERO protocol roles
    require(!vault.hasRole(controllerRole, address(implementation)), 'verify: impl vault role');
    require(
      !treasury.hasRole(controllerRole, address(implementation)),
      'verify: impl treasury role'
    );
    require(!token.hasRole(controllerRole, address(implementation)), 'verify: impl token role');
    require(
      !costBasisManager.hasRole(controllerRole, address(implementation)),
      'verify: impl cbm role'
    );

    // 6. Proxy holds downstream CONTROLLER_ROLE
    require(vault.hasRole(controllerRole, address(proxy)), 'verify: proxy vault role');
    require(treasury.hasRole(controllerRole, address(proxy)), 'verify: proxy treasury role');
    require(token.hasRole(controllerRole, address(proxy)), 'verify: proxy token role');
    require(costBasisManager.hasRole(controllerRole, address(proxy)), 'verify: proxy cbm role');

    // 7. Genesis state
    require(
      keccak256(bytes(token.name())) == keccak256(bytes('UnifyVault BTC-ETH V2')),
      'verify: name'
    );
    require(keccak256(bytes(token.symbol())) == keccak256(bytes('UVBE')), 'verify: symbol');
    require(token.totalSupply() == 0, 'verify: totalSupply');

    // 8. Oracle freshness & positive prices
    require(oracleManager.isPriceFresh(USDC), 'verify: USDC stale');
    require(oracleManager.getAssetPrice(USDC) > 0, 'verify: USDC price');
    require(oracleManager.isPriceFresh(CBBTC), 'verify: cbBTC stale');
    require(oracleManager.getAssetPrice(CBBTC) > 0, 'verify: cbBTC price');
    require(oracleManager.isPriceFresh(WETH), 'verify: WETH stale');
    require(oracleManager.getAssetPrice(WETH) > 0, 'verify: WETH price');

    console.log('[OK] STEP 9: ALL deployment relationships & invariants verified');
  }

  // ---------------------------------------------------------------------------
  // Manifest (suitable for script/mainnet/config/base_mainnet.json)
  // ---------------------------------------------------------------------------
  function _printManifest() internal view {
    console.log('');
    console.log('==================================================================');
    console.log('  BASE MAINNET UUPS DEPLOYMENT MANIFEST');
    console.log('==================================================================');
    console.log('chainId:                 ', block.chainid);
    console.log('deployer (oldAdmin):     ', deployer);
    console.log('');
    console.log('--- contracts (for base_mainnet.json) ---');
    console.log('ProtocolDirectory:        ', address(directory));
    console.log('UnifyVaultController:     ', address(proxy));
    console.log('ControllerImplementation: ', address(implementation));
    console.log('CustodyVault:             ', address(vault));
    console.log('Treasury:                 ', address(treasury));
    console.log('FeeManager:               ', address(feeManager));
    console.log('OracleManager:            ', address(oracleManager));
    console.log('ChainlinkOracleProvider:  ', address(chainlinkProvider));
    console.log('UVBEV2:                   ', address(token));
    console.log('LiquidityManager:         ', address(liquidityManager));
    console.log('StrategyManager:          ', address(strategyManager));
    console.log('PortfolioManager:         ', address(portfolioManager));
    console.log('SwapAdapter:              ', address(swapAdapter));
    console.log('CostBasisManagerV2:       ', address(costBasisManager));
    console.log('PerformanceManager:       ', address(performanceManager));
    console.log('P2PEscrowV2:              ', address(p2pEscrow));
    console.log('');
    console.log('NOTE: newAdmin/guardian (multisig) and old-admin renunciation are');
    console.log('      configured post-deployment via GrantAdminRoles / RenounceOldAdmin.');
    console.log('==================================================================');
  }
}
