import { type WalletClient } from 'viem';
import type { CheckoutSigner, CurrencyOption, P2PTheme } from '@p2pdotme/widgets';
import {
  createLocalStorageRelayStore,
  createRelayIdentity,
  type RelayIdentity,
} from '@p2pdotme/sdk/orders';

export interface P2PNetworkConfig {
  chainId: number;
  chainName: string;
  diamondAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  subgraphUrl: string;
  isTestnet: boolean;
  isSupported: boolean;
  blockExplorerUrl: string;
}

/**
 * Base Sepolia (84532) Authoritative Configuration
 */
export const P2P_BASE_SEPOLIA_CONFIG: P2PNetworkConfig = {
  chainId: 84532,
  chainName: 'Base Sepolia',
  diamondAddress: (process.env.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS_SEPOLIA ||
    process.env.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS ||
    '0xeb0BB8E3c014D915D9B2df03aBB130a1Fb44beb9') as `0x${string}`,
  usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA ||
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
  subgraphUrl:
    process.env.NEXT_PUBLIC_P2P_SUBGRAPH_URL_SEPOLIA ||
    'https://api.studio.thegraph.com/query/48434/p2p-base-sepolia/version/latest',
  isTestnet: true,
  isSupported: true,
  blockExplorerUrl: 'https://sepolia.basescan.org',
};

/**
 * Base Mainnet (8453) Authoritative Configuration
 */
export const P2P_BASE_MAINNET_CONFIG: P2PNetworkConfig = {
  chainId: 8453,
  chainName: 'Base Mainnet',
  diamondAddress: (process.env.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS_MAINNET ||
    process.env.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS ||
    '0xeb0BB8E3c014D915D9B2df03aBB130a1Fb44beb9') as `0x${string}`,
  usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS_MAINNET ||
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`,
  subgraphUrl:
    process.env.NEXT_PUBLIC_P2P_SUBGRAPH_URL_MAINNET ||
    process.env.NEXT_PUBLIC_P2P_SUBGRAPH_URL ||
    'https://api.studio.thegraph.com/query/48434/p2p-base/version/latest',
  isTestnet: false,
  isSupported: true,
  blockExplorerUrl: 'https://basescan.org',
};

/**
 * Dynamically resolves P2P network configuration by chain ID
 */
export function resolveP2PNetworkConfig(chainId?: number): P2PNetworkConfig {
  if (chainId === 84532) {
    return P2P_BASE_SEPOLIA_CONFIG;
  }
  if (chainId === 8453) {
    return P2P_BASE_MAINNET_CONFIG;
  }
  // Default to Base Sepolia on testnet environments, or Base Mainnet
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? P2P_BASE_SEPOLIA_CONFIG : P2P_BASE_MAINNET_CONFIG;
}

export const P2P_ME_CONFIG = resolveP2PNetworkConfig();

/**
 * Global supported currencies with payment methods
 */
export const SUPPORTED_P2P_CURRENCIES: CurrencyOption[] = [
  {
    symbol: 'INR',
    flag: '🇮🇳',
    paymentMethod: 'UPI',
    country: 'India',
    symbolNative: '₹',
  },
  {
    symbol: 'BRL',
    flag: '🇧🇷',
    paymentMethod: 'PIX',
    country: 'Brazil',
    symbolNative: 'R$',
  },
  {
    symbol: 'MXN',
    flag: '🇲🇽',
    paymentMethod: 'SPEI',
    country: 'Mexico',
    symbolNative: '$',
  },
  {
    symbol: 'IDR',
    flag: '🇮🇩',
    paymentMethod: 'QRIS',
    country: 'Indonesia',
    symbolNative: 'Rp',
  },
];

/**
 * Adapts Viem/Wagmi WalletClient to P2P.me CheckoutSigner interface
 */
export function createCheckoutSigner(
  walletClient: WalletClient | undefined | null,
  userAddress: `0x${string}` | undefined | null,
): CheckoutSigner | null {
  if (!walletClient || !userAddress) {
    return null;
  }

  return {
    address: userAddress,
    sendTransaction: async (tx: { to: `0x${string}`; data: `0x${string}`; gasLimit?: number }) => {
      const hash = await walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
        account: userAddress,
        chain: walletClient.chain,
      });
      return { hash };
    },
    signMessage: async (message: string) => {
      return await walletClient.signMessage({
        account: userAddress,
        message,
      });
    },
    signerAddress: userAddress,
  };
}

/**
 * Creates a wallet-scoped local storage relay store
 */
export function createWalletScopedRelayStore(userAddress?: string) {
  const normalizedKey = userAddress
    ? `@P2PME:RELAY_IDENTITY:${userAddress.toLowerCase()}`
    : '@P2PME:RELAY_IDENTITY:DEFAULT';
  return createLocalStorageRelayStore({ key: normalizedKey });
}

/**
 * Gets or creates the local browser relay identity for end-to-end encrypted payment details,
 * scoped by user wallet address to prevent key collision between accounts.
 */
export async function getOrCreateRelayIdentity(userAddress?: string): Promise<RelayIdentity> {
  const store = createWalletScopedRelayStore(userAddress);
  let identity = await store.get();
  if (!identity) {
    identity = createRelayIdentity();
    await store.set(identity);
  }
  return identity;
}

/**
 * UnifyVault Brand Theme for P2P.me Widgets
 */
export const UNIFYVAULT_P2P_THEME: P2PTheme = {
  colors: {
    bg: '#0A0A0A',
    surfaceAlt: '#141414',
    fg: '#FFFFFF',
    muted: '#A0A0A0',
    border: '#2A2A2A',
    accent: '#BFFF00',
    accentFg: '#000000',
    success: '#10B981',
    danger: '#EF4444',
  },
  radii: {
    modal: 16,
    button: 12,
  },
  font: 'inherit',
};
