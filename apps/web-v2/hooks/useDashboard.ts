'use client';

import { DashboardMetrics } from '../types';
import { useUnifiedProtocolData } from './useUnifiedProtocolData';

/**
 * Phase 12 Architecture: Wrapper around unified protocol data hook
 * Eliminates duplicate calculations and enforces 100% data identity with Portfolio.
 */
export function useDashboard(): DashboardMetrics {
  const data = useUnifiedProtocolData();

  return {
    totalPortfolioValueUSD: data.totalPortfolioValueUSD,
    totalVaultNAVUSD: data.totalVaultNAVUSD,
    navPerShareUSD: data.navPerShareUSD,
    sharePriceUSD: data.sharePriceUSD,
    sharePriceNumber: data.sharePriceNumber,
    investedAssetsUSD: data.investedAssetsUSD,
    currentValueUSD: data.currentValueUSD,
    pnlUSD: data.pnlUSD,
    pnlPercentage: data.pnlPercentage,
    isProfitable: data.isProfitable,
    userSharesBalance: data.userSharesBalance,
    userUsdcBalance: data.userUsdcBalanceFormatted,
    btcAllocationPercent: data.targetBtcPercent ?? '...',
    ethAllocationPercent: data.targetEthPercent ?? '...',
    usdcBalanceFormatted: data.userUsdcBalanceFormatted,
    averageEntryPriceUSD: data.averageEntryPriceUSD,
    ownershipPercentage: data.ownershipPercentage,
    rawInvestedAssetsUSD: data.rawInvestedAssetsUSD,
    rawCurrentValueUSD: data.rawCurrentValueUSD,
    rawPnLUSD: data.rawPnLUSD,
    isLoading: data.isLoading,
    isError: data.isError,
    dataUpdatedAt: data.dataUpdatedAt,
    secondsAgo: data.secondsAgo,
    isLiveSynced: data.isLiveSynced,
  };
}
