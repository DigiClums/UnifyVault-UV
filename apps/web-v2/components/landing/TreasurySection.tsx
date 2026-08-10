'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, Eye, FileText } from 'lucide-react';

export function TreasurySection() {
  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/40 px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-blue/70 mb-3 font-mono">
            Protocol Treasury
          </p>

          <div className="space-y-3 mb-5">
            <div className="flex items-start space-x-3">
              <Eye className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">On-chain reserves — fully auditable</span>
            </div>
            <div className="flex items-start space-x-3">
              <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">Fee transparency — every basis point</span>
            </div>
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <span className="text-sm text-slate-300">
                Auditable activity — verifiable on Base
              </span>
            </div>
          </div>

          <a
            href="https://app.unifyvault.xyz/treasury"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold hover:bg-accent-blue/20 transition-colors"
          >
            <span>View Treasury</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
