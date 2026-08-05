'use client';

import { useAccount, useReadContracts } from 'wagmi';
import {
  CUSTODY_VAULT_ABI,
  ERC20_ABI,
  ORACLE_MANAGER_ABI,
  COST_BASIS_MANAGER_ABI,
  STRATEGY_MANAGER_ABI,
} from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { HistoricalNavPoint, ProtocolMetrics, UserPortfolio } from '../types';
import { transformProtocolMetrics, transformUserPortfolio } from '../lib/portfolioTransforms';
import { useHistoricalNAV } from './useIndexerData';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface UnifiedProtocolData extends ProtocolMetrics, UserPortfolio {
  historicalNAV: HistoricalNavPoint[];
  isLoading: boolean;
  isError: boolean;
}

export function useUnifiedProtocolData(): UnifiedProtocolData {
  const { address: userAddress, chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const activeUser = userAddress || ZERO_ADDRESS;
  const { vault, oracle, token, costBasisManager, strategyManager } = useProtocolDirectory();

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      // 0. CustodyVault total WBTC
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [tokens.cbBTC],
      },
      // 1. CustodyVault total WETH
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [tokens.WETH],
      },
      // 2. CustodyVault total USDC
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [tokens.USDC],
      },
      // 3. Oracle Price WBTC (18 decimals)
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.cbBTC],
      },
      // 4. Oracle Price WETH (18 decimals)
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.WETH],
      },
      // 5. Oracle Price USDC (18 decimals)
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.USDC],
      },
      // 6. UVBTCETHToken Total Supply
      {
        address: token,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      },
      // 7. Connected User Shares Balance
      {
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 8. Connected User USDC Balance
      {
        address: tokens.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 9. CostBasisManager Invested Capital
      {
        address: costBasisManager,
        abi: COST_BASIS_MANAGER_ABI,
        functionName: 'investedAssets',
        args: [activeUser],
      },
      // 10. StrategyManager Target Weights
      {
        address: strategyManager,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTargetWeights',
      },
    ],
    query: {
      enabled: !!vault && !!oracle && !!token,
      refetchInterval: 5_000,
    },
  });

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
