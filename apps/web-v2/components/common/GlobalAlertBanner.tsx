'use client';

import React from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { ORACLE_MANAGER_ABI, TREASURY_ABI } from '../../lib/contracts';
import { getChainTokens } from '../../constants';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { AlertTriangle, WifiOff } from 'lucide-react';

export function GlobalAlertBanner() {
  const { chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const { oracle, treasury, controller, vault, isLoading } = useProtocolDirectory();
  const isDirectoryIncomplete = !isLoading && (!oracle || !treasury || !controller || !vault);

  const { data, isError } = useReadContracts({
    contracts: [
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.WETH],
      },
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.USDC],
      },
    ],
    query: {
      enabled: !!oracle && !!treasury,
      staleTime: 30_000,
      gcTime: 60_000,
    },
  });

  const btcFresh = (data?.[0]?.result as boolean) ?? true;
  const ethFresh = (data?.[1]?.result as boolean) ?? true;

  const isOracleStale = !btcFresh || !ethFresh;

  if (isDirectoryIncomplete) {
    return (
      <div className="bg-rose-500/15 dark:bg-rose-950/90 border-b border-rose-500/40 text-rose-700 dark:text-rose-300 px-4 py-2.5 text-xs flex items-center justify-center space-x-2 backdrop-blur-md shadow-lg">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
        <span className="font-bold">
          Protocol Directory Error: Module addresses could not be resolved from ProtocolDirectory
          on-chain registry. Hardcoded fallbacks are disabled.
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-500/15 dark:bg-rose-950/80 border-b border-rose-500/30 text-rose-700 dark:text-rose-300 px-4 py-2 text-xs flex items-center justify-center space-x-2 backdrop-blur-md">
        <WifiOff className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
        <span className="font-semibold">Network Syncing: Connecting to live market feeds...</span>
      </div>
    );
  }

  if (isOracleStale) {
    return (
      <div className="bg-amber-500/15 dark:bg-amber-950/80 border-b border-amber-500/40 text-amber-800 dark:text-amber-300 px-4 py-2 text-xs flex items-center justify-center space-x-2 backdrop-blur-md">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold">
          Market Sync Notice: Valuation feeds are undergoing scheduled refresh. New deposits may be
          temporarily delayed.
        </span>
      </div>
    );
  }

  return null;
}
