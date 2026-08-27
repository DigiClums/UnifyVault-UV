'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '../../hooks/useSmartAccount';
import { getExplorerBaseUrl } from '../../constants';
import { Zap, Copy, Check, ExternalLink } from 'lucide-react';

export function SmartAccountBadge() {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
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

  const smartExplorerUrl = smartAccountAddress
    ? `${explorerBaseUrl}/address/${smartAccountAddress}`
    : '#';

  return (
    <div className="w-full max-w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs box-border overflow-hidden">
      <div className="flex items-center gap-1.5 font-medium min-w-0 max-w-full flex-wrap">
        <div className="w-5 h-5 rounded-full bg-[#BFFF00] text-black flex items-center justify-center font-bold text-[10px] shrink-0">
          <Zap className="w-3 h-3" />
        </div>
        <span className="font-semibold text-foreground shrink-0">Smart Account:</span>
        {isAccountLoading ? (
          <span className="text-muted-foreground animate-pulse shrink-0">Calculating...</span>
        ) : (
          <span className="font-mono text-muted-foreground truncate max-w-[120px] sm:max-w-none">
            {truncate(smartAccountAddress)}
          </span>
        )}
        {smartAccountAddress && (
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => copyToClipboard(smartAccountAddress, 'smart')}
              className="p-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
              title="Copy Smart Account Address"
            >
              {copiedType === 'smart' ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <a
              href={smartExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:text-foreground text-muted-foreground transition-colors"
              title="View Smart Account on BaseScan"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:ml-auto shrink-0 max-w-full">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider truncate ${
            isGaslessSupported
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}
        >
          {isGaslessSupported
            ? `Gasless Enabled (${chain?.name || 'Base Sepolia'})`
            : 'Standard EOA Mode'}
        </span>
      </div>
    </div>
  );
}
