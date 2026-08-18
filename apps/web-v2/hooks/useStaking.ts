'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { type Address, formatUnits, parseUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import {
  STAKING_VAULT_ABI,
  REFERRAL_REGISTRY_ABI,
  REWARD_DISTRIBUTOR_ABI,
  REWARD_RESERVE_ABI,
  ERC20_ABI,
} from '../lib/contracts';
import { DEPLOYED_CONTRACTS_SEPOLIA, TOKENS_BY_CHAIN } from '../constants';
import { useTransactionManager } from './useTransactionManager';
import { baseSepolia } from 'viem/chains';

export const MIN_STAKE_AMOUNT = 50_000_000_000_000_000_000n; // 50 UVBE
export const MAX_STAKE_AMOUNT = 100_000_000_000_000_000_000_000n; // 100,000 UVBE

export interface DetailedRewards {
  recurringReward: bigint;
  directReward: bigint;
  generationReward: bigint;
  rankReward: bigint;
  daoReward: bigint;
  totalClaimable: bigint;
  totalClaimed: bigint;
  totalRestaked: bigint;
}

export const RANK_NAMES = [
  'Unranked',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Crown Ambassador',
] as const;

export const RANK_REQUIREMENTS = [
  {
    rank: 0,
    name: 'Unranked',
    personalStake: 0n,
    activeDirects: 0,
    teamVolume: 0n,
    milestoneReward: 0n,
  },
  {
    rank: 1,
    name: 'Bronze',
    personalStake: 100_000_000_000_000_000_000n,
    activeDirects: 2,
    teamVolume: 1_000_000_000_000_000_000_000n,
    milestoneReward: 25_000_000_000_000_000_000n,
  },
  {
    rank: 2,
    name: 'Silver',
    personalStake: 250_000_000_000_000_000_000n,
    activeDirects: 3,
    teamVolume: 5_000_000_000_000_000_000_000n,
    milestoneReward: 100_000_000_000_000_000_000n,
  },
  {
    rank: 3,
    name: 'Gold',
    personalStake: 500_000_000_000_000_000_000n,
    activeDirects: 4,
    teamVolume: 20_000_000_000_000_000_000_000n,
    milestoneReward: 500_000_000_000_000_000_000n,
  },
  {
    rank: 4,
    name: 'Platinum',
    personalStake: 1_000_000_000_000_000_000_000n,
    activeDirects: 5,
    teamVolume: 50_000_000_000_000_000_000_000n,
    milestoneReward: 1_500_000_000_000_000_000_000n,
  },
  {
    rank: 5,
    name: 'Diamond',
    personalStake: 2_500_000_000_000_000_000_000n,
    activeDirects: 7,
    teamVolume: 150_000_000_000_000_000_000_000n,
    milestoneReward: 5_000_000_000_000_000_000_000n,
  },
  {
    rank: 6,
    name: 'Crown Ambassador',
    personalStake: 5_000_000_000_000_000_000_000n,
    activeDirects: 10,
    teamVolume: 500_000_000_000_000_000_000n,
    milestoneReward: 20_000_000_000_000_000_000_000n,
  },
];

export function useStaking() {
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const txManager = useTransactionManager();

  const tokenAddress = (TOKENS_BY_CHAIN[chain?.id || baseSepolia.id]?.UVBE ||
    DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken) as Address;
  const stakingVaultAddress = DEPLOYED_CONTRACTS_SEPOLIA.StakingVault as Address;
  const registryAddress = DEPLOYED_CONTRACTS_SEPOLIA.ReferralRegistry as Address;
  const distributorAddress = DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor as Address;
  const reserveAddress = DEPLOYED_CONTRACTS_SEPOLIA.RewardReserve as Address;
  const genesisReferrer = DEPLOYED_CONTRACTS_SEPOLIA.GenesisReferrer as Address;

  // 1. Batch Read On-Chain State
  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      // 0: UVBE balance
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      // 1: UVBE allowance to StakingVault
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: userAddress ? [userAddress, stakingVaultAddress] : undefined,
      },
      // 2: Permanent stake of user
      {
        address: stakingVaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'getPermanentStake',
        args: userAddress ? [userAddress] : undefined,
      },
      // 3: Total permanent staked in vault
      {
        address: stakingVaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'totalPermanentStaked',
      },
      // 4: Stake record count
      {
        address: stakingVaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'getStakeCount',
        args: userAddress ? [userAddress] : undefined,
      },
      // 5: User Active Direct Status
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'isUserActive',
        args: userAddress ? [userAddress] : undefined,
      },
      // 6: User Rank
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getRank',
        args: userAddress ? [userAddress] : undefined,
      },
      // 7: User Bound Referrer
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getReferrer',
        args: userAddress ? [userAddress] : undefined,
      },
      // 8: Active Direct Count of User
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getActiveDirectCount',
        args: userAddress ? [userAddress] : undefined,
      },
      // 9: User Directs List
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getDirects',
        args: userAddress ? [userAddress] : undefined,
      },
      // 10: User Team Volume
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getTeamVolume',
        args: userAddress ? [userAddress] : undefined,
      },
      // 11: Detailed Reward Info
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'getDetailedRewardInfo',
        args: userAddress ? [userAddress] : undefined,
      },
      // 12: Total Outstanding Liabilities
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'totalOutstandingLiabilities',
      },
      // 13: Available Reward Reserve
      {
        address: reserveAddress,
        abi: REWARD_RESERVE_ABI,
        functionName: 'getAvailableReserve',
      },
      // 14: Current DAO Epoch ID
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'currentDaoEpochId',
      },
    ],
    query: {
      enabled: !!stakingVaultAddress,
      staleTime: 10_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  // Safe Parsers
  const uvbeBalance = (data?.[0]?.result as bigint) || 0n;
  const uvbeAllowance = (data?.[1]?.result as bigint) || 0n;
  const permanentStake = (data?.[2]?.result as bigint) || 0n;
  const totalPermanentStaked = (data?.[3]?.result as bigint) || 0n;
  const stakeCount = Number(data?.[4]?.result || 0n);
  const isUserActive = Boolean(data?.[5]?.result);
  const currentRank = Number(data?.[6]?.result || 0);
  const boundReferrer =
    (data?.[7]?.result as Address) || ('0x0000000000000000000000000000000000000000' as Address);
  const activeDirectCount = Number(data?.[8]?.result || 0n);
  const directsList = (data?.[9]?.result as Address[]) || [];
  const teamVolume = (data?.[10]?.result as bigint) || 0n;

  const rawRewardInfo = data?.[11]?.result as
    [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

  const rewards: DetailedRewards = useMemo(() => {
    if (!rawRewardInfo) {
      return {
        recurringReward: 0n,
        directReward: 0n,
        generationReward: 0n,
        rankReward: 0n,
        daoReward: 0n,
        totalClaimable: 0n,
        totalClaimed: 0n,
        totalRestaked: 0n,
      };
    }
    return {
      recurringReward: rawRewardInfo[0],
      directReward: rawRewardInfo[1],
      generationReward: rawRewardInfo[2],
      rankReward: rawRewardInfo[3],
      daoReward: rawRewardInfo[4],
      totalClaimable: rawRewardInfo[5],
      totalClaimed: rawRewardInfo[6],
      totalRestaked: rawRewardInfo[7],
    };
  }, [rawRewardInfo]);

  const totalOutstandingLiabilities = (data?.[12]?.result as bigint) || 0n;
  const availableReserve = (data?.[13]?.result as bigint) || 0n;
  const currentDaoEpochId = Number(data?.[14]?.result || 1n);

  const hasGenesisReferrer =
    boundReferrer.toLowerCase() !== '0x0000000000000000000000000000000000000000';

  // 2. Stake Actions
  const approveUVBE = useCallback(
    async (amount: bigint = MIN_STAKE_AMOUNT) => {
      if (!userAddress) throw new Error('Wallet not connected');
      return txManager.executeTransaction(
        async () => {
          const hash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [stakingVaultAddress, amount],
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
          }
          await refetch();
          queryClient.invalidateQueries();
          return hash;
        },
        {
          stepName: 'Approve UVBE',
          stepDescription: `Approving ${formatUnits(amount, 18)} UVBE for Staking Vault`,
        },
      );
    },
    [
      userAddress,
      tokenAddress,
      stakingVaultAddress,
      writeContractAsync,
      publicClient,
      refetch,
      queryClient,
      txManager,
    ],
  );

  const stake = useCallback(
    async (amount: bigint, referrerInput?: string) => {
      if (!userAddress) throw new Error('Wallet not connected');
      if (amount < MIN_STAKE_AMOUNT) {
        throw new Error(`Minimum stake is 50 UVBE (${formatUnits(MIN_STAKE_AMOUNT, 18)} UVBE)`);
      }
      if (amount > MAX_STAKE_AMOUNT) {
        throw new Error(`Maximum stake per transaction is 100,000 UVBE`);
      }

      // Determine valid referrer
      let finalReferrer: Address = genesisReferrer;
      if (
        referrerInput &&
        referrerInput.trim().startsWith('0x') &&
        referrerInput.trim().length === 42
      ) {
        if (referrerInput.trim().toLowerCase() !== userAddress.toLowerCase()) {
          finalReferrer = referrerInput.trim() as Address;
        }
      }

      const approveFn = async () => {
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [stakingVaultAddress, amount],
        });
        return hash;
      };

      const mainActionFn = async () => {
        if (publicClient) {
          await publicClient.simulateContract({
            account: userAddress,
            address: stakingVaultAddress,
            abi: STAKING_VAULT_ABI,
            functionName: 'stake',
            args: [amount, finalReferrer],
          });
        }
        const hash = await writeContractAsync({
          address: stakingVaultAddress,
          abi: STAKING_VAULT_ABI,
          functionName: 'stake',
          args: [amount, finalReferrer],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        }
        await refetch();
        queryClient.invalidateQueries();
        return hash;
      };

      return txManager.executeWithApprovalIfNeeded(approveFn, mainActionFn, {
        stepName: 'Stake UVBE',
        stepDescription: `Permanently staking ${formatUnits(amount, 18)} UVBE`,
        assetAddress: tokenAddress,
        spenderAddress: stakingVaultAddress,
        requiredAmount: amount,
        approvalStepName: 'Approve UVBE',
        approvalStepDescription: `Approving ${formatUnits(amount, 18)} UVBE for Staking Vault`,
      });
    },
    [
      userAddress,
      tokenAddress,
      stakingVaultAddress,
      genesisReferrer,
      publicClient,
      writeContractAsync,
      refetch,
      queryClient,
      txManager,
    ],
  );

  const claimRewards = useCallback(
    async (amount: bigint) => {
      if (!userAddress) throw new Error('Wallet not connected');
      if (amount === 0n) throw new Error('Claim amount must be greater than 0');

      return txManager.executeTransaction(
        async () => {
          const hash = await writeContractAsync({
            address: distributorAddress,
            abi: REWARD_DISTRIBUTOR_ABI,
            functionName: 'claimRewards',
            args: [amount],
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
          }
          await refetch();
          queryClient.invalidateQueries();
          return hash;
        },
        {
          stepName: 'Claim Rewards',
          stepDescription: `Claiming ${formatUnits(amount, 18)} UVBE rewards directly to wallet`,
        },
      );
    },
    [
      userAddress,
      distributorAddress,
      writeContractAsync,
      publicClient,
      refetch,
      queryClient,
      txManager,
    ],
  );

  const claimAllRewards = useCallback(async () => {
    if (!userAddress) throw new Error('Wallet not connected');
    if (rewards.totalClaimable === 0n) throw new Error('No claimable rewards available');

    return txManager.executeTransaction(
      async () => {
        const hash = await writeContractAsync({
          address: distributorAddress,
          abi: REWARD_DISTRIBUTOR_ABI,
          functionName: 'claimAllRewards',
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        }
        await refetch();
        queryClient.invalidateQueries();
        return hash;
      },
      {
        stepName: 'Claim All Rewards',
        stepDescription: `Claiming all (${formatUnits(rewards.totalClaimable, 18)} UVBE) rewards directly to wallet`,
      },
    );
  }, [
    userAddress,
    rewards.totalClaimable,
    distributorAddress,
    writeContractAsync,
    publicClient,
    refetch,
    queryClient,
    txManager,
  ]);

  const restakeRewards = useCallback(
    async (amount: bigint) => {
      if (!userAddress) throw new Error('Wallet not connected');
      if (amount === 0n) throw new Error('Restake amount must be greater than 0');

      return txManager.executeTransaction(
        async () => {
          const hash = await writeContractAsync({
            address: distributorAddress,
            abi: REWARD_DISTRIBUTOR_ABI,
            functionName: 'restakeRewards',
            args: [amount],
          });
          if (publicClient) {
            await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
          }
          await refetch();
          queryClient.invalidateQueries();
          return hash;
        },
        {
          stepName: 'Compound Restake',
          stepDescription: `Compounding ${formatUnits(amount, 18)} UVBE into permanent principal`,
        },
      );
    },
    [
      userAddress,
      distributorAddress,
      writeContractAsync,
      publicClient,
      refetch,
      queryClient,
      txManager,
    ],
  );

  const restakeAllRewards = useCallback(async () => {
    if (!userAddress) throw new Error('Wallet not connected');
    if (rewards.totalClaimable === 0n) throw new Error('No claimable rewards available to restake');

    return txManager.executeTransaction(
      async () => {
        const hash = await writeContractAsync({
          address: distributorAddress,
          abi: REWARD_DISTRIBUTOR_ABI,
          functionName: 'restakeAllRewards',
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        }
        await refetch();
        queryClient.invalidateQueries();
        return hash;
      },
      {
        stepName: 'Compound All Rewards',
        stepDescription: `Compounding all (${formatUnits(rewards.totalClaimable, 18)} UVBE) rewards into permanent principal`,
      },
    );
  }, [
    userAddress,
    rewards.totalClaimable,
    distributorAddress,
    writeContractAsync,
    publicClient,
    refetch,
    queryClient,
    txManager,
  ]);

  // Rank Requirement details
  const rankDetails = useMemo(() => {
    const safeRank = Math.min(Math.max(currentRank, 0), 6);
    const current = RANK_REQUIREMENTS[safeRank];
    const next = safeRank < 6 ? RANK_REQUIREMENTS[safeRank + 1] : null;

    let stakeProgress = 100;
    let directsProgress = 100;
    let volumeProgress = 100;

    if (next) {
      stakeProgress = Math.min(
        100,
        Math.round((Number(permanentStake) / Number(next.personalStake)) * 100),
      );
      directsProgress = Math.min(100, Math.round((activeDirectCount / next.activeDirects) * 100));
      volumeProgress =
        next.teamVolume > 0n
          ? Math.min(100, Math.round((Number(teamVolume) / Number(next.teamVolume)) * 100))
          : 100;
    }

    return {
      current,
      next,
      stakeProgress,
      directsProgress,
      volumeProgress,
      rankName: RANK_NAMES[safeRank],
    };
  }, [currentRank, permanentStake, activeDirectCount, teamVolume]);

  return {
    // State
    uvbeBalance,
    uvbeAllowance,
    permanentStake,
    totalPermanentStaked,
    stakeCount,
    isUserActive,
    currentRank,
    boundReferrer,
    hasGenesisReferrer,
    activeDirectCount,
    directsList,
    teamVolume,
    rewards,
    totalOutstandingLiabilities,
    availableReserve,
    currentDaoEpochId,
    rankDetails,
    genesisReferrer,

    // Loading & Status
    isLoading,
    isError,
    refetch,
    txManager,

    // Actions
    approveUVBE,
    stake,
    claimRewards,
    claimAllRewards,
    restakeRewards,
    restakeAllRewards,

    // Constants
    MIN_STAKE_AMOUNT,
    MAX_STAKE_AMOUNT,
  };
}
