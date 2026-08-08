'use client';

import React, { useState } from 'react';
import { useAddTokenToWallet } from '../../hooks/useAddTokenToWallet';
import { getExplorerBaseUrl } from '../../constants';
import { useAccount } from 'wagmi';
import {
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Wallet,
} from 'lucide-react';

interface AddTokenToWalletProps {
  address?: `0x${string}`;
  symbol?: string;
  decimals?: number;
  name?: string;
  compact?: boolean;
}

export function AddTokenToWallet({
  address,
  symbol = 'UVBTCETH',
  decimals = 18,
  name = 'UnifyVault BTC-ETH Index Share',
  compact = false,
}: AddTokenToWalletProps) {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { status, errorMessage, addToken } = useAddTokenToWallet();
  const [copied, setCopied] = useState(false);

  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  const shortAddr = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const explorerUrl = `${explorerBaseUrl}/address/${address}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  const handleAddToken = async () => {
    await addToken({ address, symbol, decimals });
  };

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-1.5">
        <button
          onClick={handleAddToken}
          disabled={status === 'pending'}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          title={`Add ${symbol} to wallet`}
        >
          {status === 'pending' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-blue" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <PlusCircle className="w-3.5 h-3.5 text-accent-blue" />
          )}
          <span>{status === 'success' ? 'Added' : `Add ${symbol}`}</span>
        </button>

        <button
          onClick={handleCopy}
          className="p-1 rounded-md bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title={`Copy ${symbol} contract address (${address})`}
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs">Add {symbol} to Wallet</h4>
            <p className="text-[11px] text-slate-400">
              One-click wallet token watch request for {name}.
            </p>
          </div>
        </div>

        {status === 'success' && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Added to Wallet
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={handleAddToken}
          disabled={status === 'pending'}
          className="flex-1 py-2 px-3 rounded-lg bg-accent-blue hover:bg-blue-600 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
        >
          {status === 'pending' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Awaiting Wallet...</span>
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>{symbol} Added to Wallet</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add {symbol} to Wallet</span>
            </>
          )}
        </button>

        <button
          onClick={handleCopy}
          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs border border-slate-700 flex items-center space-x-1.5 transition-colors"
          title={`Copy full contract address: ${address}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{copied ? 'Copied!' : shortAddr}</span>
        </button>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-accent-blue border border-slate-700 transition-colors"
          title="View contract on BaseScan explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {status === 'rejected' && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center space-x-2 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>
            {errorMessage ||
              'Token import request cancelled in wallet. Click above anytime to retry.'}
          </span>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] space-y-1 font-mono">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold font-sans">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Your wallet does not support automatic token import.</span>
          </div>
          <div className="text-slate-400 pt-0.5">
            Manually import using contract address:{' '}
            <span className="text-white select-all font-bold">{address}</span>
          </div>
        </div>
      )}
    </div>
  );
}
