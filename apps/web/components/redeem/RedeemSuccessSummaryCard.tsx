'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { getExplorerBaseUrl } from '../../lib/config/network';

interface RedeemSuccessSummaryCardProps {
  sharesRedeemed: string;
  grossAssets: string;
  feePaid: string;
  netReceived: string;
  txHash?: `0x${string}`;
  onReset: () => void;
}

export function RedeemSuccessSummaryCard({
  sharesRedeemed,
  grossAssets,
  feePaid,
  netReceived,
  txHash,
  onReset,
}: RedeemSuccessSummaryCardProps) {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-3xl border border-purple-500/40 bg-purple-500/5 dark:bg-purple-950/20 p-6 sm:p-8 backdrop-blur-xl text-foreground shadow-2xl">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="h-16 w-16 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-3xl font-bold mb-3 border border-purple-500/30 animate-bounce">
          ✓
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
          Redemption Confirmed & Paid
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your UVBTCETH index shares have been burned and your net USDC payout has been transferred.
        </p>
      </div>

      <div className="space-y-3 font-mono text-xs mb-6 rounded-2xl bg-card/80 dark:bg-[#111827]/80 p-4 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Shares Redeemed</span>
          <span className="font-bold text-foreground">{sharesRedeemed} UVBTCETH</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Gross Asset Valuation</span>
          <span className="text-muted-foreground">${grossAssets} USDC</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Protocol Redeem Fee (0.25%)</span>
          <span className="text-muted-foreground">${feePaid} USDC</span>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
          <span className="text-foreground">Net USDC Payout Received</span>
          <span className="text-purple-600 dark:text-purple-400">${netReceived} USDC</span>
        </div>
      </div>

      {txHash && (
        <div className="mb-6 p-3 rounded-xl bg-secondary/50 border border-border/80 text-xs font-mono flex items-center justify-between gap-2">
          <span className="text-muted-foreground truncate">
            Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-[11px] bg-secondary hover:bg-accent border border-border rounded-lg text-foreground transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={`${explorerBaseUrl}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg font-bold transition-colors"
            >
              Basescan ↗
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/portfolio"
          className="w-full py-3.5 px-4 rounded-xl bg-purple-600 text-white font-bold text-center text-xs hover:bg-purple-500 transition-all shadow-md flex items-center justify-center gap-1.5"
        >
          Portfolio ➔
        </Link>
        <Link
          href="/dashboard"
          className="w-full py-3.5 px-4 rounded-xl bg-secondary text-foreground font-semibold text-center text-xs hover:bg-accent border border-border transition-colors flex items-center justify-center"
        >
          Dashboard
        </Link>
        <button
          onClick={onReset}
          className="w-full py-3.5 px-4 rounded-xl bg-secondary text-foreground font-semibold text-center text-xs hover:bg-accent border border-border transition-colors"
        >
          Redeem More
        </button>
      </div>
    </div>
  );
}
