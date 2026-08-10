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
    <section className="relative overflow-hidden bg-black px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16 lg:pb-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/3 h-[520px] w-[520px] rounded-full bg-[#BFFF00]/[0.06] blur-[130px]" />
        <div className="absolute top-1/4 right-0 h-[460px] w-[460px] rounded-full bg-[#BFFF00]/[0.035] blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[120px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(191,255,0,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(191,255,0,.5) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#BFFF00]/20 bg-[#BFFF00]/[0.06] px-3 py-1.5 text-[9px] font-bold tracking-[0.18em] text-[#BFFF00] font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[#BFFF00] shadow-[0_0_12px_rgba(191,255,0,.65)]" />
            BASE · NON-CUSTODIAL INDEX
          </div>

          <h1 className="max-w-2xl text-5xl font-black tracking-[-0.045em] leading-[0.92] text-white sm:text-6xl lg:text-8xl">
            BTC + ETH
            <span className="mt-2 block text-[#BFFF00]">ON-CHAIN INDEX</span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
            Transparent exposure to the two leading assets through one audited, non-custodial portfolio.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="https://app.unifyvault.xyz/" className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-black bg-[#BFFF00] px-5 py-2.5 text-sm font-black text-black shadow-[4px_4px_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#000]">
              Launch App <ArrowRight className="h-4 w-4" />
            </a>
            <button onClick={scrollToFeatures} className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-white/15 bg-white/[0.035] px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#BFFF00]/40 hover:bg-[#BFFF00]/[0.05] hover:text-[#BFFF00]">
              Explore Protocol <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/10 pt-5">
            {[
              { icon: Layers3, label: 'ON-CHAIN' },
              { icon: LockKeyhole, label: 'NON-CUSTODIAL' },
              { icon: FileCheck2, label: 'AUDITABLE' },
              { icon: ShieldCheck, label: 'BUILT ON BASE' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.14em] text-white/35">
                <Icon className="h-3.5 w-3.5 text-[#BFFF00]" />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 font-mono text-xs">
            <span className="font-semibold text-[#BFFF00]">BTC</span>
            <span className="text-white/70">{livePrices.isLive ? formatUSD(livePrices.btcPriceUSD) : '—'}</span>
            <span className="text-white/20">/</span>
            <span className="font-semibold text-[#BFFF00]">ETH</span>
            <span className="text-white/70">{livePrices.isLive ? formatUSD(livePrices.ethPriceUSD) : '—'}</span>
            {livePrices.isLive && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#BFFF00] animate-pulse" />}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-5 rounded-[28px] bg-[#BFFF00]/[0.06] blur-2xl" />
          <div className="relative overflow-hidden border-2 border-white/10 bg-[#0b0b0b]/95 p-5 shadow-[6px_6px_0_#BFFF00] backdrop-blur-xl sm:p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-[#BFFF00]/70" />
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div>
                <div className="text-xl font-black tracking-tight text-white">UVBTCETH</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">Multi-Asset Index</div>
              </div>
              <span className="border border-[#BFFF00]/30 bg-[#BFFF00]/10 px-2 py-1 text-[8px] font-bold tracking-[0.14em] text-[#BFFF00]">PRIMARY STRATEGY</span>
            </div>

            <div className="py-6">
              <div className="text-[9px] font-bold tracking-[0.16em] text-white/35">CURRENT NAV</div>
              <div className="mt-2 font-mono text-4xl font-black tracking-tight text-white sm:text-5xl">
                {protocol.isLoading ? '—' : formatNAVUSD(nav)}
              </div>
            </div>

            <div className="space-y-5 border-t border-white/10 pt-5">
              {[
                { label: 'BTC', weight: btcWeight },
                { label: 'ETH', weight: ethWeight },
              ].map((asset) => (
                <div key={asset.label}>
                  <div className="mb-2 flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-white/75">{asset.label}</span>
                    <span className="font-bold text-[#BFFF00]">{asset.weight.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden bg-white/[0.07]">
                    <div className="h-full bg-[#BFFF00] transition-all duration-700" style={{ width: `${asset.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-[9px] leading-5 text-white/30">
              Configured UVBTCETH target allocation · NAV sourced from the existing protocol data.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
