import { ProtocolMetrics, StrategyMetrics } from '../types';
import { useUnifiedProtocolData } from './useUnifiedProtocolData';

export interface UseProtocolMetricsResult extends ProtocolMetrics {
  isLoading: boolean;
  isError: boolean;
}

export function useProtocolMetrics(_strategyMetrics?: StrategyMetrics): UseProtocolMetricsResult {
  const data = useUnifiedProtocolData();

  return {
    totalPortfolioValueUSD: data.totalPortfolioValueUSD,
    totalVaultNAVUSD: data.totalVaultNAVUSD,
    totalPortfolioValueUSDNumber: data.totalPortfolioValueUSDNumber,
    navPerShareUSD: data.navPerShareUSD,
    sharePriceUSD: data.sharePriceUSD,
    sharePriceNumber: data.sharePriceNumber,
    totalSharesRaw: data.totalSharesRaw,
    totalSharesFormatted: data.totalSharesFormatted,
    targetBtcBps: data.targetBtcBps,
    targetEthBps: data.targetEthBps,
    targetBtcPercent: data.targetBtcPercent,
    targetEthPercent: data.targetEthPercent,
    custodyBtcPercent: data.custodyBtcPercent,
    custodyEthPercent: data.custodyEthPercent,
    protocolHoldings: data.protocolHoldings,
    isLoading: data.isLoading,
    isError: data.isError,
  };
}
