import { ProtocolMetrics, UserPortfolio } from '../types';
import { useUnifiedProtocolData } from './useUnifiedProtocolData';

export interface UseUserPortfolioResult extends UserPortfolio {
  isLoading: boolean;
  isError: boolean;
}

export function useUserPortfolio(_protocolMetrics?: ProtocolMetrics): UseUserPortfolioResult {
  const data = useUnifiedProtocolData();

  return {
    userAddress: data.userAddress,
    userSharesRaw: data.userSharesRaw,
    userSharesBalance: data.userSharesBalance,
    userUsdcBalanceRaw: data.userUsdcBalanceRaw,
    userUsdcBalanceFormatted: data.userUsdcBalanceFormatted,
    investedAssetsUSD: data.investedAssetsUSD,
    rawInvestedAssetsUSD: data.rawInvestedAssetsUSD,
    currentValueUSD: data.currentValueUSD,
    rawCurrentValueUSD: data.rawCurrentValueUSD,
    pnlUSD: data.pnlUSD,
    rawPnLUSD: data.rawPnLUSD,
    pnlPercentage: data.pnlPercentage,
    isProfitable: data.isProfitable,
    averageEntryPriceUSD: data.averageEntryPriceUSD,
    ownershipPercentage: data.ownershipPercentage,
    userHoldings: data.userHoldings,
    isLoading: data.isLoading,
    isError: data.isError,
  };
}
