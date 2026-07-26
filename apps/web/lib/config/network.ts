import { base, baseSepolia } from 'wagmi/chains';
import { env } from './env';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

// ---------------------------------------------------------------------------
// Token Addresses — single source of truth for all networks
// ---------------------------------------------------------------------------

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  address: `0x${string}`;
}

const TOKENS_BY_CHAIN: Record<number, TokenConfig[]> = {
  [base.id]: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    {
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      decimals: 8,
      address: '0xcbB7C66D6425AFE9A8804f7a6621967e50c6020',
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      address: '0x4200000000000000000000000000000000000006',
    },
  ],
  [baseSepolia.id]: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    {
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      decimals: 8,
      address: '0x5026795198b4414C086e6cf9AafeBC99a6eC5a8b',
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      address: '0x0405E37fe8dCDD720A47fB5F3473914862385271',
    },
  ],
};

// ---------------------------------------------------------------------------
// Chain Helpers
// ---------------------------------------------------------------------------

/** Returns true when chainId matches Base Mainnet (8453). */
export function isMainnet(chainId: number | undefined): boolean {
  return chainId === base.id;
}

/** Returns true when chainId is a supported chain. */
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId);
}

/**
 * Resolves the active default chain from environment configuration.
 * Returns the wagmi chain object; falls back to baseSepolia for safety.
 */
export function getDefaultChainId(): SupportedChainId {
  if (env.NEXT_PUBLIC_ACTIVE_CHAIN === 'base' || env.NEXT_PUBLIC_ACTIVE_CHAIN === '8453') {
    return base.id;
  }
  return baseSepolia.id;
}

// ---------------------------------------------------------------------------
// Token Lookup Helpers
// ---------------------------------------------------------------------------

/** Returns all tokens configured for a given chain. */
export function getTokens(chainId: number): TokenConfig[] {
  return TOKENS_BY_CHAIN[chainId] ?? TOKENS_BY_CHAIN[baseSepolia.id];
}

/** Returns a specific token address by symbol for a given chain. */
export function getTokenAddress(chainId: number, symbol: string): `0x${string}` {
  const tokens = getTokens(chainId);
  const token = tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
  if (!token) {
    // On unsupported chains, fall back to Sepolia config to avoid crashes
    const fallback = TOKENS_BY_CHAIN[baseSepolia.id].find(
      (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
    );
    if (fallback) return fallback.address;
    throw new Error(`Token "${symbol}" not found in network configuration for chain ${chainId}`);
  }
  return token.address;
}

// ---------------------------------------------------------------------------
// Display Helpers
// ---------------------------------------------------------------------------

/** Returns a human-readable chain label for display. */
export function getChainLabel(chainId: number | undefined): string {
  if (chainId === base.id) return `Base Mainnet (${base.id})`;
  if (chainId === baseSepolia.id) return `Base Sepolia (${baseSepolia.id})`;
  return `Unknown Network (${chainId ?? 'N/A'})`;
}

/** Returns the block explorer base URL for a chain. */
export function getExplorerBaseUrl(chainId: number | undefined): string {
  if (chainId === base.id) return 'https://basescan.org';
  return 'https://sepolia.basescan.org';
}
