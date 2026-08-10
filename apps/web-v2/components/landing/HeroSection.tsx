'use client';

import React from 'react';
import { ShieldCheck, ArrowRight, ChevronDown } from 'lucide-react';
import { useLivePrices } from '../../hooks/useLivePrices';
import { formatUSD } from '../../lib/math';

export function HeroSection() {
  const livePrices = useLivePrices();

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-12 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 lg:pb-32 text-center overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-blue/5 blur-[120px]" />
        <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-500/4 blur-[100px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Eyebrow */}
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-accent-blue/80 mb-4 sm:mb-6 font-mono">
          UnifyVault.xyz
        </p>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-4 sm:mb-6">
          Multi-Asset
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue via-indigo-400 to-accent-cyan">
            DeFi Infrastructure
          </span>
        </h1>

        {/* Supporting text */}
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed mb-8 sm:mb-10 px-2">
          Transparent, on-chain infrastructure for multi-asset strategies, portfolio management and
          protocol-native financial products.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 sm:mb-14">
          <a
            href="https://app.unifyvault.xyz/"
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-sm font-semibold shadow-glow transition-all duration-200 hover:scale-[1.02]"
          >
            <span>Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={scrollToFeatures}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-sm font-semibold transition-all duration-200 hover:border-slate-600"
          >
            <span>Explore Protocol</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Live Price Ticker — Compact */}
        <div className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs font-mono mb-8 sm:mb-10">
          {livePrices.isLive ? (
            <>
              <span className="text-amber-400 font-semibold">BTC</span>
              <span className="text-slate-300">{formatUSD(livePrices.btcPriceUSD)}</span>
              <span className="text-slate-600 mx-1">·</span>
              <span className="text-blue-400 font-semibold">ETH</span>
              <span className="text-slate-300">{formatUSD(livePrices.ethPriceUSD)}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-slate-500">Loading market data…</span>
            </>
          )}
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {[
            { label: 'ON-CHAIN', desc: 'Base Network' },
            { label: 'NON-CUSTODIAL', desc: 'Self-custody' },
          ].map((signal) => (
            <div key={signal.label} className="flex items-center space-x-2 group">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 group-hover:text-accent-blue transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {signal.label}
              </span>
              <span className="text-[10px] text-slate-600 hidden sm:inline">{signal.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
