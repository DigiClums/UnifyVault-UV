'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { CUSTODY_VAULT_ABI, ERC20_ABI, ORACLE_MANAGER_ABI } from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { ProtocolMetrics, StrategyMetrics } from '../types';
import { transformProtocolMetrics } from '../lib/portfolioTransforms';

export interface UseProtocolMetricsResult extends ProtocolMetrics {
  isLoading: boolean;
  isError: boolean;
}

export function useProtocolMetrics(strategyMetrics: StrategyMetrics): UseProtocolMetricsResult {
  const { chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const { vault, oracle, token } = useProtocolDirectory();

  const { data, isLoading, isError } = useReadContracts({
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
    ],
    query: {
      enabled: !!vault && !!oracle && !!token,
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
