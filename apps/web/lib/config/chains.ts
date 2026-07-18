import { base, baseSepolia } from 'wagmi/chains';
import { env } from './env';

export const SUPPORTED_CHAINS = [
  {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: { http: [env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET] },
      public: { http: [env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET] },
    },
  },
  {
    ...baseSepolia,
    rpcUrls: {
      ...baseSepolia.rpcUrls,
      default: { http: [env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA] },
      public: { http: [env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA] },
    },
  },
] as const;

export const ACTIVE_CHAIN =
  env.NEXT_PUBLIC_ACTIVE_CHAIN === 'base' || env.NEXT_PUBLIC_ACTIVE_CHAIN === '8453'
    ? SUPPORTED_CHAINS[0]
    : SUPPORTED_CHAINS[1];

export const DEFAULT_CHAIN = ACTIVE_CHAIN;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]['id'];
