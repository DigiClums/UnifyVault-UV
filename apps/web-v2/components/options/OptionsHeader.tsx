'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOptionsProtocol } from '../../hooks/useOptionsProtocol';
import {
  TrendingUp,
  Clock,
  ShieldAlert,
  Sparkles,
  LineChart,
  Table2,
  SlidersHorizontal,
  Layers,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function OptionsHeader() {
  const {
    indexData,
    uvbePriceUsd,
    activeExpiry,
    selectedCycle,
    timeLeft,
    isBaseSepolia,
    isMainnet,
  } = useOptionsProtocol();
  const pathname = usePathname();

  const navTabs = [
    { href: '/options', label: 'Overview', icon: LayoutDashboard },
    { href: '/options/chain', label: 'Option Chain', icon: Table2 },
    { href: '/options/chart', label: 'Index Chart', icon: LineChart },
    { href: '/options/trade', label: 'Trade', icon: SlidersHorizontal },
    { href: '/options/positions', label: 'Positions', icon: Layers },
  ];

  return (
    <div className="space-y-3">
      {/* Network Provenance & State Banner */}
      {isBaseSepolia ? (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong>BASE SEPOLIA (84532):</strong> Connected to real on-chain contracts &
              MarginEngine. Real testnet transactions active.
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
            REAL TESTNET EXECUTION
          </span>
        </div>
      ) : isMainnet ? (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>BASE MAINNET (8453):</strong> Options modules locked pending 48-hour timelock
              & multi-sig governance activation. Trading disabled.
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-rose-500/20 text-[10px] font-black text-rose-600 dark:text-rose-400">
            MAINNET LOCKED
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-mono shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>SIMULATION MODE:</strong> Switch wallet network to Base Sepolia (84532) to
              trade live on testnet.
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] font-black text-amber-700 dark:text-amber-300">
            LOCAL SIMULATION
          </span>
        </div>
      )}

      {/* Global Options Ticker & Spot Header */}
      <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-wrap items-center justify-between gap-4">
        {/* Spot Price Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 rounded-2xl bg-black text-white dark:bg-[#BFFF00] dark:text-black border-2 border-black dark:border-white/20 flex items-center justify-center font-black text-base shadow-sm">
            UV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black tracking-tight text-foreground font-mono">
                UV-NIFTY
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
                {isBaseSepolia ? 'SEPOLIA ORACLE ●' : isMainnet ? 'MAINNET FEED ●' : 'SIMULATED ●'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono">
              <span className="text-xl sm:text-2xl font-black text-foreground">
                $
                {indexData.spotPriceUsd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{indexData.change24hPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Index Components & Expiry Countdown */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs">
          <div className="p-2 rounded-xl bg-surface border border-border-subtle hidden md:block">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between gap-2 font-bold">
              <span>{indexData.components.btc.symbol}</span>
              <span className="text-amber-500 font-black">
                {indexData.components.btc.weightPct}% WT
              </span>
            </div>
            <div className="font-black text-foreground mt-0.5">
              ${indexData.components.btc.priceUsd.toLocaleString()}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-surface border border-border-subtle hidden md:block">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between gap-2 font-bold">
              <span>{indexData.components.eth.symbol}</span>
              <span className="text-cyan-500 font-black">
                {indexData.components.eth.weightPct}% WT
              </span>
            </div>
            <div className="font-black text-foreground mt-0.5">
              ${indexData.components.eth.priceUsd.toLocaleString()}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-surface border border-border-subtle">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">
              1 UVBE ORACLE
            </div>
            <div className="font-black text-[#5f8f00] dark:text-[#BFFF00] mt-0.5">
              ${uvbePriceUsd.toFixed(2)} USD
            </div>
          </div>

          <div className="p-2 rounded-xl bg-surface border-2 border-black dark:border-white/10">
            <div className="text-[10px] uppercase text-muted-foreground font-black flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" /> {selectedCycle}
            </div>
            <div className="font-black text-foreground mt-0.5 tracking-wider">{timeLeft}</div>
          </div>
        </div>
      </div>

      {/* Desktop Sub-Navigation Bar */}
      <div className="hidden sm:flex items-center gap-1 bg-surface border-2 border-black dark:border-white/10 p-1.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] overflow-x-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-mono font-black rounded-xl transition-all',
                isActive
                  ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
