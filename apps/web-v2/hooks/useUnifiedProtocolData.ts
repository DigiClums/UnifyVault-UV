'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import {
  CUSTODY_VAULT_ABI,
  ERC20_ABI,
  ORACLE_MANAGER_ABI,
  COST_BASIS_MANAGER_ABI,
  STRATEGY_MANAGER_ABI,
  PORTFOLIO_MANAGER_ABI,
} from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { useSmartAccount } from './useSmartAccount';
import { HistoricalNavPoint, ProtocolMetrics, UserPortfolio } from '../types';
import { transformProtocolMetrics, transformUserPortfolio } from '../lib/portfolioTransforms';
import { aggregatePortfolioAddresses } from '../lib/portfolioMath';
import { formatShares } from '../lib/math';
import { useP2PTrades } from './useP2PEscrow';

export interface UnifiedProtocolData extends ProtocolMetrics, UserPortfolio {
  historicalNAV: HistoricalNavPoint[];
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  secondsAgo: number | null;
  isLiveSynced: boolean;
  refetch: () => Promise<void>;
  smartAccountAddress: `0x${string}` | null;
  portfolioAddresses: {
    owner?: `0x${string}`;
    smartAccount: `0x${string}` | null;
  };
  eoaSharesRaw: bigint;
  smartAccountSharesRaw: bigint;
  eoaSharesBalance: string;
  smartAccountSharesBalance: string;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function deriveFeedStatus(
  readItem: { status?: 'success' | 'failure'; result?: unknown; error?: Error } | undefined,
  freshItem: { status?: 'success' | 'failure'; result?: unknown } | undefined,
): { status: 'LIVE' | 'STALE' | 'REVERTED' | 'UNAVAILABLE'; price18: bigint | null } {
  if (!readItem) return { status: 'UNAVAILABLE', price18: null };
  if (readItem.status === 'failure' || readItem.error) return { status: 'REVERTED', price18: null };

  const val = readItem.result as bigint | undefined;
  if (val === undefined || val === 0n) return { status: 'UNAVAILABLE', price18: null };

  const isFresh = Boolean(freshItem?.result ?? true);
  if (!isFresh) return { status: 'STALE', price18: val };

  return { status: 'LIVE', price18: val };
}

export function useUnifiedProtocolData(): UnifiedProtocolData {
  const { address: userAddress, chain } = useAccount();
  const { smartAccountAddress } = useSmartAccount();
  const { trades: p2pTradesList } = useP2PTrades();
  const tokens = getChainTokens(chain?.id);
  const activeUser = userAddress || ZERO_ADDRESS;
  const { vault, oracle, token, costBasisManager, strategyManager, portfolioManager } =
    useProtocolDirectory();

  const {
    data,
    isLoading,
    isError,
    refetch: contractsRefetch,
    dataUpdatedAt,
  } = useReadContracts({
    contracts: [
      // 0. CustodyVault total WBTC
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.cbBTC],
      },
      // 1. CustodyVault total WETH
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.WETH],
      },
      // 2. CustodyVault total USDC
      {
        address: vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssetBalance',
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
        functionName: 'costBasis',
        args: [activeUser],
      },
      // 10. StrategyManager Target Weights
      {
        address: strategyManager,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTargetWeights',
      },
      // 11. PortfolioManager On-Chain UV Price & Valuation
      {
        address: portfolioManager,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: 'calculateUVPrice',
      },
      // 12. isPriceFresh cbBTC
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.cbBTC],
      },
      // 13. isPriceFresh WETH
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.WETH],
      },
      // 14. isPriceFresh USDC
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.USDC],
      },
      // 15. Derived Smart Account Shares Balance
      {
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: smartAccountAddress ? [smartAccountAddress] : undefined,
      },
      // 16. Derived Smart Account Cost Basis
      {
        address: costBasisManager,
        abi: COST_BASIS_MANAGER_ABI,
        functionName: 'costBasis',
        args: smartAccountAddress ? [smartAccountAddress] : undefined,
      },
    ],
    query: {
      enabled: !!vault && !!oracle && !!token,
      staleTime: 15_000,
      refetchInterval: 15_000,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000,
    },
  });

  const rawProtocolData = useMemo(() => {
    const btcFeed = deriveFeedStatus(data?.[3], data?.[12]);
    const ethFeed = deriveFeedStatus(data?.[4], data?.[13]);
    const usdcFeed = deriveFeedStatus(data?.[5], data?.[14]);

    return {
      wbtcTotalAssets: (data?.[0]?.result as bigint) || 0n,
      wethTotalAssets: (data?.[1]?.result as bigint) || 0n,
      usdcTotalAssets: (data?.[2]?.result as bigint) || 0n,
      priceWBTC: btcFeed.price18,
      priceWETH: ethFeed.price18,
      priceUSDC: usdcFeed.price18,
      btcStatus: btcFeed.status,
      ethStatus: ethFeed.status,
      usdcStatus: usdcFeed.status,
      totalSharesRaw: (data?.[6]?.result as bigint) || 0n,
      onChainNAV: data?.[11]?.result as readonly [bigint, bigint] | undefined,
    };
  }, [data]);

  const eoaSharesRaw = userAddress ? (data?.[7]?.result as bigint) || 0n : 0n;
  const eoaUsdcRaw = userAddress ? (data?.[8]?.result as bigint) || 0n : 0n;
  const eoaCostBasisRaw = userAddress ? (data?.[9]?.result as bigint) || 0n : 0n;
  const smartAccountSharesRaw = smartAccountAddress ? (data?.[15]?.result as bigint) || 0n : 0n;
  const smartAccountCostBasisRaw = smartAccountAddress ? (data?.[16]?.result as bigint) || 0n : 0n;

  const rawUserData = useMemo(() => {
    const { totalSharesRaw: unifiedSharesRaw, totalCostBasisRaw: unifiedCostBasisRaw } =
      aggregatePortfolioAddresses({
        eoaSharesRaw,
        smartAccountSharesRaw,
        eoaCostBasisRaw,
        smartAccountCostBasisRaw,
      });

    return {
      userAddress,
      userSharesRaw: unifiedSharesRaw,
      userUsdcRaw: eoaUsdcRaw,
      contractInvestedAssetsRaw: unifiedCostBasisRaw,
      p2pTrades: p2pTradesList,
    };
  }, [
    userAddress,
    eoaSharesRaw,
    smartAccountSharesRaw,
    eoaCostBasisRaw,
    smartAccountCostBasisRaw,
    eoaUsdcRaw,
    p2pTradesList,
  ]);

  const targetWeightsResult = data?.[10]?.result as
    [address: `0x${string}`[], weights: bigint[]] | undefined;

  // NO FALLBACK: strategy weights are null when data hasn't loaded.
  // Consumers MUST handle undefined values by showing loading/skeleton states.
  const targetWeightsBps: bigint[] | null = targetWeightsResult?.[1] ?? null;

  const targetBtcBps: number | undefined =
    targetWeightsBps !== null && targetWeightsBps.length > 0
      ? Number(targetWeightsBps[0])
      : undefined;

  const targetEthBps: number | undefined =
    targetWeightsBps !== null && targetWeightsBps.length > 1
      ? Number(targetWeightsBps[1])
      : undefined;

  const strategyMetrics = useMemo(
    () => ({
      targetBtcBps,
      targetEthBps,
      targetBtcPercent:
        targetBtcBps !== undefined ? `${(targetBtcBps / 100).toFixed(1)}%` : undefined,
      targetEthPercent:
        targetEthBps !== undefined ? `${(targetEthBps / 100).toFixed(1)}%` : undefined,
    }),
    [targetBtcBps, targetEthBps],
  );

  const protocolMetrics = useMemo(() => {
    return transformProtocolMetrics(rawProtocolData, strategyMetrics);
  }, [rawProtocolData, strategyMetrics]);

  const userPortfolio = useMemo(() => {
    return transformUserPortfolio(rawUserData, rawProtocolData, protocolMetrics);
  }, [rawUserData, rawProtocolData, protocolMetrics]);

  const historicalNAV: HistoricalNavPoint[] = [];

  const dataAgeMs = dataUpdatedAt ? Date.now() - dataUpdatedAt : null;
  const secondsAgo = dataAgeMs !== null ? Math.max(0, Math.floor(dataAgeMs / 1000)) : null;
  const isLiveSynced =
    !isLoading && !isError && dataUpdatedAt > 0 && (dataAgeMs === null || dataAgeMs < 30_000);

  const refetch = async () => {
    await contractsRefetch();
  };

  return {
    ...protocolMetrics,
    ...userPortfolio,
    historicalNAV,
    isLoading,
    isError,
    dataUpdatedAt,
    secondsAgo,
    isLiveSynced,
    refetch,
    smartAccountAddress,
    portfolioAddresses: {
      owner: userAddress,
      smartAccount: smartAccountAddress,
    },
    eoaSharesRaw,
    smartAccountSharesRaw,
    eoaSharesBalance: formatShares(eoaSharesRaw),
    smartAccountSharesBalance: formatShares(smartAccountSharesRaw),
  };
}

export { useStrategyMetrics } from './useStrategyMetrics';
export { useProtocolMetrics } from './useProtocolMetrics';
export { useUserPortfolio } from './useUserPortfolio';
