'use client';

import React, { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';

function getAppBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://app.unifyvault.xyz';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin;
  }
  return 'https://app.unifyvault.xyz';
}

export function LandingFooter() {
  const appBase = useMemo(() => getAppBaseUrl(), []);

  return (
    <footer className="border-t border-slate-800/40 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-blue shrink-0" />
          <span className="text-xs font-semibold text-slate-400">UnifyVault.xyz</span>
          <span className="text-slate-700">·</span>
          <span className="text-[11px] text-slate-500">
            Multi-Asset DeFi Infrastructure on Base
          </span>
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-slate-500">
          <a href={`${appBase}/`} className="hover:text-slate-300 transition-colors">
            App
          </a>
          <a href={`${appBase}/treasury`} className="hover:text-slate-300 transition-colors">
            Treasury
          </a>
          <a href={`${appBase}/analytics`} className="hover:text-slate-300 transition-colors">
            Analytics
          </a>
          <a
            href="https://docs.unifyvault.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-300 transition-colors"
          >
            Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
