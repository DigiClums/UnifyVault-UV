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
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all disabled:opacity-50"
          title={`Add ${symbol} to wallet`}
        >
          {status === 'pending' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5f8f00] dark:text-[#BFFF00]" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          ) : (
            <PlusCircle className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
          )}
          <span>{status === 'success' ? 'Added' : `Add ${symbol}`}</span>
        </button>

        <button
          onClick={handleCopy}
          className="p-1 rounded-md bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border-subtle"
          title={`Copy ${symbol} contract address (${address})`}
        >
          {copied ? (
            <Check className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border-subtle text-xs space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-full bg-[#BFFF00]/10 border border-[#BFFF00]/25 flex items-center justify-center text-[#5f8f00] dark:text-[#BFFF00] shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-xs">Add {symbol} to Wallet</h4>
            <p className="text-[11px] text-muted-foreground">
              One-click token import request for {name}.
            </p>
          </div>
        </div>

        {status === 'success' && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30">
            Added to Wallet
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={handleAddToken}
          disabled={status === 'pending'}
          className="flex-1 py-2 px-3 rounded-lg bg-[#BFFF00] hover:bg-[#a8e600] active:scale-[0.99] text-black font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 min-w-[140px]"
        >
          {status === 'pending' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Confirm in wallet...</span>
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
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
          className="py-2 px-3 rounded-lg bg-card hover:bg-muted text-foreground font-mono text-xs border border-border-subtle flex items-center space-x-1.5 transition-colors"
          title={`Copy full contract address: ${address}`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span className="text-[#5f8f00] dark:text-[#BFFF00] font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Copy Contract Address</span>
            </>
          )}
        </button>

        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-3 rounded-lg bg-card hover:bg-muted text-[#5f8f00] dark:text-[#BFFF00] font-mono text-xs border border-border-subtle flex items-center space-x-1.5 transition-colors"
          title="View contract on BaseScan explorer"
        >
          <span>View Contract</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {status === 'rejected' && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-[11px] flex items-center space-x-2 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>
            {errorMessage ||
              'Token import was cancelled. UVBTCETH was minted successfully — you can add it anytime.'}
          </span>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="p-3 rounded-lg bg-muted border border-border-subtle text-foreground text-[11px] space-y-2">
          <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Add UVBTCETH manually</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-sans">
            Your deposit is confirmed. Use the details below to view or import the token in your
            wallet manually.
          </p>
          <div className="text-foreground pt-1 space-y-1 bg-background p-2.5 rounded-md border border-border-subtle font-mono text-[11px]">
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-muted-foreground font-sans">Contract Address:</span>
              <span className="text-foreground select-all font-bold">{address}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-muted-foreground font-sans">Network:</span>
              <span className="text-foreground font-bold">Base Sepolia (Chain ID 84532)</span>
            </div>
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-muted-foreground font-sans">Symbol:</span>
              <span className="text-foreground font-bold">{symbol}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-muted-foreground font-sans">Decimals:</span>
              <span className="text-foreground font-bold">{decimals}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
