import { env } from './env';
import { base, baseSepolia } from 'wagmi/chains';

export const CONTRACT_ADDRESSES: Record<number, { directory: `0x${string}` }> = {
  [base.id]: {
    directory: env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET as `0x${string}`,
  },
  [baseSepolia.id]: {
    directory: env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA as `0x${string}`,
  },
};

/**
 * Returns contract addresses for the given chain ID.
 * Throws an error for unsupported chains — never silently falls back.
 */
export const getContractAddresses = (chainId: number) => {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(
      `No contract addresses configured for chain ID ${chainId}. ` +
        `Supported chains: ${Object.keys(CONTRACT_ADDRESSES).join(', ')}. ` +
        `Ensure NEXT_PUBLIC_DIRECTORY_ADDRESS_* environment variables are set correctly.`,
    );
  }
  return addresses;
};
