import { useReadContract } from 'wagmi';
import { getContractAddresses } from '../lib/config/contracts';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/config/abis';
import { useNetwork } from './useNetwork';

// CustodyVault keccak256 hash constant: keccak256('CustodyVault')
export const VAULT_KEY =
  '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640' as const;

export function useVaultAddress() {
  const { chainId } = useNetwork();
  const addresses = getContractAddresses(chainId || 84532);

  const {
    data: vaultAddress,
    isLoading,
    error,
  } = useReadContract({
    address: addresses.directory,
    abi: PROTOCOL_DIRECTORY_ABI,
    functionName: 'getAddress',
    args: [VAULT_KEY],
    query: {
      enabled: !!addresses.directory,
      staleTime: Infinity,
    },
  });

  return {
    vaultAddress: vaultAddress as `0x${string}` | undefined,
    isLoading,
    error,
  };
}
