'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Menu, X, ExternalLink, Zap, Sparkles, TrendingUp } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';

const navItems = [
  { href: '/app-home', label: 'Vault Index' },
  { href: '/staking', label: 'Staking', icon: Sparkles },
  { href: '/p2p', label: 'P2P Escrow' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/analytics', label: 'Analytics' },
];

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const protocol = useUnifiedProtocolData();
  const uvbePrice = protocol.sharePriceNumber || 1.0;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center space-x-2 group min-w-0 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-transparent flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
              <img
                src="/branding/uvbe-logo.svg"
                alt="UnifyVault"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-lg font-black text-white tracking-tight leading-none">
                UnifyVault
              </span>
              <span className="text-[9px] font-mono font-bold text-[#BFFF00] tracking-wider uppercase mt-0.5">
                Protocol V2
              </span>
            </div>
          </Link>

          {/* UVBE Token Live Price Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/15 text-xs font-mono">
            <img src="/branding/uvbe-logo.svg" alt="UVBE" className="w-3.5 h-3.5 object-contain" />
            <span className="text-white/60 font-semibold">UVBE:</span>
            <span className="font-black text-[#BFFF00]">${uvbePrice.toFixed(4)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse" />
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav aria-label="Landing Navigation" className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-150"
            >
              {item.icon && <item.icon className="w-3.5 h-3.5 text-[#BFFF00]" />}
              <span>{item.label}</span>
            </Link>
          ))}
          <a
            href="https://docs.unifyvault.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-150"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </nav>

        {/* Desktop CTA + Mobile Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <Link
            href="/app-home"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border-2 border-black shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <span>Launch DApp</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border-subtle/80 bg-background/95 backdrop-blur-xl">
          <div className="px-3 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://docs.unifyvault.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <span>Docs</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <div className="pt-2">
              <Link
                href="/app-home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-sm font-bold border-2 border-black shadow-[2px_2px_0_#000] transition-colors"
              >
                Launch App
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
