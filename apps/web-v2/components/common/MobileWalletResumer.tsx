'use client';

import React from 'react';
import { useMobileWalletResume } from '../../hooks/useMobileWalletResume';
import { AlertTriangle, RefreshCw, ShieldCheck, Loader2 } from 'lucide-react';

export function MobileWalletResumer() {
  const {
    isMobile,
    isConnected,
    isConnecting,
    isWrongNetwork,
    chainName,
    checkConnection,
    switchToBaseSepolia,
  } = useMobileWalletResume();

  if (!isMobile && !isWrongNetwork) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      {/* Wrong Network Warning Banner */}
      {isWrongNetwork && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
          <div className="flex items-center space-x-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Connected to {chainName}. Please switch to{' '}
              <strong className="text-white">Base Sepolia (Chain ID 84532)</strong> to interact with
              UnifyVault V2.
            </span>
          </div>
          <button
            onClick={switchToBaseSepolia}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 self-start sm:self-auto transition-colors"
          >
            Switch to Base Sepolia
          </button>
        </div>
      )}

      {/* Mobile Session Resume Indicator */}
      {isMobile && isConnecting && !isConnected && (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs flex items-center justify-between gap-2 shadow-sm font-mono">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 text-accent-blue animate-spin shrink-0" />
            <span>Connecting to mobile wallet...</span>
          </div>
          <button
            onClick={checkConnection}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-accent-blue text-[11px] font-semibold flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Check Connection</span>
          </button>
        </div>
      )}
    </div>
  );
}
