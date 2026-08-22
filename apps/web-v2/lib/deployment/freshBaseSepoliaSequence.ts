import { DEPLOYMENT_ARTIFACTS } from './generatedArtifacts';
import type { DeploymentStepDefinition, DeploymentContext } from './types';

export const BASE_SEPOLIA_CHAIN_ID = 84532;

// --- Base Sepolia collateral & strategy assets (validated on-chain) ---
export const BASE_SEPOLIA_ASSETS = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // 6 decimals
  CBBTC: '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29' as `0x${string}`, // 8 decimals
  WETH: '0xd116ab1c943cf15904eC4c8dd701086f175FA323' as `0x${string}`, // 18 decimals
};

// --- Base Sepolia Chainlink USD price feeds (validated on-chain) ---
export const BASE_SEPOLIA_FEEDS = {
  USDC_FEED: '0x598D6E603Ed84b46Ac310209960b9810583133Af' as `0x${string}`,
  CBBTC_FEED: '0x5399D3574e0E7944F5b11d266dC2F6e4cC53C01F' as `0x${string}`,
  ETH_FEED: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1' as `0x${string}`,
};

// --- Base Mainnet collateral & strategy assets (validated on-chain) ---
export const BASE_MAINNET_ASSETS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // 6 decimals
  CBBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as `0x${string}`, // 8 decimals
  WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`, // 18 decimals
};

// --- Base Mainnet Chainlink USD price feeds (validated on-chain) ---
export const BASE_MAINNET_FEEDS = {
  USDC_FEED: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B' as `0x${string}`, // USDC/USD
  CBBTC_FEED: '0x8C74B2811D2F1aD65517ADB5C65773c1E520ed2f' as `0x${string}`, // cbBTC/USD
  ETH_FEED: '0xe6eb5B9b85cFF2C84Df3De6e7855bC9E76f034d5' as `0x${string}`, // ETH/USD
};

export function getChainFeeds(chainId: number) {
  if (chainId === 8453) {
    return BASE_MAINNET_FEEDS;
  }
  return BASE_SEPOLIA_FEEDS;
}

export function getChainAssets(chainId: number) {
  if (chainId === 8453) {
    return BASE_MAINNET_ASSETS;
  }
  return BASE_SEPOLIA_ASSETS;
}

export function getAssetIds(chainId: number) {
  if (chainId === 8453) {
    return {
      USDC: '0x000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913' as `0x${string}`,
      CBBTC: '0x000000000000000000000000cbb7c0000ab88b473b1f5afd9ef808440eed33bf' as `0x${string}`,
      WETH: '0x0000000000000000000000004200000000000000000000000000000000000006' as `0x${string}`,
    };
  }
  return ASSET_IDS;
}

// --- Base Mainnet Uniswap V3 SwapRouter (Official Uniswap SwapRouter02 on Base) ---
export const BASE_MAINNET_UNISWAP_V3_ROUTER =
  '0x2626664c2603336E57B271c5C0b26F421741e481' as `0x${string}`;

// --- Base Sepolia Uniswap V3 SwapRouter (validated on-chain) ---
export const BASE_SEPOLIA_UNISWAP_V3_ROUTER =
  '0x63f3432b1ca616bb8fdF46058e6d855262C195f7' as `0x${string}`;

export function getUniswapV3Router(chainId: number): `0x${string}` {
  if (chainId === 8453) {
    return BASE_MAINNET_UNISWAP_V3_ROUTER;
  }
  return BASE_SEPOLIA_UNISWAP_V3_ROUTER;
}

export const ORACLE_HEARTBEAT = 86400; // 24 hours stale threshold
export const P2P_ESCROW_FEE_BPS = 100n; // 1.00%
export const CBBTC_WEIGHT_BPS = 6000n; // 60%
export const WETH_WEIGHT_BPS = 4000n; // 40%
export const CONTROLLER_SLIPPAGE_BPS = 100n; // 1.00%

// Asset Bytes32 Identifiers (keccak-compatible or zero-padded address)
export const ASSET_IDS = {
  USDC: '0x000000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e' as `0x${string}`,
  CBBTC: '0x000000000000000000000000b0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29' as `0x${string}`,
  WETH: '0x000000000000000000000000d116ab1c943cf15904ec4c8dd701086f175fa323' as `0x${string}`,
};

// Module IDs matching ModuleIds.sol
export const MODULE_IDS = {
  TREASURY: '0x6efca2866b731ee4984990bacad4cde10f1ef764fb54a5206bdfd291695b1a9b' as `0x${string}`,
  FEE_MANAGER:
    '0x42e3570c507db8e472a4592e53f4b6df78eb7c8a8d593e718bb47b707f2c6a90' as `0x${string}`,
  VAULT: '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640' as `0x${string}`,
  LIQUIDITY_MANAGER:
    '0x6878742ff510854cb02c186504af5267007c4a6d33f490fc28ec83e83e1458e1' as `0x${string}`,
  DEPOSIT_MANAGER:
    '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
  ORACLE: '0x2e30c16253629c211949dfd3fde5e2a3de47827f45371d8ef81f41a881d12a04' as `0x${string}`,
  TOKEN: '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8' as `0x${string}`,
  STRATEGY_MANAGER:
    '0x58b399e3748bdc2a6973276bd201243421cffba73d1ebdad6acf1b65eb6935e5' as `0x${string}`,
  PORTFOLIO_MANAGER:
    '0x3c40c670348eca8b03e7650189aa991cc9d77fcbee961381c2354fae1a3e2188' as `0x${string}`,
  SWAP_ADAPTER:
    '0xb38cc8783565eb75ee1b8d4c76a41d2179385de2efafcf6315528396e14ed8f2' as `0x${string}`,
  COST_BASIS_MANAGER:
    '0xd4741fb770f259864462ac1e0f0c516cde3c7a9a37aa2882da996c82ffff9796' as `0x${string}`,
  PERFORMANCE_MANAGER:
    '0x3cc6e30a00fc20cd55b209638eb88a197234ab24baed9e238b01e2c52159a815' as `0x${string}`,
  P2P_ESCROW: '0x4178f90dd1606e324454877b14154a3125c2f92df55a76df76af86093a797663' as `0x${string}`,
};

// Access Control Role Hashes
export const ACCESS_ROLES = {
  DEFAULT_ADMIN_ROLE:
    '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
  CONTROLLER_ROLE:
    '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357' as `0x${string}`,
  GOVERNANCE_ROLE:
    '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1' as `0x${string}`,
  GUARDIAN_ROLE:
    '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041' as `0x${string}`,
};

function getRequiredAddress(
  contracts: DeploymentContext['deployedContracts'],
  name: keyof DeploymentContext['deployedContracts'],
): `0x${string}` {
  const addr = contracts[name];
  if (!addr) {
    throw new Error(`Deployment dependency missing: ${name} must be deployed before this step.`);
  }
  return addr;
}

/**
 * Authoritative 53-Step Sequence representing DeployFreshBaseSepolia.s.sol
 */
export const FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS: DeploymentStepDefinition[] = [
  // =========================================================================
  // PHASE 1: Deploy Core Contracts (Steps 1 - 15)
  // =========================================================================
  {
    stepNumber: 1,
    id: 'deploy_protocol_directory',
    title: 'Deploy ProtocolDirectory',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'ProtocolDirectory',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the central protocol directory registry with default admin role.',
    expectedGasLimit: 750_000n,
    getExecutionData: () => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.bytecode,
      args: [],
    }),
  },
  {
    stepNumber: 2,
    id: 'deploy_oracle_manager',
    title: 'Deploy OracleManager',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'OracleManager',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the oracle aggregation and pricing manager with circuit breakers.',
    expectedGasLimit: 1_900_000n,
    getExecutionData: () => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.OracleManager.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.OracleManager.bytecode,
      args: [],
    }),
  },
  {
    stepNumber: 3,
    id: 'deploy_chainlink_oracle_provider',
    title: 'Deploy ChainlinkOracleProvider',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'ChainlinkOracleProvider',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the Chainlink price feed adapter with heartbeat freshness validation.',
    expectedGasLimit: 1_500_000n,
    getExecutionData: () => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.ChainlinkOracleProvider.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.ChainlinkOracleProvider.bytecode,
      args: [],
    }),
  },
  {
    stepNumber: 4,
    id: 'deploy_treasury',
    title: 'Deploy Treasury',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'Treasury',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the protocol fee and reserve treasury vault.',
    expectedGasLimit: 1_600_000n,
    getExecutionData: () => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.Treasury.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.Treasury.bytecode,
      args: [],
    }),
  },
  {
    stepNumber: 5,
    id: 'deploy_fee_manager',
    title: 'Deploy FeeManager',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'FeeManager',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the fee routing and calculation engine linked to Treasury.',
    expectedGasLimit: 800_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.FeeManager.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.FeeManager.bytecode,
      args: [getRequiredAddress(ctx.deployedContracts, 'Treasury')],
    }),
  },
  {
    stepNumber: 6,
    id: 'deploy_custody_vault',
    title: 'Deploy CustodyVault',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'CustodyVault',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the segregated user custody collateral vault.',
    expectedGasLimit: 1_800_000n,
    getExecutionData: () => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.CustodyVault.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.CustodyVault.bytecode,
      args: [],
    }),
  },
  {
    stepNumber: 7,
    id: 'deploy_liquidity_manager',
    title: 'Deploy LiquidityManager',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'LiquidityManager',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the liquidity routing engine with admin and directory pointers.',
    expectedGasLimit: 1_500_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.LiquidityManager.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.LiquidityManager.bytecode,
      args: [ctx.deployerAddress, getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory')],
    }),
  },
  {
    stepNumber: 8,
    id: 'deploy_uvbe_v2_token',
    title: 'Deploy UVBEV2 Index Token',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'UVBEV2',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys the ERC-20 UnifyVault BTC-ETH V2 (UVBE) index token with initial admin.',
    expectedGasLimit: 2_200_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.UVBEV2.bytecode,
      args: [ctx.deployerAddress],
    }),
  },
  {
    stepNumber: 9,
    id: 'deploy_swap_adapter',
    title: 'Deploy SwapAdapter',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'SwapAdapter',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys Uniswap V3 swap integration adapter with router authorization.',
    expectedGasLimit: 1_800_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.SwapAdapter.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.SwapAdapter.bytecode,
      args: [ctx.deployerAddress, getUniswapV3Router(ctx.chainId)],
    }),
  },
  {
    stepNumber: 10,
    id: 'deploy_strategy_manager',
    title: 'Deploy StrategyManager',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'StrategyManager',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys 60/40 BTC-ETH strategy allocator (cbBTC 6000 bps, WETH 4000 bps).',
    expectedGasLimit: 1_900_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.StrategyManager.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.StrategyManager.bytecode,
      args: [
        ctx.deployerAddress,
        [getChainAssets(ctx.chainId).CBBTC, getChainAssets(ctx.chainId).WETH],
        [CBBTC_WEIGHT_BPS, WETH_WEIGHT_BPS],
      ],
    }),
  },
  {
    stepNumber: 11,
    id: 'deploy_portfolio_manager',
    title: 'Deploy PortfolioManager',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'PortfolioManager',
    type: 'DEPLOY',
    functionName: 'constructor',
    description:
      'Deploys portfolio NAV and pricing calculation manager connecting Directory, Strategy, Oracle, Vault, Token.',
    expectedGasLimit: 2_200_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.PortfolioManager.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.PortfolioManager.bytecode,
      args: [
        ctx.deployerAddress,
        getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
        getRequiredAddress(ctx.deployedContracts, 'StrategyManager'),
        getRequiredAddress(ctx.deployedContracts, 'OracleManager'),
        getRequiredAddress(ctx.deployedContracts, 'CustodyVault'),
        getRequiredAddress(ctx.deployedContracts, 'UVBEV2'),
      ],
    }),
  },
  {
    stepNumber: 12,
    id: 'deploy_controller',
    title: 'Deploy UnifyVaultController',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'UnifyVaultController',
    type: 'DEPLOY',
    functionName: 'constructor',
    description:
      'Deploys the primary user entrypoint controller for atomic deposits, minting, and redemptions.',
    expectedGasLimit: 7_500_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.UnifyVaultController.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.UnifyVaultController.bytecode,
      args: [
        getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
        getRequiredAddress(ctx.deployedContracts, 'OracleManager'),
        getRequiredAddress(ctx.deployedContracts, 'CustodyVault'),
        getRequiredAddress(ctx.deployedContracts, 'Treasury'),
        getRequiredAddress(ctx.deployedContracts, 'UVBEV2'),
      ],
    }),
  },
  {
    stepNumber: 13,
    id: 'deploy_cost_basis_manager',
    title: 'Deploy CostBasisManagerV2',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'CostBasisManagerV2',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys user-level cost basis and tax/pnl ledger accounting manager.',
    expectedGasLimit: 1_800_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.CostBasisManagerV2.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.CostBasisManagerV2.bytecode,
      args: [ctx.deployerAddress, getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory')],
    }),
  },
  {
    stepNumber: 14,
    id: 'deploy_p2p_escrow',
    title: 'Deploy P2PEscrowV2',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'P2PEscrowV2',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys decentralized peer-to-peer escrow engine with 1.00% fee routing.',
    expectedGasLimit: 3_500_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.P2PEscrowV2.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.P2PEscrowV2.bytecode,
      args: [getRequiredAddress(ctx.deployedContracts, 'Treasury'), P2P_ESCROW_FEE_BPS],
    }),
  },
  {
    stepNumber: 15,
    id: 'deploy_performance_manager',
    title: 'Deploy PerformanceManager',
    phaseNumber: 1,
    phaseName: 'Core Contract Deployment',
    category: 'core_contracts',
    contractName: 'PerformanceManager',
    type: 'DEPLOY',
    functionName: 'constructor',
    description: 'Deploys protocol performance metric and benchmark calculation module.',
    expectedGasLimit: 1_400_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.PerformanceManager.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.PerformanceManager.bytecode,
      args: [ctx.deployerAddress, getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory')],
    }),
  },

  // =========================================================================
  // PHASE 2: Register Modules in ProtocolDirectory (Steps 16 - 28)
  // =========================================================================
  {
    stepNumber: 16,
    id: 'register_treasury',
    title: 'Register Treasury in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the Treasury module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.TREASURY, getRequiredAddress(ctx.deployedContracts, 'Treasury')],
    }),
  },
  {
    stepNumber: 17,
    id: 'register_fee_manager',
    title: 'Register FeeManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the FeeManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.FEE_MANAGER, getRequiredAddress(ctx.deployedContracts, 'FeeManager')],
    }),
  },
  {
    stepNumber: 18,
    id: 'register_vault',
    title: 'Register CustodyVault in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the CustodyVault module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.VAULT, getRequiredAddress(ctx.deployedContracts, 'CustodyVault')],
    }),
  },
  {
    stepNumber: 19,
    id: 'register_liquidity_manager',
    title: 'Register LiquidityManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the LiquidityManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [
        MODULE_IDS.LIQUIDITY_MANAGER,
        getRequiredAddress(ctx.deployedContracts, 'LiquidityManager'),
      ],
    }),
  },
  {
    stepNumber: 20,
    id: 'register_controller_deposit_manager',
    title: 'Register Controller as DepositManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the UnifyVaultController under the DEPOSIT_MANAGER identifier.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [
        MODULE_IDS.DEPOSIT_MANAGER,
        getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      ],
    }),
  },
  {
    stepNumber: 21,
    id: 'register_oracle_manager',
    title: 'Register OracleManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the OracleManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.ORACLE, getRequiredAddress(ctx.deployedContracts, 'OracleManager')],
    }),
  },
  {
    stepNumber: 22,
    id: 'register_token',
    title: 'Register UVBE Token in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the UVBE index token under the TOKEN module identifier.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.TOKEN, getRequiredAddress(ctx.deployedContracts, 'UVBEV2')],
    }),
  },
  {
    stepNumber: 23,
    id: 'register_strategy_manager',
    title: 'Register StrategyManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the StrategyManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [
        MODULE_IDS.STRATEGY_MANAGER,
        getRequiredAddress(ctx.deployedContracts, 'StrategyManager'),
      ],
    }),
  },
  {
    stepNumber: 24,
    id: 'register_portfolio_manager',
    title: 'Register PortfolioManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the PortfolioManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [
        MODULE_IDS.PORTFOLIO_MANAGER,
        getRequiredAddress(ctx.deployedContracts, 'PortfolioManager'),
      ],
    }),
  },
  {
    stepNumber: 25,
    id: 'register_swap_adapter',
    title: 'Register SwapAdapter in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the SwapAdapter module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.SWAP_ADAPTER, getRequiredAddress(ctx.deployedContracts, 'SwapAdapter')],
    }),
  },
  {
    stepNumber: 26,
    id: 'register_cost_basis_manager',
    title: 'Register CostBasisManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the CostBasisManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [
        MODULE_IDS.COST_BASIS_MANAGER,
        getRequiredAddress(ctx.deployedContracts, 'CostBasisManagerV2'),
      ],
    }),
  },
  {
    stepNumber: 27,
    id: 'register_performance_manager',
    title: 'Register PerformanceManager in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the PerformanceManager module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [
        MODULE_IDS.PERFORMANCE_MANAGER,
        getRequiredAddress(ctx.deployedContracts, 'PerformanceManager'),
      ],
    }),
  },
  {
    stepNumber: 28,
    id: 'register_p2p_escrow',
    title: 'Register P2PEscrow in ProtocolDirectory',
    phaseNumber: 2,
    phaseName: 'Directory Module Registration',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'registerAddress',
    description: 'Registers the P2PEscrow module identifier in ProtocolDirectory.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ProtocolDirectory'),
      abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
      functionName: 'registerAddress',
      args: [MODULE_IDS.P2P_ESCROW, getRequiredAddress(ctx.deployedContracts, 'P2PEscrowV2')],
    }),
  },

  // =========================================================================
  // PHASE 3: Synchronize Sub-Module Dependencies (Steps 29 - 34)
  // =========================================================================
  {
    stepNumber: 29,
    id: 'sync_liquidity_manager',
    title: 'Sync LiquidityManager Dependencies',
    phaseNumber: 3,
    phaseName: 'Module Synchronization & Linkage',
    category: 'module_sync',
    contractName: 'LiquidityManager',
    type: 'CALL',
    functionName: 'syncModules',
    description: 'Pulls updated module addresses from ProtocolDirectory into LiquidityManager.',
    expectedGasLimit: 110_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'LiquidityManager'),
      abi: DEPLOYMENT_ARTIFACTS.LiquidityManager.abi,
      functionName: 'syncModules',
      args: [],
    }),
  },
  {
    stepNumber: 30,
    id: 'sync_portfolio_manager',
    title: 'Sync PortfolioManager Dependencies',
    phaseNumber: 3,
    phaseName: 'Module Synchronization & Linkage',
    category: 'module_sync',
    contractName: 'PortfolioManager',
    type: 'CALL',
    functionName: 'syncModules',
    description: 'Pulls updated module addresses from ProtocolDirectory into PortfolioManager.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'PortfolioManager'),
      abi: DEPLOYMENT_ARTIFACTS.PortfolioManager.abi,
      functionName: 'syncModules',
      args: [],
    }),
  },
  {
    stepNumber: 31,
    id: 'sync_cost_basis_manager',
    title: 'Sync CostBasisManager Dependencies',
    phaseNumber: 3,
    phaseName: 'Module Synchronization & Linkage',
    category: 'module_sync',
    contractName: 'CostBasisManagerV2',
    type: 'CALL',
    functionName: 'syncModules',
    description:
      'Pulls PORTFOLIO_MANAGER and TOKEN addresses from ProtocolDirectory into CostBasisManager.',
    expectedGasLimit: 140_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CostBasisManagerV2'),
      abi: DEPLOYMENT_ARTIFACTS.CostBasisManagerV2.abi,
      functionName: 'syncModules',
      args: [],
    }),
  },
  {
    stepNumber: 32,
    id: 'sync_performance_manager',
    title: 'Sync PerformanceManager Dependencies',
    phaseNumber: 3,
    phaseName: 'Module Synchronization & Linkage',
    category: 'module_sync',
    contractName: 'PerformanceManager',
    type: 'CALL',
    functionName: 'syncModules',
    description:
      'Pulls PortfolioManager, CostBasisManager, OracleManager, and Token addresses into PerformanceManager.',
    expectedGasLimit: 250_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'PerformanceManager'),
      abi: DEPLOYMENT_ARTIFACTS.PerformanceManager.abi,
      functionName: 'syncModules',
      args: [],
    }),
  },
  {
    stepNumber: 33,
    id: 'token_set_cost_basis_manager',
    title: 'Set CostBasisManager in UVBE Token',
    phaseNumber: 3,
    phaseName: 'Module Synchronization & Linkage',
    category: 'module_sync',
    contractName: 'UVBEV2',
    type: 'CALL',
    functionName: 'setCostBasisManager',
    description:
      'Configures the authoritative CostBasisManager address on the UVBE index token for transfer accounting.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'UVBEV2'),
      abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
      functionName: 'setCostBasisManager',
      args: [getRequiredAddress(ctx.deployedContracts, 'CostBasisManagerV2')],
    }),
  },
  {
    stepNumber: 34,
    id: 'cbm_set_escrow_status',
    title: 'Authorize P2PEscrow in CostBasisManager',
    phaseNumber: 3,
    phaseName: 'Module Synchronization & Linkage',
    category: 'module_sync',
    contractName: 'CostBasisManagerV2',
    type: 'CALL',
    functionName: 'setEscrowStatus',
    description:
      'Whitelists P2PEscrowV2 as an authorized escrow contract in CostBasisManager for fee exempt transfers.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CostBasisManagerV2'),
      abi: DEPLOYMENT_ARTIFACTS.CostBasisManagerV2.abi,
      functionName: 'setEscrowStatus',
      args: [getRequiredAddress(ctx.deployedContracts, 'P2PEscrowV2'), true],
    }),
  },

  // =========================================================================
  // PHASE 4: Configure Chainlink Oracles (Steps 35 - 40)
  // =========================================================================
  {
    stepNumber: 35,
    id: 'register_feed_usdc',
    title: 'Register USDC/USD Chainlink Feed',
    phaseNumber: 4,
    phaseName: 'Chainlink Oracle Configuration',
    category: 'oracle_config',
    contractName: 'ChainlinkOracleProvider',
    type: 'CALL',
    functionName: 'registerFeed',
    description: 'Registers the live USDC/USD price feed on ChainlinkOracleProvider.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ChainlinkOracleProvider'),
      abi: DEPLOYMENT_ARTIFACTS.ChainlinkOracleProvider.abi,
      functionName: 'registerFeed',
      args: [getAssetIds(ctx.chainId).USDC, getChainFeeds(ctx.chainId).USDC_FEED, ORACLE_HEARTBEAT],
    }),
  },
  {
    stepNumber: 36,
    id: 'register_feed_cbbtc',
    title: 'Register cbBTC/USD Chainlink Feed',
    phaseNumber: 4,
    phaseName: 'Chainlink Oracle Configuration',
    category: 'oracle_config',
    contractName: 'ChainlinkOracleProvider',
    type: 'CALL',
    functionName: 'registerFeed',
    description: 'Registers the live cbBTC/USD price feed on ChainlinkOracleProvider.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ChainlinkOracleProvider'),
      abi: DEPLOYMENT_ARTIFACTS.ChainlinkOracleProvider.abi,
      functionName: 'registerFeed',
      args: [
        getAssetIds(ctx.chainId).CBBTC,
        getChainFeeds(ctx.chainId).CBBTC_FEED,
        ORACLE_HEARTBEAT,
      ],
    }),
  },
  {
    stepNumber: 37,
    id: 'register_feed_weth',
    title: 'Register ETH/USD Chainlink Feed',
    phaseNumber: 4,
    phaseName: 'Chainlink Oracle Configuration',
    category: 'oracle_config',
    contractName: 'ChainlinkOracleProvider',
    type: 'CALL',
    functionName: 'registerFeed',
    description: 'Registers the live ETH/USD price feed on ChainlinkOracleProvider.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'ChainlinkOracleProvider'),
      abi: DEPLOYMENT_ARTIFACTS.ChainlinkOracleProvider.abi,
      functionName: 'registerFeed',
      args: [getAssetIds(ctx.chainId).WETH, getChainFeeds(ctx.chainId).ETH_FEED, ORACLE_HEARTBEAT],
    }),
  },
  {
    stepNumber: 38,
    id: 'configure_asset_oracle_usdc',
    title: 'Configure USDC in OracleManager',
    phaseNumber: 4,
    phaseName: 'Chainlink Oracle Configuration',
    category: 'oracle_config',
    contractName: 'OracleManager',
    type: 'CALL',
    functionName: 'configureAsset',
    description: 'Routes USDC pricing in OracleManager to ChainlinkOracleProvider as primary.',
    expectedGasLimit: 140_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'OracleManager'),
      abi: DEPLOYMENT_ARTIFACTS.OracleManager.abi,
      functionName: 'configureAsset',
      args: [
        getAssetIds(ctx.chainId).USDC,
        getRequiredAddress(ctx.deployedContracts, 'ChainlinkOracleProvider'),
        '0x0000000000000000000000000000000000000000',
        ORACLE_HEARTBEAT,
        true,
      ],
    }),
  },
  {
    stepNumber: 39,
    id: 'configure_asset_oracle_cbbtc',
    title: 'Configure cbBTC in OracleManager',
    phaseNumber: 4,
    phaseName: 'Chainlink Oracle Configuration',
    category: 'oracle_config',
    contractName: 'OracleManager',
    type: 'CALL',
    functionName: 'configureAsset',
    description: 'Routes cbBTC pricing in OracleManager to ChainlinkOracleProvider as primary.',
    expectedGasLimit: 140_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'OracleManager'),
      abi: DEPLOYMENT_ARTIFACTS.OracleManager.abi,
      functionName: 'configureAsset',
      args: [
        getAssetIds(ctx.chainId).CBBTC,
        getRequiredAddress(ctx.deployedContracts, 'ChainlinkOracleProvider'),
        '0x0000000000000000000000000000000000000000',
        ORACLE_HEARTBEAT,
        true,
      ],
    }),
  },
  {
    stepNumber: 40,
    id: 'configure_asset_oracle_weth',
    title: 'Configure WETH in OracleManager',
    phaseNumber: 4,
    phaseName: 'Chainlink Oracle Configuration',
    category: 'oracle_config',
    contractName: 'OracleManager',
    type: 'CALL',
    functionName: 'configureAsset',
    description: 'Routes WETH pricing in OracleManager to ChainlinkOracleProvider as primary.',
    expectedGasLimit: 140_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'OracleManager'),
      abi: DEPLOYMENT_ARTIFACTS.OracleManager.abi,
      functionName: 'configureAsset',
      args: [
        getAssetIds(ctx.chainId).WETH,
        getRequiredAddress(ctx.deployedContracts, 'ChainlinkOracleProvider'),
        '0x0000000000000000000000000000000000000000',
        ORACLE_HEARTBEAT,
        true,
      ],
    }),
  },

  // =========================================================================
  // PHASE 5: Register Assets in Vault & Treasury (Steps 41 - 46)
  // =========================================================================
  {
    stepNumber: 41,
    id: 'vault_register_usdc',
    title: 'Register USDC in CustodyVault',
    phaseNumber: 5,
    phaseName: 'Asset Registration',
    category: 'asset_registration',
    contractName: 'CustodyVault',
    type: 'CALL',
    functionName: 'registerAsset',
    description: 'Registers USDC collateral token (6 decimals) in CustodyVault.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CustodyVault'),
      abi: DEPLOYMENT_ARTIFACTS.CustodyVault.abi,
      functionName: 'registerAsset',
      args: [getChainAssets(ctx.chainId).USDC, 6],
    }),
  },
  {
    stepNumber: 42,
    id: 'vault_register_cbbtc',
    title: 'Register cbBTC in CustodyVault',
    phaseNumber: 5,
    phaseName: 'Asset Registration',
    category: 'asset_registration',
    contractName: 'CustodyVault',
    type: 'CALL',
    functionName: 'registerAsset',
    description: 'Registers cbBTC strategy asset token (8 decimals) in CustodyVault.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CustodyVault'),
      abi: DEPLOYMENT_ARTIFACTS.CustodyVault.abi,
      functionName: 'registerAsset',
      args: [getChainAssets(ctx.chainId).CBBTC, 8],
    }),
  },
  {
    stepNumber: 43,
    id: 'vault_register_weth',
    title: 'Register WETH in CustodyVault',
    phaseNumber: 5,
    phaseName: 'Asset Registration',
    category: 'asset_registration',
    contractName: 'CustodyVault',
    type: 'CALL',
    functionName: 'registerAsset',
    description: 'Registers WETH strategy asset token (18 decimals) in CustodyVault.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CustodyVault'),
      abi: DEPLOYMENT_ARTIFACTS.CustodyVault.abi,
      functionName: 'registerAsset',
      args: [getChainAssets(ctx.chainId).WETH, 18],
    }),
  },
  {
    stepNumber: 44,
    id: 'treasury_register_usdc',
    title: 'Register USDC in Treasury',
    phaseNumber: 5,
    phaseName: 'Asset Registration',
    category: 'asset_registration',
    contractName: 'Treasury',
    type: 'CALL',
    functionName: 'registerAsset',
    description: 'Registers USDC fee asset token (6 decimals) in Treasury.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'Treasury'),
      abi: DEPLOYMENT_ARTIFACTS.Treasury.abi,
      functionName: 'registerAsset',
      args: [getChainAssets(ctx.chainId).USDC, 6],
    }),
  },
  {
    stepNumber: 45,
    id: 'treasury_register_cbbtc',
    title: 'Register cbBTC in Treasury',
    phaseNumber: 5,
    phaseName: 'Asset Registration',
    category: 'asset_registration',
    contractName: 'Treasury',
    type: 'CALL',
    functionName: 'registerAsset',
    description: 'Registers cbBTC fee asset token (8 decimals) in Treasury.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'Treasury'),
      abi: DEPLOYMENT_ARTIFACTS.Treasury.abi,
      functionName: 'registerAsset',
      args: [getChainAssets(ctx.chainId).CBBTC, 8],
    }),
  },
  {
    stepNumber: 46,
    id: 'treasury_register_weth',
    title: 'Register WETH in Treasury',
    phaseNumber: 5,
    phaseName: 'Asset Registration',
    category: 'asset_registration',
    contractName: 'Treasury',
    type: 'CALL',
    functionName: 'registerAsset',
    description: 'Registers WETH fee asset token (18 decimals) in Treasury.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'Treasury'),
      abi: DEPLOYMENT_ARTIFACTS.Treasury.abi,
      functionName: 'registerAsset',
      args: [getChainAssets(ctx.chainId).WETH, 18],
    }),
  },

  // =========================================================================
  // PHASE 6: Controller Default Slippage (Step 47)
  // =========================================================================
  {
    stepNumber: 47,
    id: 'controller_set_slippage',
    title: 'Set Default Swap Slippage (1.00%)',
    phaseNumber: 6,
    phaseName: 'Controller Parameter Configuration',
    category: 'controller_config',
    contractName: 'UnifyVaultController',
    type: 'CALL',
    functionName: 'setSwapSlippageBps',
    description:
      'Configures standard swap slippage tolerance to 100 BPS (1.00%) on UnifyVaultController.',
    expectedGasLimit: 80_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      abi: DEPLOYMENT_ARTIFACTS.UnifyVaultController.abi,
      functionName: 'setSwapSlippageBps',
      args: [CONTROLLER_SLIPPAGE_BPS],
    }),
  },

  // =========================================================================
  // PHASE 7: Access Control Roles (Steps 48 - 53)
  // =========================================================================
  {
    stepNumber: 48,
    id: 'grant_role_vault',
    title: 'Grant CONTROLLER_ROLE on CustodyVault',
    phaseNumber: 7,
    phaseName: 'Access Control & Authorization',
    category: 'access_control',
    contractName: 'CustodyVault',
    type: 'CALL',
    functionName: 'grantRole',
    description: 'Authorizes UnifyVaultController to deposit/withdraw collateral in CustodyVault.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CustodyVault'),
      abi: DEPLOYMENT_ARTIFACTS.CustodyVault.abi,
      functionName: 'grantRole',
      args: [
        ACCESS_ROLES.CONTROLLER_ROLE,
        getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      ],
    }),
  },
  {
    stepNumber: 49,
    id: 'grant_role_treasury',
    title: 'Grant CONTROLLER_ROLE on Treasury',
    phaseNumber: 7,
    phaseName: 'Access Control & Authorization',
    category: 'access_control',
    contractName: 'Treasury',
    type: 'CALL',
    functionName: 'grantRole',
    description: 'Authorizes UnifyVaultController to interact with Treasury assets.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'Treasury'),
      abi: DEPLOYMENT_ARTIFACTS.Treasury.abi,
      functionName: 'grantRole',
      args: [
        ACCESS_ROLES.CONTROLLER_ROLE,
        getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      ],
    }),
  },
  {
    stepNumber: 50,
    id: 'grant_role_liquidity_manager',
    title: 'Grant CONTROLLER_ROLE on LiquidityManager',
    phaseNumber: 7,
    phaseName: 'Access Control & Authorization',
    category: 'access_control',
    contractName: 'LiquidityManager',
    type: 'CALL',
    functionName: 'grantRole',
    description: 'Authorizes UnifyVaultController to execute rebalancing and liquidity swaps.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'LiquidityManager'),
      abi: DEPLOYMENT_ARTIFACTS.LiquidityManager.abi,
      functionName: 'grantRole',
      args: [
        ACCESS_ROLES.CONTROLLER_ROLE,
        getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      ],
    }),
  },
  {
    stepNumber: 51,
    id: 'grant_role_token',
    title: 'Grant CONTROLLER_ROLE on UVBE Token',
    phaseNumber: 7,
    phaseName: 'Access Control & Authorization',
    category: 'access_control',
    contractName: 'UVBEV2',
    type: 'CALL',
    functionName: 'grantRole',
    description: 'Authorizes UnifyVaultController to mint and burn UVBE index shares on demand.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'UVBEV2'),
      abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
      functionName: 'grantRole',
      args: [
        ACCESS_ROLES.CONTROLLER_ROLE,
        getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      ],
    }),
  },
  {
    stepNumber: 52,
    id: 'grant_role_cost_basis_manager',
    title: 'Grant CONTROLLER_ROLE on CostBasisManager',
    phaseNumber: 7,
    phaseName: 'Access Control & Authorization',
    category: 'access_control',
    contractName: 'CostBasisManagerV2',
    type: 'CALL',
    functionName: 'grantRole',
    description:
      'Authorizes UnifyVaultController to record user acquisition costs during deposits.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'CostBasisManagerV2'),
      abi: DEPLOYMENT_ARTIFACTS.CostBasisManagerV2.abi,
      functionName: 'grantRole',
      args: [
        ACCESS_ROLES.CONTROLLER_ROLE,
        getRequiredAddress(ctx.deployedContracts, 'UnifyVaultController'),
      ],
    }),
  },
  {
    stepNumber: 53,
    id: 'revoke_deployer_token_controller',
    title: 'Revoke CONTROLLER_ROLE from Deployer on UVBE Token',
    phaseNumber: 7,
    phaseName: 'Access Control & Authorization',
    category: 'access_control',
    contractName: 'UVBEV2',
    type: 'CALL',
    functionName: 'revokeRole',
    description:
      'Crucial security step: Deployer revokes direct mint/burn authority from self, enforcing controller-only minting.',
    expectedGasLimit: 70_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'UVBEV2'),
      abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
      functionName: 'revokeRole',
      args: [ACCESS_ROLES.CONTROLLER_ROLE, ctx.deployerAddress],
    }),
  },
  // =========================================================================
  // PHASE 8: Marketplace Deployment & Configuration (Steps 54 - 55)
  // =========================================================================
  {
    stepNumber: 54,
    id: 'deploy_marketplace',
    title: 'Deploy Marketplace',
    phaseNumber: 8,
    phaseName: 'Marketplace Deployment',
    category: 'marketplace',
    contractName: 'Marketplace',
    type: 'DEPLOY',
    functionName: 'constructor',
    description:
      'Deploys the non-custodial P2P Marketplace order book connected to fresh P2PEscrowV2 with caller as admin & governance.',
    expectedGasLimit: 3_000_000n,
    getExecutionData: (ctx) => ({
      type: 'DEPLOY',
      abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
      bytecode: DEPLOYMENT_ARTIFACTS.Marketplace.bytecode,
      args: [getRequiredAddress(ctx.deployedContracts, 'P2PEscrowV2')],
    }),
  },
  {
    stepNumber: 55,
    id: 'set_marketplace_uvbe_token',
    title: 'Configure UVBE Token on Marketplace',
    phaseNumber: 8,
    phaseName: 'Marketplace Deployment',
    category: 'marketplace',
    contractName: 'Marketplace',
    type: 'CALL',
    functionName: 'setUvbeToken',
    description:
      'Wires canonical fresh UVBEV2 token to Marketplace for strict non-custodial asset validation.',
    expectedGasLimit: 100_000n,
    getExecutionData: (ctx) => ({
      type: 'CALL',
      targetAddress: getRequiredAddress(ctx.deployedContracts, 'Marketplace'),
      abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
      functionName: 'setUvbeToken',
      args: [getRequiredAddress(ctx.deployedContracts, 'UVBEV2')],
    }),
  },
];
