'use client';

import React from 'react';
import { ShieldCheck, ArrowRight, ChevronDown, LockKeyhole, FileCheck2, Layers3 } from 'lucide-react';
import { useLivePrices } from '../../hooks/useLivePrices';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { formatUSD, formatNAVUSD } from '../../lib/math';

export function HeroSection() {
  const livePrices = useLivePrices();
  const protocol = useUnifiedProtocolData();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const nav = protocol.sharePriceNumber;
  const btcWeight = protocol.targetBtcBps !== undefined ? protocol.targetBtcBps / 100 : 50;
  const ethWeight = protocol.targetEthBps !== undefined ? protocol.targetEthBps / 100 : 50;

  return (
    <section className="relative overflow-hidden px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16 lg:pb-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full bg-blue-500/[0.10] blur-[130px]" />
        <div className="absolute top-1/4 right-0 h-[460px] w-[460px] rounded-full bg-indigo-500/[0.08] blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-blue-900/[0.12] blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.7) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.06] px-3 py-1.5 text-[9px] font-bold tracking-[0.18em] text-blue-200/80 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,.8)]" />
            BASE · NON-CUSTODIAL INDEX
          </div>

          <h1 className="max-w-2xl text-5xl font-black tracking-[-0.045em] leading-[0.92] text-white sm:text-6xl lg:text-8xl">
            BTC + ETH
            <span className="mt-2 block bg-gradient-to-r from-white via-blue-100 to-blue-400 bg-clip-text text-transparent">ON-CHAIN INDEX</span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            Transparent exposure to the two leading assets through one audited, non-custodial portfolio.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="https://app.unifyvault.xyz/" className="inline-flex min-h-11 items-center justify-center gap-2 border border-blue-300/30 bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_30px_rgba(59,130,246,.18)] transition hover:bg-blue-400">
              Launch App <ArrowRight className="h-4 w-4" />
            </a>
            <button onClick={scrollToFeatures} className="inline-flex min-h-11 items-center justify-center gap-2 border border-blue-300/15 bg-white/[0.035] px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-blue-300/30 hover:bg-white/[0.06]">
              Explore Protocol <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-blue-200/10 pt-5">
            {[
              { icon: Layers3, label: 'ON-CHAIN' },
              { icon: LockKeyhole, label: 'NON-CUSTODIAL' },
              { icon: FileCheck2, label: 'AUDITABLE' },
              { icon: ShieldCheck, label: 'BUILT ON BASE' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.14em] text-slate-500">
                <Icon className="h-3.5 w-3.5 text-blue-400/80" />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 font-mono text-xs">
            <span className="text-blue-300 font-semibold">BTC</span>
            <span className="text-slate-300">{livePrices.isLive ? formatUSD(livePrices.btcPriceUSD) : '—'}</span>
            <span className="text-slate-700">/</span>
            <span className="text-indigo-300 font-semibold">ETH</span>
            <span className="text-slate-300">{livePrices.isLive ? formatUSD(livePrices.ethPriceUSD) : '—'}</span>
            {livePrices.isLive && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-5 rounded-[28px] bg-blue-500/[0.07] blur-2xl" />
          <div className="relative overflow-hidden border border-blue-300/15 bg-slate-950/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,.45)] backdrop-blur-xl sm:p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/70 to-transparent" />
            <div className="flex items-start justify-between border-b border-blue-100/10 pb-5">
              <div>
                <div className="text-xl font-black tracking-tight text-white">UVBTCETH</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Multi-Asset Index</div>
              </div>
              <span className="border border-blue-300/20 bg-blue-400/10 px-2 py-1 text-[8px] font-bold tracking-[0.14em] text-blue-200">PRIMARY STRATEGY</span>
            </div>

            <div className="py-6">
              <div className="text-[9px] font-bold tracking-[0.16em] text-slate-500">CURRENT NAV</div>
              <div className="mt-2 font-mono text-4xl font-black tracking-tight text-white sm:text-5xl">
                {protocol.isLoading ? '—' : formatNAVUSD(nav)}
              </div>
            </div>

            <div className="space-y-5 border-t border-blue-100/10 pt-5">
              {[
                { label: 'BTC', weight: btcWeight, track: 'bg-blue-400' },
                { label: 'ETH', weight: ethWeight, track: 'bg-indigo-400' },
              ].map((asset) => (
                <div key={asset.label}>
                  <div className="mb-2 flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-slate-200">{asset.label}</span>
                    <span className="font-bold text-white">{asset.weight.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden bg-white/[0.06]"><div className={`h-full ${asset.track}`} style={{ width: `${asset.weight}%` }} /></div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-blue-100/10 pt-4 text-[9px] leading-5 text-slate-500">
              Configured UVBTCETH target allocation · NAV sourced from the existing protocol data.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
