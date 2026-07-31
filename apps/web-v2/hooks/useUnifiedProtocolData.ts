'use client';

import { useAccount, useReadContracts } from 'wagmi';
import {
  CUSTODY_VAULT_ABI,
  ERC20_ABI,
  ORACLE_MANAGER_ABI,
  COST_BASIS_MANAGER_ABI,
  STRATEGY_MANAGER_ABI,
} from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import { HistoricalNavPoint, ProtocolMetrics, UserPortfolio } from '../types';
import { transformProtocolMetrics, transformUserPortfolio } from '../lib/portfolioTransforms';
import { useHistoricalNAV } from './useIndexerData';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface UnifiedProtocolData extends ProtocolMetrics, UserPortfolio {
  // Historical NAV Telemetry
  historicalNAV: HistoricalNavPoint[];

  // Global Query States
  isLoading: boolean;
  isError: boolean;
}

/**
 * CANONICAL PUBLIC API HOOK
 * Executes a single atomic multi-call query batch across all protocol contracts to eliminate
 * data divergence and supply consistent real-time figures to Dashboard, Portfolio, Analytics, and Admin views.
 *
 * @returns UnifiedProtocolData object containing all protocol and user metrics.
 */
export function useUnifiedProtocolData(): UnifiedProtocolData {
  const { address: userAddress } = useAccount();
  const activeUser = userAddress || ZERO_ADDRESS;

  const activeStrategyManager =
    FALLBACK_ADDRESSES.STRATEGY_MANAGER || '0x36b02ef54B06527c2fE6028C51A3DF7e4EF7b9b0';

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
      // 7. Connected User Shares Balance
      {
        address: FALLBACK_ADDRESSES.TOKEN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 8. Connected User USDC Balance
      {
        address: FALLBACK_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 9. CostBasisManager Invested Capital
      {
        address: FALLBACK_ADDRESSES.COST_BASIS,
        abi: COST_BASIS_MANAGER_ABI,
        functionName: 'investedAssets',
        args: [activeUser],
      },
      // 10. StrategyManager Target Weights
      {
        address: activeStrategyManager,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTargetWeights',
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  // Extract Raw Contract Multi-Call Results
  const rawProtocolData = {
    wbtcTotalAssets: (data?.[0]?.result as bigint) || 0n,
    wethTotalAssets: (data?.[1]?.result as bigint) || 0n,
    usdcTotalAssets: (data?.[2]?.result as bigint) || 0n,
    priceWBTC: (data?.[3]?.result as bigint) || 0n,
    priceWETH: (data?.[4]?.result as bigint) || 0n,
    priceUSDC: (data?.[5]?.result as bigint) || 1_000_000_000_000_000_000n,
    totalSharesRaw: (data?.[6]?.result as bigint) || 0n,
  };

  const rawUserData = {
    userAddress,
    userSharesRaw: userAddress ? (data?.[7]?.result as bigint) || 0n : 0n,
    userUsdcRaw: userAddress ? (data?.[8]?.result as bigint) || 0n : 0n,
    contractInvestedAssetsRaw: userAddress ? (data?.[9]?.result as bigint) || 0n : 0n,
  };

  const targetWeightsResult = data?.[10]?.result as
    [address: `0x${string}`[], weights: bigint[]] | undefined;
  const targetWeightsBps = targetWeightsResult?.[1] || [5000n, 5000n];
  const targetBtcBps = Number(targetWeightsBps[0] || 5000n);
  const targetEthBps = Number(targetWeightsBps[1] || 5000n);

  const strategyMetrics = {
    targetBtcBps,
    targetEthBps,
    targetBtcPercent: `${(targetBtcBps / 100).toFixed(1)}%`,
    targetEthPercent: `${(targetEthBps / 100).toFixed(1)}%`,
  };

  // Evaluate Domain Models with Complete Oracle Prices & Balances
  const protocolMetrics = transformProtocolMetrics(rawProtocolData, strategyMetrics);
  const userPortfolio = transformUserPortfolio(rawUserData, rawProtocolData, protocolMetrics);

  const { navHistory } = useHistoricalNAV('ALL');
  const historicalNAV: HistoricalNavPoint[] = (navHistory || []).map((point) => ({
    timestamp: point.timestamp,
    navUSD: point.nav || point.sharePrice || 1.0,
    portfolioValueUSD: point.totalAssets || 0,
  }));

  return {
    ...protocolMetrics,
    ...userPortfolio,
    historicalNAV,
    isLoading,
    isError,
  };
}

export { useStrategyMetrics } from './useStrategyMetrics';
export { useProtocolMetrics } from './useProtocolMetrics';
export { useUserPortfolio } from './useUserPortfolio';
