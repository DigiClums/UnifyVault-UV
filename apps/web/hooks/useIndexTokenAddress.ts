import { useReadContract } from 'wagmi';
import { getContractAddresses } from '../lib/config/contracts';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/config/abis';
import { useNetwork } from './useNetwork';

export const INDEX_TOKEN_KEY =
  '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8' as const;

export function useIndexTokenAddress() {
  const { chainId } = useNetwork();
  const addresses = getContractAddresses(chainId || 84532);

  const {
    data: indexTokenAddress,
    isLoading,
    error,
  } = useReadContract({
    address: addresses.directory,
    abi: PROTOCOL_DIRECTORY_ABI,
    functionName: 'getAddress',
    args: [INDEX_TOKEN_KEY],
    query: {
      enabled: !!addresses.directory,
      staleTime: Infinity,
    },
  });

  return {
    indexTokenAddress: indexTokenAddress as `0x${string}` | undefined,
    isLoading,
    error,
  };
}
