'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { COST_BASIS_MANAGER_ABI, ERC20_ABI, ORACLE_MANAGER_ABI } from '../lib/contracts';
import { getChainTokens } from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { ProtocolMetrics, UserPortfolio } from '../types';
import { transformUserPortfolio } from '../lib/portfolioTransforms';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface UseUserPortfolioResult extends UserPortfolio {
  isLoading: boolean;
  isError: boolean;
}

export function useUserPortfolio(protocolMetrics: ProtocolMetrics): UseUserPortfolioResult {
  const { address: userAddress, chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const activeUser = userAddress || ZERO_ADDRESS;
  const { token, costBasisManager, oracle } = useProtocolDirectory();

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      // 0. Connected User Shares Balance
      {
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 1. Connected User USDC Balance
      {
        address: tokens.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [activeUser],
      },
      // 2. Oracle Price WBTC
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.cbBTC],
      },
      // 3. Oracle Price WETH
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.WETH],
      },
      // 4. Oracle Price USDC
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.USDC],
      },
    ],
    query: {
      enabled: !!token && !!oracle,
      refetchInterval: 5_000,
    },
  });

  const rawUserData = {
    userAddress,
    userSharesRaw: userAddress ? (data?.[0]?.result as bigint) || 0n : 0n,
    userUsdcRaw: userAddress ? (data?.[1]?.result as bigint) || 0n : 0n,
    contractInvestedAssetsRaw: 0n,
  };

  const rawProtocolData = {
    wbtcTotalAssets:
      protocolMetrics.protocolHoldings.find((h) => h.symbol === 'BTC')?.balanceRaw || 0n,
    wethTotalAssets:
      protocolMetrics.protocolHoldings.find((h) => h.symbol === 'ETH')?.balanceRaw || 0n,
    usdcTotalAssets:
      protocolMetrics.protocolHoldings.find((h) => h.symbol === 'USDC')?.balanceRaw || 0n,
    priceWBTC: (data?.[2]?.result as bigint) || 0n,
    priceWETH: (data?.[3]?.result as bigint) || 0n,
    priceUSDC: (data?.[4]?.result as bigint) || 1_000_000_000_000_000_000n,
    totalSharesRaw: protocolMetrics.totalSharesRaw,
  };

  const userPortfolio = transformUserPortfolio(rawUserData, rawProtocolData, protocolMetrics);

  return {
    ...userPortfolio,
    isLoading,
    isError,
  };
}
