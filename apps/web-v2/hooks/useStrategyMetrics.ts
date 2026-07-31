'use client';

import { useReadContract } from 'wagmi';
import { STRATEGY_MANAGER_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import { StrategyMetrics } from '../types';

export interface UseStrategyMetricsResult extends StrategyMetrics {
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch and format target strategy asset allocation weights from StrategyManager.
 *
 * @param strategyManagerAddress - Optional StrategyManager contract address override.
 * @returns StrategyMetrics along with query loading and error states.
 */
export function useStrategyMetrics(
  strategyManagerAddress?: `0x${string}`,
): UseStrategyMetricsResult {
  const activeStrategyManager =
    strategyManagerAddress ||
    (FALLBACK_ADDRESSES.STRATEGY_MANAGER as `0x${string}`) ||
    '0x36b02ef54B06527c2fE6028C51A3DF7e4EF7b9b0';

  const { data, isLoading, isError } = useReadContract({
    address: activeStrategyManager,
    abi: STRATEGY_MANAGER_ABI,
    functionName: 'getTargetWeights',
    query: {
      refetchInterval: 5_000,
    },
  });

  const targetWeightsResult = data as [address: `0x${string}`[], weights: bigint[]] | undefined;
  const targetWeightsBps = targetWeightsResult?.[1] || [5000n, 5000n];

  const targetBtcBps = Number(targetWeightsBps[0] || 5000n);
  const targetEthBps = Number(targetWeightsBps[1] || 5000n);

  return {
    targetBtcBps,
    targetEthBps,
    targetBtcPercent: `${(targetBtcBps / 100).toFixed(1)}%`,
    targetEthPercent: `${(targetEthBps / 100).toFixed(1)}%`,
    isLoading,
    isError,
  };
}
