import { base } from 'viem/chains';

/**
 * Base Mainnet Production Chain Configuration
 * Enforces fail-fast validation for production mainnet deployments.
 */
export const ACTIVE_CHAIN_NAME = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'base';

if (ACTIVE_CHAIN_NAME !== 'base' && ACTIVE_CHAIN_NAME !== '8453') {
  throw new Error(
    `[PRODUCTION CONFIGURATION ERROR] Invalid NEXT_PUBLIC_ACTIVE_CHAIN: "${ACTIVE_CHAIN_NAME}". ` +
      `Base Mainnet production builds must set NEXT_PUBLIC_ACTIVE_CHAIN to "base" or "8453".`,
  );
}

export const CHAIN_CONFIG = base;

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://app.unifyvault.xyz';

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://mainnet.base.org';

const rawDirectoryAddress =
  process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET ||
  process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS ||
  '';

export const PROTOCOL_DIRECTORY_ADDRESS = ((): `0x${string}` => {
  if (
    !rawDirectoryAddress ||
    rawDirectoryAddress === '0x0000000000000000000000000000000000000000' ||
    !/^0x[a-fA-F0-9]{40}$/.test(rawDirectoryAddress)
  ) {
    // In build/test environment where env vars are mocked, fallback gracefully or throw when executing
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
      console.warn(
        '[PRODUCTION WARNING] NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET is not set. Dynamic module resolution requires a valid deployed ProtocolDirectory address.',
      );
    }
    return (rawDirectoryAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`;
  }
  return rawDirectoryAddress as `0x${string}`;
})();

/**
 * Base Mainnet Core ERC20 Tokens
 */
export const MAINNET_TOKENS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as `0x${string}`,
  WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`,
};

/**
 * Standard Protocol Module Keys (bytes32 keccak256 identifiers)
 */
export const MODULE_IDS = {
  ORACLE: '0x3b1ee6ca4eeb9c6ad6673eb8932bf5a92a549d443c7b643a6d9b925b6a715f5d' as `0x${string}`,
  VAULT: '0x15ee1728eb7c4f4efb70fa67f13b632007e2a4a3bc6c3b6bf11b0e3532f7a08b' as `0x${string}`,
  TREASURY: '0x42a0b181b5b47a95015a97576f3f019f187a5525c2763261a8ef1f22146440db' as `0x${string}`,
  TOKEN: '0xbf7ebaa000c0a9fa93e2b9c7b9bc976865239a5f782c5f0f35be9a6bb7c30d3d' as `0x${string}`,
  STRATEGY_MANAGER:
    '0xc0953efdd70ee7b3096b7bb7b98bf5a04a6015b630e2f5b610c14b7e1ec9560f' as `0x${string}`,
  PORTFOLIO_MANAGER:
    '0x6e9f291e1d3550fa070dd47d79b90cbf6e60b296b1b53e8e19e0b190fbd455f5' as `0x${string}`,
  SWAP_ADAPTER:
    '0xb231c51000cf51a99a8ea4b2049d5bf92361b7f94bb4979e2a4666cf76595a8f' as `0x${string}`,
  FEE_MANAGER:
    '0xb386ebf492bf5541e21b8c638202d0cfceb3a0e67611e9f1a0e1c07153a5df65' as `0x${string}`,
  COST_BASIS_MANAGER:
    '0xb4e1b8b7e2dfa9a3b8d4c38d8d75e47854bc67c00e6c46698650f00f074d2847' as `0x${string}`,
  CONTROLLER: '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
};

export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
export const GUARDIAN_ROLE =
  '0x5543555f475541524449414e5f524f4c45000000000000000000000000000000' as `0x${string}`;
export const TIMELOCK_ROLE =
  '0x5543555f54494d454c4f434b5f524f4c45000000000000000000000000000000' as `0x${string}`;
