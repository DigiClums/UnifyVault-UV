'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Menu, X, ArrowRight } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';

interface DocsHeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function DocsHeader({ onToggleSidebar, isSidebarOpen }: DocsHeaderProps) {
  const protocol = useUnifiedProtocolData();
  const uvbePrice = protocol.sharePriceNumber || 1.022;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle docs navigation"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 bg-transparent flex items-center justify-center overflow-hidden shrink-0">
              <img
                src="/branding/uvbe-logo.svg"
                alt="UnifyVault"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                UnifyVault
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#BFFF00]/15 text-[#BFFF00] text-[10px] font-mono font-black border border-[#BFFF00]/30">
                DOCS
              </span>
            </div>
          </Link>
        </div>

        {/* Center/Right: Live NAV Pill & App Links */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/15 text-xs font-mono">
            <img src="/branding/uvbe-logo.svg" alt="UVBE" className="w-3.5 h-3.5 object-contain" />
            <span className="text-white/60">UVBE:</span>
            <span className="font-black text-[#BFFF00]">${uvbePrice.toFixed(4)}</span>
          </div>

          <a
            href="https://app.unifyvault.xyz"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black shadow-[2px_2px_0_#000] transition-all cursor-pointer"
          >
            <span>Launch DApp</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
