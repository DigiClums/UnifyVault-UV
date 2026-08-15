'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Menu, X, ExternalLink } from 'lucide-react';

const navItems = [
  { href: '/portfolio', label: 'Protocol' },
  { href: '/treasury', label: 'Treasury' },
  { href: '/analytics', label: 'Analytics' },
];

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border-subtle/80 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 group min-w-0 shrink">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#BFFF00] border-2 border-black p-0.5 shadow-[2px_2px_0_#000] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-black dark:text-[#BFFF00]" />
            </div>
          </div>
          <span className="text-sm sm:text-lg font-bold text-foreground tracking-tight truncate">
            UnifyVault
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Landing Navigation" className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://docs.unifyvault.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </nav>

        {/* Desktop CTA + Mobile Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <a
            href="https://app.unifyvault.xyz/"
            className="hidden sm:inline-flex px-4 py-1.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-bold border-2 border-black shadow-[2px_2px_0_#000] transition-all cursor-pointer"
          >
            Launch App
          </a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              <a
                href="https://app.unifyvault.xyz/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-sm font-bold border-2 border-black shadow-[2px_2px_0_#000] transition-colors"
              >
                Launch App
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
