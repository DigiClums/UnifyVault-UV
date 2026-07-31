'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { COST_BASIS_MANAGER_ABI, ERC20_ABI, ORACLE_MANAGER_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import { ProtocolMetrics, UserPortfolio } from '../types';
import { transformUserPortfolio } from '../lib/portfolioTransforms';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface UseUserPortfolioResult extends UserPortfolio {
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch connected user share balance, USDC balance, cost basis, and oracle prices,
 * returning structured UserPortfolio metrics (Shares, Ownership, Invested Capital, PnL, Entry Price, User Holdings).
 *
 * @param protocolMetrics - Evaluated protocol metrics from useProtocolMetrics.
 * @returns UserPortfolio object along with query loading and error states.
 */
export function useUserPortfolio(protocolMetrics: ProtocolMetrics): UseUserPortfolioResult {
  const { address: userAddress } = useAccount();
  const activeUser = userAddress || ZERO_ADDRESS;

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      // 0. Connected User Shares Balance
      {
        address: FALLBACK_ADDRESSES.TOKEN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 1. Connected User USDC Balance
      {
        address: FALLBACK_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 2. CostBasisManager Invested Capital
      {
        address: FALLBACK_ADDRESSES.COST_BASIS,
        abi: COST_BASIS_MANAGER_ABI,
        functionName: 'investedAssets',
        args: [activeUser],
      },
      // 3. Oracle Price WBTC
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 4. Oracle Price WETH
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 5. Oracle Price USDC
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.USDC],
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const rawUserData = {
    userAddress,
    userSharesRaw: userAddress ? (data?.[0]?.result as bigint) || 0n : 0n,
    userUsdcRaw: userAddress ? (data?.[1]?.result as bigint) || 0n : 0n,
    contractInvestedAssetsRaw: userAddress ? (data?.[2]?.result as bigint) || 0n : 0n,
  };

  const rawProtocolData = {
    wbtcTotalAssets:
      protocolMetrics.protocolHoldings.find((h) => h.symbol === 'BTC')?.balanceRaw || 0n,
    wethTotalAssets:
      protocolMetrics.protocolHoldings.find((h) => h.symbol === 'ETH')?.balanceRaw || 0n,
    usdcTotalAssets:
      protocolMetrics.protocolHoldings.find((h) => h.symbol === 'USDC')?.balanceRaw || 0n,
    priceWBTC: (data?.[3]?.result as bigint) || 0n,
    priceWETH: (data?.[4]?.result as bigint) || 0n,
    priceUSDC: (data?.[5]?.result as bigint) || 1_000_000_000_000_000_000n,
    totalSharesRaw: protocolMetrics.totalSharesRaw,
  };

  const userPortfolio = transformUserPortfolio(rawUserData, rawProtocolData, protocolMetrics);

  return {
    ...userPortfolio,
    isLoading,
    isError,
  };
}
