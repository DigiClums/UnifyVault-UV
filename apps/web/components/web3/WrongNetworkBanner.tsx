'use client';

import * as React from 'react';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ACTIVE_CHAIN } from '../../lib/config/chains';

export function WrongNetworkBanner() {
  const { isConnected } = useWallet();
  const { isSupported, switchChain, switchChainPending, errorMessage } = useNetwork();

  if (!isConnected || isSupported) return null;

  return (
    <div className="w-full bg-destructive/10 border-b border-destructive/25 py-2.5 px-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 flex-wrap">
        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
        <span className="font-medium text-foreground">
          Wrong Network. Please connect your wallet to {ACTIVE_CHAIN.name}.
        </span>
        {errorMessage && <span className="text-destructive font-semibold">({errorMessage})</span>}
      </div>
      <button
        onClick={() => switchChain(ACTIVE_CHAIN.id)}
        disabled={switchChainPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white font-semibold transition-colors disabled:opacity-50 text-xs shrink-0"
      >
        <RefreshCw className={`w-3 h-3 ${switchChainPending ? 'animate-spin' : ''}`} />
        <span>Switch to {ACTIVE_CHAIN.name}</span>
      </button>
    </div>
  );
}
