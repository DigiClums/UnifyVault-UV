'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, PieChart, ArrowDownRight, ArrowUpRight, BarChart3, Vault } from 'lucide-react';

const features = [
  { icon: Layers, label: 'Multi-Asset Strategies', href: '/portfolio' },
  { icon: PieChart, label: 'Portfolio Management', href: '/portfolio' },
  { icon: ArrowDownRight, label: 'Deposit & Redeem', href: '/deposit' },
  { icon: Vault, label: 'Transparent Treasury', href: '/treasury' },
  { icon: BarChart3, label: 'Protocol Analytics', href: '/analytics' },
  { icon: ArrowUpRight, label: 'On-Chain Accounting', href: '/portfolio' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 sm:px-6 pb-14 sm:pb-20">
      <div className="max-w-4xl mx-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00]/80 mb-3 text-center font-mono">
          Core Capabilities
        </p>
        <h2 className="text-xl sm:text-2xl font-black text-white text-center tracking-tight mb-7 sm:mb-9">
          Protocol Infrastructure
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.label}
                href={feature.href}
                className="group flex flex-col items-center text-center p-4 sm:p-5 bg-white/[0.025] border border-white/[0.08] hover:border-[#BFFF00]/30 hover:bg-[#BFFF00]/[0.035] transition-all duration-200"
              >
                <div className="w-9 h-9 bg-[#BFFF00]/10 border border-[#BFFF00]/20 flex items-center justify-center mb-3 group-hover:bg-[#BFFF00]/15 group-hover:border-[#BFFF00]/35 transition-colors">
                  <Icon className="w-4 h-4 text-[#BFFF00]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-300 group-hover:text-white transition-colors leading-tight">
                  {feature.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
