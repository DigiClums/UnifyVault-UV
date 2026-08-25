'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ThemeToggle } from '../common/ThemeToggle';

/**
 * Minimal top bar for the admin application (v2.unifyvault.xyz).
 * Provides branding, wallet connection, and theme toggle without
 * exposing any public-app navigation.
 */
export function AdminHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border-subtle/80 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-transparent flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/branding/uvbe-logo.svg"
              alt="UnifyVault"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-lg font-bold text-foreground tracking-tight">
              UnifyVault
            </span>
            <span className="hidden sm:inline text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/20 shrink-0 font-mono">
              Protocol Ops
            </span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <Link
            href="/"
            className="px-2.5 py-1.5 rounded-xl bg-card border border-border-subtle text-xs font-bold text-foreground hover:bg-[#BFFF00] hover:text-black transition-all flex items-center gap-1"
          >
            <span>Exit Admin</span>
          </Link>
          <ThemeToggle />
          <div className="scale-90 sm:scale-100 origin-right flex items-center shrink">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
