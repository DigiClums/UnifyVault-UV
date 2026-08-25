'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Sparkles } from 'lucide-react';
import { TokenIcon } from '../ui/TokenIcon';

export function AppCTASection() {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24 bg-black border-t border-white/5 relative overflow-hidden">
      {/* Background glow behind CTA */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#BFFF00]/[0.08] blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="rounded-3xl bg-slate-900/90 border-2 border-black dark:border-white/15 p-8 sm:p-12 shadow-[6px_6px_0_#BFFF00] backdrop-blur-xl relative overflow-hidden">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-transparent flex items-center justify-center">
              <img
                src="/branding/uvbe-logo.svg"
                alt="UnifyVault"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
                }}
              />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00] mb-2 font-mono">
            GET STARTED ON BASE
          </p>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Ready to Enter UnifyVault?
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-8 max-w-lg mx-auto">
            Experience institutional-grade BTC + ETH index exposure, 30-second binary predictions, and automated portfolio accounting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app-home"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-[#BFFF00] hover:bg-[#d7ff66] text-black text-sm font-black rounded-2xl shadow-[4px_4px_0_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <span>Launch DApp Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/predict"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white text-sm font-bold rounded-2xl border border-white/20 transition-all"
            >
              <Zap className="w-4 h-4 text-[#BFFF00]" />
              <span>Try Flash 30s</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
