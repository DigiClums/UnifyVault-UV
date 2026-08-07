'use client';

import { useUnifiedProtocolData } from './useUnifiedProtocolData';

/**
 * Phase 12 Architecture: Wrapper around unified protocol data hook
 * Eliminates duplicate calculations and enforces 100% data identity with Dashboard.
 */
export function usePortfolio() {
  const data = useUnifiedProtocolData();

  return {
    holdings: data.protocolHoldings,
    userHoldings: data.userHoldings,
    totalPortfolioUSD: data.totalPortfolioValueUSD,
    userTotalUSD: formatUSDNumber(data.rawCurrentValueUSD),
    userSharesRaw: data.userSharesRaw,
    userSharesFormatted: data.userSharesBalance,
    navUSD: data.sharePriceNumber ?? 1.0,
    navUSDFormatted: data.navPerShareUSD,
    historicalNAV: data.historicalNAV,
    isLoading: data.isLoading,
  };
}

function formatUSDNumber(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}
