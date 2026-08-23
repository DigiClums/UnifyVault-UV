/**
 * freshBaseMainnetSequence.ts
 *
 * Production deployment engine for Base Mainnet ONLY.
 * Chain ID: 8453
 *
 * SAFETY: This file MUST NOT be used for Sepolia testnet deployment.
 * Use freshBaseSepoliaSequence.ts for testnet.
 *
 * Architecture:
 *   - All steps require explicit governance wallet confirmation.
 *   - Protocol safety gate rejects any attempt to target a non-8453 chain.
 *   - Every privileged transaction must be signed by the governance wallet.
 */

import { DEPLOYMENT_ARTIFACTS } from './generatedArtifacts';
import type { DeploymentStepDefinition, DeploymentContext } from './types';

// ============================================================================
// PRODUCTION CHAIN CONSTANT — DO NOT CHANGE
// ============================================================================
export const BASE_MAINNET_CHAIN_ID = 8453;

/**
 * MAINNET PRODUCTION SAFETY GATE
 * Call this before executing any deployment step.
 * Throws hard if the connected wallet is not on Base Mainnet (chainId 8453).
 */
export function assertBaseMainnet(chainId: number): void {
  if (chainId !== BASE_MAINNET_CHAIN_ID) {
    throw new Error(
      `MAINNET DEPLOYMENT REQUIRES BASE CHAIN 8453.\n` +
        `Connected chainId: ${chainId}.\n` +
        `Switch your wallet to Base Mainnet before proceeding.`,
    );
  }
}

// ============================================================================
// LIVE BASE MAINNET CANONICAL ADDRESSES
// (Read-only reference — do not redeploy unless explicitly required)
// ============================================================================
export const MAINNET_LIVE_CONTRACTS = {
  ProtocolDirectory: '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e' as `0x${string}`,
  UnifyVaultController: '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366' as `0x${string}`,
  CustodyVault: '0xbb35a3434c689942e0b7d58909eae0d2cc0769ca' as `0x${string}`,
  Treasury: '0x57561F781b2f558A7445D2E93a365C03BA2c9B53' as `0x${string}`,
  OracleManager: '0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7' as `0x${string}`,
  StrategyManager: '0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a' as `0x${string}`,
  PortfolioManager: '0x66182f56bd5e523c655f6890290ab519f528e83f' as `0x${string}`,
  UVBEToken: '0xd2715141a0f5998b707baa963990bfc2e94cf145' as `0x${string}`,
  SwapAdapter: '0x5b6067982c6cce2dc760eb4731c1b40136776d4a' as `0x${string}`, // PENDING UPGRADE
  LiquidityManager: '0x9af86a9ac1563b7fdbf43b19335348240a8c16d3' as `0x${string}`,
  CostBasisManagerV2: '0x27b5c6dea90678b78856b0b10dba37a789fde97e' as `0x${string}`,
  PerformanceManager: '0x19ec1b685c2ced1400b4f249da6be89662e59473' as `0x${string}`,
  P2PEscrowV2: '0xa938aacea64be8f41c90960aff232da4df7fc329' as `0x${string}`,
  Marketplace: '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6' as `0x${string}`,
};

// ============================================================================
// LIVE BASE MAINNET TOKEN & FEED ADDRESSES
// ============================================================================
export const BASE_MAINNET_ASSETS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // 6 decimals
  CBBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as `0x${string}`, // 8 decimals
  WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`, // 18 decimals
};

export const BASE_MAINNET_FEEDS = {
  USDC_FEED: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B' as `0x${string}`, // USDC/USD
  CBBTC_FEED: '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F' as `0x${string}`, // cbBTC/USD
  ETH_FEED: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' as `0x${string}`, // ETH/USD
};

export const BASE_MAINNET_UNISWAP_V3_ROUTER =
  '0x2626664c2603336E57B271c5C0b26F421741e481' as `0x${string}`;

// ============================================================================
// STRATEGY CONFIGURATION
// ============================================================================
export const CBBTC_WEIGHT_BPS = 6000n; // 60%
export const WETH_WEIGHT_BPS = 4000n; // 40%
export const CONTROLLER_SLIPPAGE_BPS = 100n; // 1.00%
export const ORACLE_HEARTBEAT = 86400; // 24 hours

// ============================================================================
// MODULE IDs (matching ModuleIds.sol on-chain)
// ============================================================================
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
};

// ============================================================================
// ACCESS ROLES (matching AccessRoles.sol on-chain)
// ============================================================================
export const ACCESS_ROLES = {
  DEFAULT_ADMIN_ROLE:
    '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
  GOVERNANCE_ROLE:
    '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1' as `0x${string}`,
  CONTROLLER_ROLE:
    '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357' as `0x${string}`,
  MINTER_ROLE:
    '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6' as `0x${string}`,
  BURNER_ROLE:
    '0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848' as `0x${string}`,
};

/**
 * PHASE 3 — SwapAdapter Upgrade Sequence (Mainnet Only)
 *
 * Use this sequence ONLY when the new SwapAdapter has been:
 * 1. Tested and verified with a local fork simulation
 * 2. Audited by governance
 * 3. Approved for production deployment
 *
 * Each step must be signed by the governance wallet. No automated execution.
 */
export const MAINNET_SWAP_ADAPTER_UPGRADE_STEPS: DeploymentStepDefinition[] = [
  {
    stepNumber: 1,
    id: 'deploy_new_swap_adapter',
    title: 'Deploy New SwapAdapter (fee=500)',
    phaseNumber: 1,
    phaseName: 'SwapAdapter Upgrade',
    category: 'core_contracts',
    contractName: 'SwapAdapter',
    type: 'DEPLOY',
    functionName: 'constructor',
    description:
      'Deploys the new configurable-fee SwapAdapter. Default fee=500 for USDC/WETH and USDC/cbBTC. Router is immutable.',
    expectedGasLimit: 2_500_000n,
    getExecutionData: (ctx) => {
      assertBaseMainnet(ctx.chainId || 0);
      const admin = (ctx.adminAddress || MAINNET_LIVE_CONTRACTS.DeployerAdmin) as `0x${string}`;
      return {
        type: 'DEPLOY',
        abi: DEPLOYMENT_ARTIFACTS.SwapAdapter.abi,
        bytecode: DEPLOYMENT_ARTIFACTS.SwapAdapter.bytecode,
        args: [admin, BASE_MAINNET_UNISWAP_V3_ROUTER],
      };
    },
  },
  {
    stepNumber: 2,
    id: 'register_new_swap_adapter',
    title: 'Register New SwapAdapter in ProtocolDirectory',
    phaseNumber: 1,
    phaseName: 'SwapAdapter Upgrade',
    category: 'directory_registration',
    contractName: 'ProtocolDirectory',
    type: 'CALL',
    functionName: 'updateAddress',
    description:
      'Updates ProtocolDirectory SWAP_ADAPTER binding to the newly deployed SwapAdapter.',
    expectedGasLimit: 80_000n,
    getExecutionData: (ctx) => {
      assertBaseMainnet(ctx.chainId || 0);
      const newSwapAdapter = ctx.deployedContracts.SwapAdapter;
      if (!newSwapAdapter) throw new Error('SwapAdapter not deployed yet. Run step 1 first.');
      return {
        type: 'CALL',
        targetAddress: MAINNET_LIVE_CONTRACTS.ProtocolDirectory,
        abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory?.abi || [],
        functionName: 'updateAddress',
        args: [MODULE_IDS.SWAP_ADAPTER, newSwapAdapter],
      };
    },
  },
  {
    stepNumber: 3,
    id: 'grant_controller_role_swap_adapter',
    title: 'Grant CONTROLLER_ROLE to New SwapAdapter on Token',
    phaseNumber: 1,
    phaseName: 'SwapAdapter Upgrade',
    category: 'access_control',
    contractName: 'UnifyVaultController',
    type: 'CALL',
    functionName: 'N/A — verify via ProtocolDirectory resolution',
    description:
      'Verify the Controller can resolve the new SwapAdapter via ProtocolDirectory. No separate role grant needed — Controller calls SwapAdapter by address from directory.',
    expectedGasLimit: 0n,
    getExecutionData: (_ctx) => {
      throw new Error(
        'Step 3 is a verification step only. No transaction required. ' +
          'Confirm via cast call that ProtocolDirectory.getAddress(SWAP_ADAPTER) returns the new address.',
      );
    },
  },
];
