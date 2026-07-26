'use client';

import * as React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';

export function WalletSummaryBar() {
  const { address, isConnected, connect } = useWallet();
  const { chainId, isSupported, switchChain } = useNetwork();
  const { indexTokenAddress } = useIndexTokenAddress();

  const usdcAddress = React.useMemo<`0x${string}`>(() => {
    if (chainId === 8453) return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    return '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }, [chainId]);

  const { balance: usdcBalanceRaw } = useTokenBalance(usdcAddress);
  const { balance: shareBalanceRaw } = useTokenBalance(indexTokenAddress);

  const usdcFormatted =
    usdcBalanceRaw !== undefined ? (Number(usdcBalanceRaw) / 1e6).toFixed(2) : '0.00';
  const shareFormatted =
    shareBalanceRaw !== undefined ? (Number(shareBalanceRaw) / 1e18).toFixed(4) : '0.0000';

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-4 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            🔑
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Wallet Not Connected</p>
            <p className="text-xs text-muted-foreground">
              Connect your Web3 wallet to access your balances and perform vault transactions.
            </p>
          </div>
        </div>
        <button
          onClick={() => connect?.()}
          className="w-full sm:w-auto rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
            ⚠️
          </div>
          <div>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              Unsupported Network
            </p>
            <p className="text-xs text-muted-foreground">
              Please switch your wallet network to Base Sepolia (Chain ID: 84532).
            </p>
          </div>
        </div>
        <button
          onClick={() => switchChain?.()}
          className="w-full sm:w-auto rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-amber-500 transition-all shadow-md"
        >
          Switch Network
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-4 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold font-mono text-sm">
          🟢
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono text-foreground">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              Base Sepolia
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Connected Active Web3 Session</p>
        </div>
      </div>

      <div className="flex items-center gap-6 font-mono text-xs w-full md:w-auto justify-between md:justify-end">
        <div className="text-right">
          <span className="text-[11px] text-muted-foreground block">USDC Balance</span>
          <span className="font-bold text-foreground text-sm">${usdcFormatted} USDC</span>
        </div>
        <div className="h-8 w-px bg-border/80" />
        <div className="text-right">
          <span className="text-[11px] text-muted-foreground block">UV Share Balance</span>
          <span className="font-bold text-primary text-sm">{shareFormatted} UVBTCETH</span>
        </div>
      </div>
    </div>
  );
}
