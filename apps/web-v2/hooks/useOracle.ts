'use client';

import { useReadContract } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';

export function useOracle(assetAddress: `0x${string}`) {
  const { oracle } = useProtocolDirectory();

  const {
    data: priceRaw,
    isError,
    isLoading,
    refetch,
  } = useReadContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: assetAddress && oracle ? [assetAddress] : undefined,
    query: {
      enabled: !!assetAddress && !!oracle,
      refetchInterval: 10_000,
    },
  });

  const { data: isFresh } = useReadContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'isPriceFresh',
    args: assetAddress && oracle ? [assetAddress] : undefined,
    query: {
      enabled: !!assetAddress && !!oracle,
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
