'use client';

import { useReadContract } from 'wagmi';
import { STRATEGY_MANAGER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';

/**
 * Raw on-chain strategy weights from StrategyManager.getTargetWeights().
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for portfolio allocation.
 * Never fabricate fallback percentages. If data hasn't loaded, show a skeleton.
 */

export interface UseStrategyMetricsResult {
  /** Raw target weights in BPS from the StrategyManager contract (e.g. [6000n, 4000n] = 60/40). */
  targetWeightsBps: bigint[] | null;

  /** Derived: BTC target weight in BPS, or undefined if data hasn't loaded. */
  targetBtcBps: number | undefined;

  /** Derived: ETH target weight in BPS, or undefined if data hasn't loaded. */
  targetEthBps: number | undefined;

  /** Derived: formatted BTC percentage string (e.g. "60.0%"), or undefined if loading. */
  targetBtcPercent: string | undefined;

  /** Derived: formatted ETH percentage string (e.g. "40.0%"), or undefined if loading. */
  targetEthPercent: string | undefined;

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
      staleTime: 60_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  const targetWeightsResult = data as [address: `0x${string}`[], weights: bigint[]] | undefined;

  // NO FALLBACK: if data hasn't loaded, return null/undefined
  const targetWeightsBps: bigint[] | null = targetWeightsResult?.[1] ?? null;

  const targetBtcBps: number | undefined =
    targetWeightsBps !== null && targetWeightsBps.length > 0
      ? Number(targetWeightsBps[0])
      : undefined;

  const targetEthBps: number | undefined =
    targetWeightsBps !== null && targetWeightsBps.length > 1
      ? Number(targetWeightsBps[1])
      : undefined;

  const targetBtcPercent: string | undefined =
    targetBtcBps !== undefined ? `${(targetBtcBps / 100).toFixed(1)}%` : undefined;

  const targetEthPercent: string | undefined =
    targetEthBps !== undefined ? `${(targetEthBps / 100).toFixed(1)}%` : undefined;

  return {
    targetWeightsBps,
    targetBtcBps,
    targetEthBps,
    targetBtcPercent,
    targetEthPercent,
    isLoading,
    isError,
  };
}
