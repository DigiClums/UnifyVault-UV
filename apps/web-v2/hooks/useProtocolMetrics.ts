'use client';

import { useReadContracts } from 'wagmi';
import { CUSTODY_VAULT_ABI, ERC20_ABI, ORACLE_MANAGER_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import { ProtocolMetrics, StrategyMetrics } from '../types';
import { transformProtocolMetrics } from '../lib/portfolioTransforms';

export interface UseProtocolMetricsResult extends ProtocolMetrics {
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch protocol-wide reserve balances, oracle asset prices, and share token supply,
 * returning structured ProtocolMetrics (TVL, NAV, Share Price, Custody Allocations, Reserve Inventory).
 *
 * @param strategyMetrics - Strategy target weights from useStrategyMetrics.
 * @returns ProtocolMetrics along with loading and error flags.
 */
export function useProtocolMetrics(strategyMetrics: StrategyMetrics): UseProtocolMetricsResult {
  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      // 0. CustodyVault total WBTC
      {
        address: FALLBACK_ADDRESSES.VAULT,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 1. CustodyVault total WETH
      {
        address: FALLBACK_ADDRESSES.VAULT,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 2. CustodyVault total USDC
      {
        address: FALLBACK_ADDRESSES.VAULT,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      // 3. Oracle Price WBTC (18 decimals)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 4. Oracle Price WETH (18 decimals)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 5. Oracle Price USDC (18 decimals)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      // 6. UVBTCETHToken Total Supply
      {
        address: FALLBACK_ADDRESSES.TOKEN,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const rawData = {
    wbtcTotalAssets: (data?.[0]?.result as bigint) || 0n,
    wethTotalAssets: (data?.[1]?.result as bigint) || 0n,
    usdcTotalAssets: (data?.[2]?.result as bigint) || 0n,
    priceWBTC: (data?.[3]?.result as bigint) || 0n,
    priceWETH: (data?.[4]?.result as bigint) || 0n,
    priceUSDC: (data?.[5]?.result as bigint) || 1_000_000_000_000_000_000n, // $1.00 default
    totalSharesRaw: (data?.[6]?.result as bigint) || 0n,
  };

  const protocolMetrics = transformProtocolMetrics(rawData, strategyMetrics);

  return {
    ...protocolMetrics,
    isLoading,
    isError,
  };
}
