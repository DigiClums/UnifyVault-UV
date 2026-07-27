'use client';

import { useReadContract } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';

export function useOracle(assetAddress: `0x${string}`) {
  const {
    data: priceRaw,
    isError,
    isLoading,
    refetch,
  } = useReadContract({
    address: FALLBACK_ADDRESSES.ORACLE,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [assetAddress],
    query: {
      refetchInterval: 10_000,
    },
  });

  const { data: isFresh } = useReadContract({
    address: FALLBACK_ADDRESSES.ORACLE,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'isPriceFresh',
    args: [assetAddress],
    query: {
      refetchInterval: 15_000,
    },
  });

  return {
    priceRaw: (priceRaw as bigint) || 0n,
    isFresh: (isFresh as boolean) ?? true,
    isLoading,
    isError,
    refetch,
  };
}
