'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink, Github, Send, Twitter, Lock, CheckCircle2 } from 'lucide-react';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';

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
  const protocol = useUnifiedProtocolData();
  const uvbePrice = protocol.sharePriceNumber || 1.022;

  return (
    <footer className="border-t border-white/10 bg-black pt-12 pb-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Footer Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-transparent flex items-center justify-center overflow-hidden">
                <img
                  src="/branding/uvbe-logo.svg"
                  alt="UnifyVault"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/branding/uvbe-token-logo.png';
                  }}
                />
              </div>
              <span className="text-lg font-black text-white tracking-tight">UnifyVault</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Decentralized institutional multi-asset index protocol on Base network.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#BFFF00]">
              <span className="w-2 h-2 rounded-full bg-[#BFFF00] animate-pulse" />
              <span>UVBE NAV: ${uvbePrice.toFixed(4)} USD</span>
            </div>
          </div>

          {/* DApp Products */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">
              DApp Products
            </h4>
            <ul className="space-y-2 text-white/60">
              <li>
                <a href={`${appBase}/app-home`} className="hover:text-[#BFFF00] transition-colors">
                  Vault Overview
                </a>
              </li>
              <li>
                <a href={`${appBase}/deposit`} className="hover:text-[#BFFF00] transition-colors">
                  Deposit Collateral
                </a>
              </li>
              <li>
                <a href={`${appBase}/redeem`} className="hover:text-[#BFFF00] transition-colors">
                  Redeem Shares
                </a>
              </li>
              <li>
                <a href={`${appBase}/staking`} className="hover:text-[#BFFF00] transition-colors">
                  Staking Vaults
                </a>
              </li>
              <li>
                <a href={`${appBase}/p2p`} className="hover:text-[#BFFF00] transition-colors">
                  P2P OTC Escrow
                </a>
              </li>
            </ul>
          </div>

          {/* Protocol & Analytics */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">
              Protocol
            </h4>
            <ul className="space-y-2 text-white/60">
              <li>
                <a href={`${appBase}/portfolio`} className="hover:text-[#BFFF00] transition-colors">
                  Portfolio Accounting
                </a>
              </li>
              <li>
                <a href={`${appBase}/treasury`} className="hover:text-[#BFFF00] transition-colors">
                  Treasury Reserves
                </a>
              </li>
              <li>
                <a href={`${appBase}/analytics`} className="hover:text-[#BFFF00] transition-colors">
                  Analytics & Charts
                </a>
              </li>
              <li>
                <a
                  href="https://v2.unifyvault.xyz"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#BFFF00] transition-colors"
                >
                  Admin Console
                </a>
              </li>
            </ul>
          </div>

          {/* Resources & Security */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider font-mono text-[10px]">
              Resources
            </h4>
            <ul className="space-y-2 text-white/60">
              <li>
                <a
                  href="https://docs.unifyvault.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#BFFF00] flex items-center gap-1 transition-colors"
                >
                  <span>Protocol Docs</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://basescan.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#BFFF00] flex items-center gap-1 transition-colors"
                >
                  <span>BaseScan Contracts</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px] pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Audited & Timelocked
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40 font-mono">
          <div>© {new Date().getFullYear()} UnifyVault Protocol. All rights reserved.</div>
          <div className="flex items-center gap-4 text-white/60">
            <span>Base Chain (8453)</span>
            <span>·</span>
            <span>Non-Custodial</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
