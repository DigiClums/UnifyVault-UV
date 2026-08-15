'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { useProtocolDirectory } from './useProtocolDirectory';
import { DEFAULT_ADMIN_ROLE } from '../constants';
import { ACCESS_CONTROL_ABI } from '../lib/contracts/directory';

export interface AdminAccessResult {
  isAdmin: boolean;
  isLoading: boolean;
  isConnected: boolean;
  address?: `0x${string}`;
}

/**
 * On-chain AccessControl Hook
 * Verifies whether the connected address holds DEFAULT_ADMIN_ROLE on ProtocolDirectory, Controller, or Treasury.
 */
export function useAdminAccess(): AdminAccessResult {
  const { address, isConnected } = useAccount();
  const { directory, controller, treasury } = useProtocolDirectory();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: directory,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
      {
        address: controller,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
      {
        address: treasury,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
    ],
    query: {
      enabled: !!address && (!!directory || !!controller || !!treasury),
      staleTime: 60_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  const isDirectoryAdmin = Boolean(data?.[0]?.result);
  const isControllerAdmin = Boolean(data?.[1]?.result);
  const isTreasuryAdmin = Boolean(data?.[2]?.result);

  const isAdmin = isConnected && (isDirectoryAdmin || isControllerAdmin || isTreasuryAdmin);

  return {
    isAdmin,
    isLoading,
    isConnected,
    address,
  };
}
