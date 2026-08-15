'use client';

import { useReadContract } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../lib/contracts';
import { useProtocolDirectory } from './useProtocolDirectory';
import { formatUSD, formatUnits } from '../lib/math';
import { OracleFeedStatus } from '../types';

export function useOracle(assetAddress: `0x${string}`) {
  const { oracle } = useProtocolDirectory();

  const {
    data: priceRaw,
    isError: isPriceError,
    isLoading: isPriceLoading,
    refetch: refetchPrice,
  } = useReadContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: assetAddress && oracle ? [assetAddress] : undefined,
    query: {
      enabled: !!assetAddress && !!oracle,
      staleTime: 5_000,
      gcTime: 60_000,
    },
  });

  const {
    data: isFreshData,
    isLoading: isFreshLoading,
    refetch: refetchFresh,
  } = useReadContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'isPriceFresh',
    args: assetAddress && oracle ? [assetAddress] : undefined,
    query: {
      enabled: !!assetAddress && !!oracle,
      staleTime: 5_000,
      gcTime: 60_000,
    },
  });

  const isFresh = (isFreshData as boolean) ?? true;
  const rawBigInt = priceRaw as bigint | undefined;

  let status: OracleFeedStatus = 'UNAVAILABLE';
  if (isPriceError) {
    status = 'REVERTED';
  } else if (rawBigInt && rawBigInt > 0n) {
    status = isFresh ? 'LIVE' : 'STALE';
  } else if (rawBigInt === 0n) {
    status = 'UNAVAILABLE';
  }

  const priceNum = rawBigInt && rawBigInt > 0n ? Number(formatUnits(rawBigInt, 18)) : null;
  const priceUSD =
    status === 'LIVE' && priceNum !== null ? formatUSD(priceNum) : 'Price unavailable';

  const refetch = async () => {
    await Promise.allSettled([refetchPrice(), refetchFresh()]);
  };

  return {
    priceRaw: rawBigInt || 0n,
    price18: rawBigInt || null,
    priceNum,
    priceUSD,
    status,
    isFresh,
    isLoading: isPriceLoading || isFreshLoading,
    isError: isPriceError,
    refetch,
  };
}
