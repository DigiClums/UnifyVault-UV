'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';

export function AppCTASection() {
  return (
    <section className="px-4 sm:px-6 pb-20 sm:pb-28">
      <div className="max-w-xl mx-auto text-center">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-900/40 border border-slate-800/40 px-6 py-8 sm:px-8 sm:py-10">
          {/* Accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-accent-blue/60 to-transparent" />

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Ready to enter UnifyVault?
          </h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Access the full protocol — portfolio management, deposits, and on-chain transparency.
          </p>

          <a
            href="https://app.unifyvault.xyz/"
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-sm font-semibold shadow-glow transition-all duration-200 hover:scale-[1.02]"
          >
            <span>Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
