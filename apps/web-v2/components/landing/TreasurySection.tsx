'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Eye, FileText, Lock, ExternalLink } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';

export function TreasurySection() {
  const protocol = useUnifiedProtocolData();

  return (
    <section className="px-4 sm:px-6 py-14 sm:py-20 bg-black border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl bg-slate-900/80 border-2 border-black dark:border-white/15 p-6 sm:p-8 shadow-[6px_6px_0_#BFFF00] backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00] mb-1 font-mono">
                PROOF OF RESERVE
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Verifiable On-Chain Treasury
              </h3>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Every collateral satoshi and wei is segregated in non-custodial contracts on Base.
              </p>
            </div>
            <Link
              href="/treasury"
              className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs font-sans shadow-[3px_3px_0_#000] hover:bg-[#d0ff66] transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>View Live Reserves</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center text-[#BFFF00]">
                <Eye className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">Transparent Custody</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                No off-chain rehypothecation. Assets are locked in open-source Base contracts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center text-[#BFFF00]">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">0.25% Low Protocol Fee</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Predictable and direct. No hidden management spreads or exit penalties.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center text-[#BFFF00]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-white text-sm">48-Hour Timelock</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Critical parameter adjustments are enforced by on-chain timelock contracts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
