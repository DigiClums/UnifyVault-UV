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
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-violet-500 p-0.5 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 dark:from-white to-purple-400 tracking-tight">
              UnifyVault
            </span>
            <span className="hidden sm:inline text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 font-mono">
              Protocol Ops
            </span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <ThemeToggle />
          <div className="scale-90 sm:scale-100 origin-right flex items-center shrink">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
