'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  LockKeyhole,
  FileCheck2,
  Layers3,
  Zap,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { formatUSD } from '../../lib/math';

export function HeroSection() {
  const livePrices = useLivePrices();
  const protocol = useUnifiedProtocolData();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const uvbePrice = protocol.sharePriceNumber || 1.022;
  const btcWeight = protocol.targetBtcBps !== undefined ? protocol.targetBtcBps / 100 : 60;
  const ethWeight = protocol.targetEthBps !== undefined ? protocol.targetEthBps / 100 : 40;

  return (
    <section className="relative overflow-hidden bg-black px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16 lg:pb-24">
      {/* Background Gradients & Grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full bg-[#BFFF00]/[0.08] blur-[140px]" />
        <div className="absolute top-1/3 right-0 h-[460px] w-[460px] rounded-full bg-blue-500/[0.04] blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[120px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(191,255,0,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(191,255,0,.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        {/* Left Column: Hero Copy & Actions */}
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#BFFF00]/30 bg-[#BFFF00]/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[0.18em] text-[#BFFF00] font-mono shadow-[0_0_20px_rgba(191,255,0,0.15)]">
            <span className="h-2 w-2 rounded-full bg-[#BFFF00] animate-ping" />
            <span>BASE MAINNET · DECENTRALIZED ASSET SUITE</span>
          </div>

          <h1 className="max-w-2xl text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-[0.95] text-white">
            INSTITUTIONAL
            <span className="mt-1.5 block text-transparent bg-clip-text bg-gradient-to-r from-[#BFFF00] via-[#d7ff66] to-white">
              BTC + ETH INDEX
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Transparent exposure to premier crypto assets through an audited, non-custodial
            portfolio. Features real-time Pyth Oracle pricing, 1-tap rapid predictions, and
            automated cost-basis accounting.
          </p>

          {/* CTA Buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="/app-home"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border-2 border-black bg-[#BFFF00] px-6 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] transition hover:bg-[#d0ff66] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            >
              <span>Launch DApp</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/staking"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-white/20 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition hover:border-[#BFFF00]/50 hover:bg-[#BFFF00]/10 hover:text-[#BFFF00]"
            >
              <Sparkles className="h-4 w-4 text-[#BFFF00]" />
              <span>Staking Vaults</span>
            </Link>
          </div>

          {/* Core Trust Badges */}
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5">
            {[
              { icon: Layers3, label: 'ON-CHAIN ACCOUNTING' },
              { icon: LockKeyhole, label: 'NON-CUSTODIAL' },
              { icon: FileCheck2, label: 'TIMELOCK 48H' },
              { icon: ShieldCheck, label: 'DEPLOYED ON BASE' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-white/50 font-mono"
              >
                <Icon className="h-3.5 w-3.5 text-[#BFFF00]" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live UVBE Token Showcase Card */}
        <div className="relative">
          <div className="relative rounded-3xl bg-slate-900/90 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#BFFF00] backdrop-blur-xl space-y-5 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#BFFF00]/10 rounded-full blur-2xl pointer-events-none" />

            {/* Token Header with Original Logo */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-transparent flex items-center justify-center shrink-0">
                  <img
                    src="/branding/uvbe-logo.svg"
                    alt="UVBE Token"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>UVBE Index Coin</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#BFFF00]/15 text-[#BFFF00] text-[10px] font-mono font-black border border-[#BFFF00]/30">
                      LIVE NAV
                    </span>
                  </h3>
                  <p className="text-xs text-white/50 font-mono">UnifyVault Benchmark Index</p>
                </div>
              </div>
            </div>

            {/* Live Token Price Display */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 font-mono">
                Current Net Asset Value (NAV)
              </span>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                  <span className="text-[#BFFF00]">$</span>
                  <span>{uvbePrice.toFixed(4)}</span>
                  <span className="text-xs font-semibold text-white/40">USD</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +2.20%
                </span>
              </div>
            </div>

            {/* Allocation Split */}
            <div className="space-y-2 font-mono">
              <div className="flex justify-between text-xs text-white/70 font-semibold">
                <span className="flex items-center gap-1 text-amber-400">
                  <span>●</span> cbBTC ({btcWeight}%)
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span>●</span> WETH ({ethWeight}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-blue-500 overflow-hidden flex border border-black/30">
                <div
                  className="h-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${btcWeight}%` }}
                />
              </div>
            </div>

            {/* Live Oracle Feeds Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-white/40 block">BTC / USD Pyth</span>
                <span className="text-sm font-bold text-amber-400">
                  {livePrices.isLive ? formatUSD(livePrices.btcPriceUSD) : '$78,363'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-white/40 block">ETH / USD Pyth</span>
                <span className="text-sm font-bold text-blue-400">
                  {livePrices.isLive ? formatUSD(livePrices.ethPriceUSD) : '$2,487'}
                </span>
              </div>
            </div>

            {/* Quick Link into App */}
            <Link
              href="/deposit"
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-[#BFFF00] hover:text-black text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 border border-white/15"
            >
              <span>Mint UVBE Shares</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
