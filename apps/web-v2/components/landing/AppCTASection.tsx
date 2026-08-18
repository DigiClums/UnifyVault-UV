'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function AppCTASection() {
  return (
    <section className="px-4 sm:px-6 pb-16 sm:pb-24">
      <div className="max-w-xl mx-auto text-center">
        <div className="relative overflow-hidden bg-white/[0.025] border border-white/[0.08] px-6 py-8 sm:px-8 sm:py-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#BFFF00]/70 to-transparent" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#BFFF00]/[0.04] blur-3xl pointer-events-none" />

          <h2 className="relative text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
            Ready to enter UnifyVault?
          </h2>
          <p className="relative text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Access the full protocol — portfolio management, deposits, and on-chain transparency.
          </p>

          <Link
            href="/app-home"
            className="relative inline-flex items-center space-x-2 px-6 py-2.5 bg-[#BFFF00] hover:bg-[#d7ff66] text-black text-sm font-black shadow-[4px_4px_0_#000] transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#000]"
          >
            <span>Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
