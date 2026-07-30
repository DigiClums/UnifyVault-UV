'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { CUSTODY_VAULT_ABI, ERC20_ABI, ORACLE_MANAGER_ABI } from '../lib/contracts';
import { FALLBACK_ADDRESSES } from '../constants';
import {
  calculateAssetUSDValue,
  calculateNAVUSD,
  calculateSharePriceUSD,
  calculateCurrentValueUSD,
  calculatePnL,
  formatUSD,
  formatShares,
  formatPercent,
  formatUnits,
} from '../lib/math';
import { DashboardMetrics } from '../types';

/**
 * Phase 12 Architecture: Strictly Read-Only Protocol Data
 * Oracle Keeper updates Mock Chainlink Aggregators -> OracleManager -> Protocol -> Frontend
 */
export function useDashboard(): DashboardMetrics {
  const { address: userAddress } = useAccount();

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
      // 3. Oracle Price WBTC (18 decimals from OracleManager)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 4. Oracle Price WETH (18 decimals from OracleManager)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 5. Oracle Price USDC (18 decimals from OracleManager)
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      // 6. Token totalSupply (shares)
      {
        address: FALLBACK_ADDRESSES.TOKEN,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      },
      // 7. User shares balance
      {
        address: FALLBACK_ADDRESSES.TOKEN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
      // 8. User USDC balance
      {
        address: FALLBACK_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const wbtcTotalAssets = (data?.[0]?.result as bigint) || 0n;
  const wethTotalAssets = (data?.[1]?.result as bigint) || 0n;
  const usdcTotalAssets = (data?.[2]?.result as bigint) || 0n;

  // Read prices directly from OracleManager
  const priceWBTC = (data?.[3]?.result as bigint) || 0n;
  const priceWETH = (data?.[4]?.result as bigint) || 0n;
  const priceUSDC = (data?.[5]?.result as bigint) || 1_000_000_000_000_000_000n; // default $1.00

  const totalShares = (data?.[6]?.result as bigint) || 0n;
  const userShares = (data?.[7]?.result as bigint) || 0n;
  const investedAssetsRaw = 0n;
  const userUsdcRaw = (data?.[8]?.result as bigint) || 0n;

  // Perform Calculations using lib/math engine
  const wbtcUSDValue = calculateAssetUSDValue(wbtcTotalAssets, 8, priceWBTC);
  const wethUSDValue = calculateAssetUSDValue(wethTotalAssets, 18, priceWETH);
  const usdcUSDValue = calculateAssetUSDValue(usdcTotalAssets, 6, priceUSDC);

  const totalPortfolioValueUSDNumber = wbtcUSDValue + wethUSDValue + usdcUSDValue;
  const totalPortfolioValueUSD18 = BigInt(Math.floor(totalPortfolioValueUSDNumber * 1e18));

  const sharePriceUSD = calculateSharePriceUSD(totalPortfolioValueUSD18, totalShares);
  const navUSD = calculateNAVUSD(totalPortfolioValueUSD18);

  const investedAssetsUSD = Number(formatUnits(investedAssetsRaw, 6)); // USDC 6 decimals
  const currentValueUSD = calculateCurrentValueUSD(userShares, sharePriceUSD);
  const { pnlUSD, pnlPercent, isProfitable } = calculatePnL(currentValueUSD, investedAssetsUSD);

  // Asset allocation percentages
  const btcAllocationPercent =
    totalPortfolioValueUSDNumber > 0
      ? ((wbtcUSDValue / totalPortfolioValueUSDNumber) * 100).toFixed(1)
      : '50.0';
  const ethAllocationPercent =
    totalPortfolioValueUSDNumber > 0
      ? ((wethUSDValue / totalPortfolioValueUSDNumber) * 100).toFixed(1)
      : '50.0';

  // Derive Average Entry Price (Cost Basis ÷ User Shares)
  const userSharesNumber = Number(formatUnits(userShares, 18));
  const totalSharesNumber = Number(formatUnits(totalShares, 18));

  const averageEntryPriceUSDNum =
    userSharesNumber > 0 && investedAssetsUSD > 0
      ? investedAssetsUSD / userSharesNumber
      : sharePriceUSD;

  // Derive User Ownership % of Protocol (User Shares ÷ Total Supply)
  const ownershipPercentNum =
    totalSharesNumber > 0 && userSharesNumber > 0
      ? (userSharesNumber / totalSharesNumber) * 100
      : 0;

  const ownershipPercentageFormatted =
    ownershipPercentNum === 0
      ? '0.00%'
      : ownershipPercentNum < 0.01
        ? '< 0.01%'
        : `${ownershipPercentNum.toFixed(2)}%`;

  return {
    totalPortfolioValueUSD: formatUSD(totalPortfolioValueUSDNumber),
    navPerShareUSD: formatUSD(sharePriceUSD),
    sharePriceUSD: formatUSD(sharePriceUSD),
    investedAssetsUSD: formatUSD(investedAssetsUSD),
    currentValueUSD: formatUSD(currentValueUSD),
    pnlUSD: `${isProfitable ? '+' : ''}${formatUSD(pnlUSD)}`,
    pnlPercentage: formatPercent(pnlPercent),
    isProfitable,
    userSharesBalance: formatShares(userShares),
    userUsdcBalance: formatUnits(userUsdcRaw, 6),
    btcAllocationPercent: `${btcAllocationPercent}%`,
    ethAllocationPercent: `${ethAllocationPercent}%`,
    usdcBalanceFormatted: formatUSD(Number(formatUnits(userUsdcRaw, 6))),
    averageEntryPriceUSD: formatUSD(averageEntryPriceUSDNum),
    ownershipPercentage: ownershipPercentageFormatted,
    rawInvestedAssetsUSD: investedAssetsUSD,
    rawCurrentValueUSD: currentValueUSD,
    rawPnLUSD: pnlUSD,
    isLoading,
    isError,
  };
}
