import { useReadContracts } from 'wagmi';
import { getContractAddresses } from '../lib/config/contracts';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/config/abis';
import { useNetwork } from './useNetwork';

export const DEPOSIT_MANAGER_KEY =
  '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as const;
export const INDEX_TOKEN_KEY =
  '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8' as const;
export const VAULT_KEY =
  '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640' as const;

export function useProtocolDirectoryAddresses() {
  const { chainId } = useNetwork();
  const addresses = getContractAddresses(chainId || 84532);

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: addresses.directory,
        abi: PROTOCOL_DIRECTORY_ABI,
        functionName: 'getAddress',
        args: [DEPOSIT_MANAGER_KEY],
      },
      {
        address: addresses.directory,
        abi: PROTOCOL_DIRECTORY_ABI,
        functionName: 'getAddress',
        args: [INDEX_TOKEN_KEY],
      },
      {
        address: addresses.directory,
        abi: PROTOCOL_DIRECTORY_ABI,
        functionName: 'getAddress',
        args: [VAULT_KEY],
      },
    ],
    query: {
      enabled: !!addresses.directory,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  });

  const [controllerRes, tokenRes, vaultRes] = data || [];

  return {
    controllerAddress:
      controllerRes?.status === 'success' ? (controllerRes.result as `0x${string}`) : undefined,
    indexTokenAddress:
      tokenRes?.status === 'success' ? (tokenRes.result as `0x${string}`) : undefined,
    vaultAddress: vaultRes?.status === 'success' ? (vaultRes.result as `0x${string}`) : undefined,
    isLoading,
    error,
  };
}
