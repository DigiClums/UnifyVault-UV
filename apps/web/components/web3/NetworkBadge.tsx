'use client';

import * as React from 'react';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function NetworkBadge() {
  const { isConnected } = useWallet();
  const { chain, isSupported } = useNetwork();

  if (!isConnected) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors select-none ${
        isSupported
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-destructive/10 border-destructive/20 text-destructive'
      }`}
    >
      {isSupported ? (
        <>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{chain?.name}</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
          <span>Unsupported ({chain?.name || 'Unknown Chain'})</span>
        </>
      )}
    </div>
  );
}
