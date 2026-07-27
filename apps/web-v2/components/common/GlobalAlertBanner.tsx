'use client';

import React from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { ORACLE_MANAGER_ABI, TREASURY_ABI } from '../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../constants';
import { AlertTriangle, Wallet, WifiOff } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function GlobalAlertBanner() {
  const pathname = usePathname();
  const { isConnected } = useAccount();

  const { data, isError } = useReadContracts({
    contracts: [
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.USDC],
      },
    ],
    query: {
      refetchInterval: 10_000,
    },
  });

  const btcFresh = (data?.[0]?.result as boolean) ?? true;
  const ethFresh = (data?.[1]?.result as boolean) ?? true;

  const isOracleStale = !btcFresh || !ethFresh;
  const isTransactionPage = ['/deposit', '/redeem', '/admin'].some((p) => pathname.startsWith(p));

  if (isError) {
    return (
      <div className="bg-rose-950/80 border-b border-rose-500/30 text-rose-300 px-4 py-2 text-xs flex items-center justify-center space-x-2 backdrop-blur-md">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">Network Syncing: Connecting to live market feeds...</span>
      </div>
    );
  }

  if (isOracleStale) {
    return (
      <div className="bg-amber-950/80 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex items-center justify-center space-x-2 backdrop-blur-md">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">
          Market Sync Notice: Valuation feeds are undergoing scheduled refresh. New deposits may be
          temporarily delayed.
        </span>
      </div>
    );
  }

  if (!isConnected && isTransactionPage) {
    return (
      <div className="bg-purple-950/80 border-b border-purple-500/30 text-purple-300 px-4 py-2 text-xs flex items-center justify-center space-x-2 backdrop-blur-md">
        <Wallet className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">
          Wallet Disconnected: Connect your wallet to access portfolio operations.
        </span>
      </div>
    );
  }

  return null;
}
