'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { useProtocolDirectory } from './useProtocolDirectory';
import { DEFAULT_ADMIN_ROLE, DEPLOYED_CONTRACTS_SEPOLIA } from '../constants';
import { ACCESS_CONTROL_ABI } from '../lib/contracts/directory';
import { ARBITRATOR_ROLE_HASH, GOVERNANCE_ROLE_HASH } from '../lib/contracts/escrow';

export interface AdminAccessResult {
  isAdmin: boolean;
  isLoading: boolean;
  isConnected: boolean;
  address?: `0x${string}`;
}

/**
 * On-chain AccessControl Hook
 * Verifies whether the connected address holds DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, or ARBITRATOR_ROLE.
 */
export function useAdminAccess(): AdminAccessResult {
  const { address, isConnected } = useAccount();
  const { directory, controller, treasury, p2pEscrow } = useProtocolDirectory();
  const stakingVault = DEPLOYED_CONTRACTS_SEPOLIA.StakingVault;
  const rewardDistributor = DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor;

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
      {
        address: p2pEscrow,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
      {
        address: p2pEscrow,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [GOVERNANCE_ROLE_HASH, address] : undefined,
      },
      {
        address: p2pEscrow,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [ARBITRATOR_ROLE_HASH, address] : undefined,
      },
      {
        address: stakingVault,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
      {
        address: rewardDistributor,
        abi: ACCESS_CONTROL_ABI,
        functionName: 'hasRole',
        args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
      },
    ],
    query: {
      enabled:
        !!address && (!!directory || !!controller || !!treasury || !!p2pEscrow || !!stakingVault),
      staleTime: 60_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  const isDirectoryAdmin = Boolean(data?.[0]?.result);
  const isControllerAdmin = Boolean(data?.[1]?.result);
  const isTreasuryAdmin = Boolean(data?.[2]?.result);
  const isEscrowAdmin = Boolean(data?.[3]?.result);
  const isEscrowGov = Boolean(data?.[4]?.result);
  const isEscrowArbitrator = Boolean(data?.[5]?.result);
  const isStakingAdmin = Boolean(data?.[6]?.result);
  const isDistributorAdmin = Boolean(data?.[7]?.result);

  const isAdmin =
    isConnected &&
    (isDirectoryAdmin ||
      isControllerAdmin ||
      isTreasuryAdmin ||
      isEscrowAdmin ||
      isEscrowGov ||
      isEscrowArbitrator ||
      isStakingAdmin ||
      isDistributorAdmin);

  return {
    isAdmin,
    isLoading,
    isConnected,
    address,
  };
}
