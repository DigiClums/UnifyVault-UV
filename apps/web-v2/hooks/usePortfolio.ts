'use client';

import { useReadContracts } from 'wagmi';
import { CUSTODY_VAULT_ABI, ORACLE_MANAGER_ABI, ERC20_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import { calculateAssetUSDValue, formatUSD, formatUnits } from '../lib/math';
import { AssetHolding, HistoricalNavPoint } from '../types';
import { useHistoricalNAV } from './useIndexerData';

/**
 * Strictly Read-Only Protocol Data from Deployed Contracts
 */
export function usePortfolio() {
  const { data, isLoading } = useReadContracts({
    contracts: [
      // 0. Vault total WBTC
      {
        address: FALLBACK_ADDRESSES.VAULT,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 1. Vault total WETH
      {
        address: FALLBACK_ADDRESSES.VAULT,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 2. Vault total USDC
      {
        address: FALLBACK_ADDRESSES.VAULT,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      // 3. Oracle Price WBTC (from OracleManager)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 4. Oracle Price WETH (from OracleManager)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 5. Oracle Price USDC (from OracleManager)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      // 6. Token Total Supply (Shares)
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

  const wbtcBal = (data?.[0]?.result as bigint) || 0n;
  const wethBal = (data?.[1]?.result as bigint) || 0n;
  const usdcBal = (data?.[2]?.result as bigint) || 0n;

  // Read prices directly from OracleManager contract
  const priceWBTC = (data?.[3]?.result as bigint) || 0n;
  const priceWETH = (data?.[4]?.result as bigint) || 0n;
  const priceUSDC = (data?.[5]?.result as bigint) || 1_000_000_000_000_000_000n; // $1.00

  const totalSharesRaw = (data?.[6]?.result as bigint) || 0n;

  const wbtcUSD = calculateAssetUSDValue(wbtcBal, 8, priceWBTC);
  const wethUSD = calculateAssetUSDValue(wethBal, 18, priceWETH);
  const usdcUSD = calculateAssetUSDValue(usdcBal, 6, priceUSDC);

  const totalPortfolioUSD = wbtcUSD + wethUSD + usdcUSD;
  const totalSharesNumber = Number(formatUnits(totalSharesRaw, 18));

  // Dynamic NAV per Share = Total Portfolio USD Value / Total Shares (or Genesis $1.00)
  const currentNavUSD =
    totalSharesNumber > 0 && totalPortfolioUSD > 0 ? totalPortfolioUSD / totalSharesNumber : 1.0;

  const holdings: AssetHolding[] = [
    {
      symbol: 'BTC',
      name: 'Wrapped Bitcoin',
      address: FALLBACK_ADDRESSES.WBTC,
      decimals: 8,
      balanceRaw: wbtcBal,
      balanceFormatted: formatUnits(wbtcBal, 8),
      priceUSD: formatUSD(Number(formatUnits(priceWBTC, 18))),
      valueUSD: formatUSD(wbtcUSD),
      weightBps: totalPortfolioUSD > 0 ? Math.round((wbtcUSD / totalPortfolioUSD) * 10000) : 0,
      weightPercent:
        totalPortfolioUSD > 0 ? `${((wbtcUSD / totalPortfolioUSD) * 100).toFixed(1)}%` : '0.0%',
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: FALLBACK_ADDRESSES.WETH,
      decimals: 18,
      balanceRaw: wethBal,
      balanceFormatted: formatUnits(wethBal, 18),
      priceUSD: formatUSD(Number(formatUnits(priceWETH, 18))),
      valueUSD: formatUSD(wethUSD),
      weightBps: totalPortfolioUSD > 0 ? Math.round((wethUSD / totalPortfolioUSD) * 10000) : 0,
      weightPercent:
        totalPortfolioUSD > 0 ? `${((wethUSD / totalPortfolioUSD) * 100).toFixed(1)}%` : '0.0%',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: FALLBACK_ADDRESSES.USDC,
      decimals: 6,
      balanceRaw: usdcBal,
      balanceFormatted: formatUnits(usdcBal, 6),
      priceUSD: formatUSD(Number(formatUnits(priceUSDC, 18))),
      valueUSD: formatUSD(usdcUSD),
      weightBps: totalPortfolioUSD > 0 ? Math.round((usdcUSD / totalPortfolioUSD) * 10000) : 0,
      weightPercent:
        totalPortfolioUSD > 0 ? `${((usdcUSD / totalPortfolioUSD) * 100).toFixed(1)}%` : '0.0%',
    },
  ];

  const { navHistory } = useHistoricalNAV('ALL');
  const historicalNAV: HistoricalNavPoint[] = (navHistory || []).map((point) => ({
    timestamp: point.timestamp,
    navUSD: point.nav || point.sharePrice || 1.0,
    portfolioValueUSD: point.totalAssets || 0,
  }));

  return {
    holdings,
    totalPortfolioUSD: formatUSD(totalPortfolioUSD),
    navUSD: currentNavUSD,
    navUSDFormatted: formatUSD(currentNavUSD),
    historicalNAV,
    isLoading,
  };
}
