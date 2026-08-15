'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, Eye, FileText } from 'lucide-react';

export function TreasurySection() {
  return (
    <section className="px-4 sm:px-6 pb-14 sm:pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/[0.025] border border-white/[0.08] px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00]/80 mb-3 font-mono">
            Protocol Treasury
          </p>

          <div className="space-y-3 mb-5">
            <div className="flex items-start space-x-3">
              <Eye className="w-4 h-4 text-[#BFFF00]/80 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">On-chain reserves — fully auditable</span>
            </div>
            <div className="flex items-start space-x-3">
              <FileText className="w-4 h-4 text-[#BFFF00]/80 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">Fee transparency — every basis point</span>
            </div>
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-4 h-4 text-[#BFFF00]/80 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">
                Auditable activity — verifiable on Base
              </span>
            </div>
          </div>

          <a
            href="https://app.unifyvault.xyz/treasury"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#BFFF00]/10 border border-[#BFFF00]/25 text-[#BFFF00] text-xs font-semibold hover:bg-[#BFFF00]/15 transition-colors"
          >
            <span>View Treasury</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
