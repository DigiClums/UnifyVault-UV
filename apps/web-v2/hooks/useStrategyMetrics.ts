'use client';

import { useReadContract } from 'wagmi';
import { STRATEGY_MANAGER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { StrategyMetrics } from '../types';

export interface UseStrategyMetricsResult extends StrategyMetrics {
  isLoading: boolean;
  isError: boolean;
}

export function useStrategyMetrics(
  strategyManagerAddressOverride?: `0x${string}`,
): UseStrategyMetricsResult {
  const { strategyManager } = useProtocolDirectory();
  const activeStrategyManager = strategyManagerAddressOverride || strategyManager;

  const { data, isLoading, isError } = useReadContract({
    address: activeStrategyManager,
    abi: STRATEGY_MANAGER_ABI,
    functionName: 'getTargetWeights',
    query: {
      enabled: !!activeStrategyManager,
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
