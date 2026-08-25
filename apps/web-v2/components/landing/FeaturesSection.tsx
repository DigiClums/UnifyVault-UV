import React from 'react';
import Link from 'next/link';
import {
  Layers,
  PieChart,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Vault,
  Zap,
  Sparkles,
  ArrowLeftRight,
  ShieldCheck,
  Calculator,
} from 'lucide-react';

const ecosystemFeatures = [
  {
    icon: Zap,
    title: 'Flash 30s Markets',
    badge: 'NEW',
    description: 'Ultra-fast 30-second binary prediction arena with custom 2x to 20x reward multipliers and real-time Pyth oracles.',
    href: '/predict',
  },
  {
    icon: Layers,
    title: '60/40 BTC + ETH Index',
    badge: 'CORE',
    description: 'Fully automated non-custodial index strategy backed by Coinbase cbBTC and WETH on Base.',
    href: '/portfolio',
  },
  {
    icon: Sparkles,
    title: 'UVBE Staking Vault',
    badge: 'EARN',
    description: 'Multi-tier flexible & locked staking vaults earning direct protocol yield and referral commissions.',
    href: '/staking',
  },
  {
    icon: ArrowLeftRight,
    title: 'P2P Escrow Marketplace',
    badge: 'OTC',
    description: 'Trustless OTC fiat-to-crypto escrow with auto-settlement, buyer protection, and multi-currency orders.',
    href: '/p2p',
  },
  {
    icon: Calculator,
    title: 'Dynamic Cost Basis',
    badge: 'FIFO',
    description: 'Automated on-chain portfolio accounting with FIFO & weighted tracking across all transfers and DEX swaps.',
    href: '/portfolio',
  },
  {
    icon: Vault,
    title: 'Proof of Reserve & Treasury',
    badge: 'TRANSPARENT',
    description: '100% on-chain verifiable collateral backing, timelock governance, and automated circuit breaker protections.',
    href: '/treasury',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 sm:px-6 py-14 sm:py-20 bg-black/60 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFFF00] mb-2 font-mono">
            ECOSYSTEM CAPABILITIES
          </p>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Complete Decentralized Asset Suite
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-2.5">
            Engineered on Base for microsecond settlement, gas-sponsored smart accounts, and absolute on-chain transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {ecosystemFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] border-2 border-white/10 hover:border-[#BFFF00] transition-all duration-200 shadow-[4px_4px_0_rgba(0,0,0,0.8)] hover:shadow-[4px_4px_0_#BFFF00]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 flex items-center justify-center group-hover:bg-[#BFFF00] transition-colors">
                      <Icon className="w-5 h-5 text-[#BFFF00] group-hover:text-black transition-colors" />
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-white/10 text-white/80 border border-white/15">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#BFFF00] transition-colors mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono font-semibold text-white/40 group-hover:text-[#BFFF00] transition-colors">
                  <span>Explore Feature</span>
                  <span>→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
