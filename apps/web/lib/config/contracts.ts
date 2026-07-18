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

export const getContractAddresses = (chainId: number) => {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    return CONTRACT_ADDRESSES[baseSepolia.id]; // Fallback to Sepolia for safety
  }
  return addresses;
};
