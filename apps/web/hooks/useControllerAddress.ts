import { useReadContract } from 'wagmi';
import { getContractAddresses } from '../lib/config/contracts';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/config/abis';
import { useNetwork } from './useNetwork';

// DepositManager keccak256 hash constant
export const DEPOSIT_MANAGER_KEY =
  '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as const;

export function useControllerAddress() {
  const { chainId } = useNetwork();
  const addresses = getContractAddresses(chainId || 84532);

  const {
    data: controllerAddress,
    isLoading,
    error,
  } = useReadContract({
    address: addresses.directory,
    abi: PROTOCOL_DIRECTORY_ABI,
    functionName: 'getAddress',
    args: [DEPOSIT_MANAGER_KEY],
    query: {
      enabled: !!addresses.directory,
      staleTime: Infinity, // Canonical module addresses change very rarely
    },
  });

  return {
    controllerAddress: controllerAddress as `0x${string}` | undefined,
    isLoading,
    error,
  };
}
