'use client';

import React, { useState } from 'react';
import { useSmartAccount } from '../../hooks/useSmartAccount';
import { Zap, ShieldCheck, Copy, Check, Info } from 'lucide-react';

export function SmartAccountBadge() {
  const { eoaAddress, smartAccountAddress, isAccountLoading, isGaslessSupported } =
    useSmartAccount();
  const [copiedType, setCopiedType] = useState<'eoa' | 'smart' | null>(null);

  if (!eoaAddress) return null;

  const copyToClipboard = (text: string, type: 'eoa' | 'smart') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const truncate = (addr?: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs">
      <div className="flex items-center gap-1.5 font-medium">
        <div className="w-5 h-5 rounded-full bg-[#BFFF00] text-black flex items-center justify-center font-bold text-[10px]">
          <Zap className="w-3 h-3" />
        </div>
        <span className="font-semibold text-foreground">Smart Account:</span>
        {isAccountLoading ? (
          <span className="text-muted-foreground animate-pulse">Calculating...</span>
        ) : (
          <span className="font-mono text-muted-foreground">{truncate(smartAccountAddress)}</span>
        )}
        {smartAccountAddress && (
          <button
            onClick={() => copyToClipboard(smartAccountAddress, 'smart')}
            className="p-1 hover:text-foreground text-muted-foreground transition-colors"
            title="Copy Smart Account Address"
          >
            {copiedType === 'smart' ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isGaslessSupported
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}
        >
          {isGaslessSupported ? 'Gasless Enabled (Base Sepolia)' : 'Standard EOA Mode'}
        </span>
      </div>
    </div>
  );
}
