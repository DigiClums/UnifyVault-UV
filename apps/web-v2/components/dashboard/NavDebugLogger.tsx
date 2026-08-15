'use client';

import { useEffect, useState } from 'react';
import { UnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';

interface NavDebugLoggerProps {
  data: Partial<UnifiedProtocolData>;
}

export function NavDebugLogger({ data }: NavDebugLoggerProps) {
  const [showDebugUI, setShowDebugUI] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
      const debugTelemetry = {
        timestamp: new Date().toISOString(),
        holdings: (data.protocolHoldings || []).map((h) => ({
          symbol: h.symbol,
          rawBalance: h.balanceRaw?.toString(),
          formattedBalance: h.balanceFormatted,
          priceUSD: h.priceUSD,
          valueUSD: h.valueUSD,
        })),
        totalSharesRaw: data.totalSharesRaw?.toString(),
        totalSharesFormatted: data.totalSharesFormatted,
        totalPortfolioValueUSD: data.totalPortfolioValueUSD,
        totalVaultNAVUSD: data.totalVaultNAVUSD,
        navPerShareUSD: data.navPerShareUSD,
        sharePriceUSD: data.sharePriceUSD,
      };

      console.debug('[NAV Telemetry Engine Debug Log]:', debugTelemetry);
    }
  }, [data]);

  if (process.env.NODE_ENV !== 'development' && !showDebugUI) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-gray-900/95 text-green-400 font-mono text-xs border border-green-500/30 rounded-xl shadow-2xl backdrop-blur-md max-w-sm w-full space-y-2">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-semibold text-gray-200">🔍 NAV Telemetry Debug</span>
        <button
          onClick={() => setShowDebugUI(!showDebugUI)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {showDebugUI ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-gray-400">
          <span>Total TVL / NAV:</span>
          <span className="text-green-300 font-bold">{data.totalPortfolioValueUSD}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Share Price:</span>
          <span className="text-blue-300 font-bold">{data.sharePriceUSD}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Total Supply:</span>
          <span className="text-gray-200">{data.totalSharesFormatted} shares</span>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-2 space-y-1">
        <span className="text-gray-500 font-bold block mb-1">Underlying Vault Assets:</span>
        {(data.protocolHoldings || []).map((h) => (
          <div key={h.symbol} className="flex justify-between text-[11px]">
            <span className="text-gray-300">{h.symbol}:</span>
            <span className="text-gray-400">
              {h.balanceFormatted} @ {h.priceUSD} ({h.valueUSD})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
