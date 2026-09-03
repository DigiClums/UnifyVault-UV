'use client';

import React from 'react';
import Link from 'next/link';
import { useOptionsProtocol } from '../../hooks/useOptionsProtocol';
import {
  Table2,
  LineChart,
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

export default function OptionsOverviewPage() {
  const {
    indexData,
    uvbePriceUsd,
    uvbeBalance,
    marginAccount,
    activeExpiry,
    strikeRows,
    selectedOption,
    setSelectedOption,
  } = useOptionsProtocol();

  // Find ATM strike
  const atmRow = strikeRows.find((r) => r.isAtm) || strikeRows[Math.floor(strikeRows.length / 2)];

  return (
    <div className="space-y-4">
      {/* Quick Market Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <Link
          href="/options/chain"
          className="group p-5 rounded-2xl bg-surface border-2 border-black dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-[#BFFF00] dark:text-black flex items-center justify-center">
              <Table2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-muted-foreground group-hover:text-foreground">
              Explore Chain →
            </span>
          </div>
          <h3 className="text-base font-black text-foreground mt-4">Option Chain</h3>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Interactive CE/PE strike ladder with real-time Black-Scholes Greeks and ATM moneyness.
          </p>
        </Link>

        <Link
          href="/options/chart"
          className="group p-5 rounded-2xl bg-surface border-2 border-black dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-[#BFFF00] dark:text-black flex items-center justify-center">
              <LineChart className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-muted-foreground group-hover:text-foreground">
              Open Chart →
            </span>
          </div>
          <h3 className="text-base font-black text-foreground mt-4">Index Spot Chart</h3>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Candlestick price action for UV-NIFTY composite (60% cbBTC + 40% WETH).
          </p>
        </Link>

        <Link
          href="/options/trade"
          className="group p-5 rounded-2xl bg-surface border-2 border-black dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-black text-white dark:bg-[#BFFF00] dark:text-black flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-muted-foreground group-hover:text-foreground">
              Trade Desk →
            </span>
          </div>
          <h3 className="text-base font-black text-foreground mt-4">Execution Dock</h3>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Defined-risk Buy flow & writer margin execution with 140% MCR in UVBE.
          </p>
        </Link>
      </div>

      {/* Featured ATM Contracts Banner */}
      {atmRow && (
        <div className="p-4 rounded-2xl bg-surface border-2 border-black dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#BFFF00]" />
              Quick Strike: At-The-Money (ATM {atmRow.strike.toLocaleString()})
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              Expiry: {activeExpiry.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            {/* ATM Call */}
            <div
              onClick={() => setSelectedOption(atmRow.ce)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedOption?.type === 'CE' && selectedOption.strike === atmRow.strike
                  ? 'border-black dark:border-[#BFFF00] bg-[#BFFF00]/10'
                  : 'border-border-subtle bg-background hover:border-black dark:hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  ATM CALL (CE)
                </span>
                <span className="text-xs font-bold text-foreground">
                  Δ {atmRow.ce.delta.toFixed(2)}
                </span>
              </div>
              <div className="text-xl font-black text-foreground mt-2">
                {atmRow.ce.premiumUvbe.toFixed(2)} UVBE
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>${atmRow.ce.premiumUsd.toFixed(2)} USD</span>
                <Link
                  href="/options/trade"
                  className="font-black text-[#5f8f00] dark:text-[#BFFF00] hover:underline flex items-center"
                >
                  Trade Call <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>

            {/* ATM Put */}
            <div
              onClick={() => setSelectedOption(atmRow.pe)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                selectedOption?.type === 'PE' && selectedOption.strike === atmRow.strike
                  ? 'border-black dark:border-[#BFFF00] bg-[#BFFF00]/10'
                  : 'border-border-subtle bg-background hover:border-black dark:hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  ATM PUT (PE)
                </span>
                <span className="text-xs font-bold text-foreground">
                  Δ {atmRow.pe.delta.toFixed(2)}
                </span>
              </div>
              <div className="text-xl font-black text-foreground mt-2">
                {atmRow.pe.premiumUvbe.toFixed(2)} UVBE
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>${atmRow.pe.premiumUsd.toFixed(2)} USD</span>
                <Link
                  href="/options/trade"
                  className="font-black text-[#5f8f00] dark:text-[#BFFF00] hover:underline flex items-center"
                >
                  Trade Put <ArrowDownRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account & Margin Snapshot */}
      <div className="p-4 rounded-2xl bg-surface border-2 border-black dark:border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] space-y-3 font-mono">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            Your Options Account Snapshot
          </h2>
          <Link
            href="/options/positions"
            className="text-xs font-bold text-[#5f8f00] dark:text-[#BFFF00] hover:underline"
          >
            View All Positions →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-background border border-border-subtle">
            <div className="text-[10px] uppercase text-muted-foreground">UVBE Balance</div>
            <div className="text-base font-black text-foreground mt-1">
              {uvbeBalance.toFixed(2)} UVBE
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border-subtle">
            <div className="text-[10px] uppercase text-muted-foreground">Available Margin</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {marginAccount.availableMarginUvbe.toFixed(2)} UVBE
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border-subtle">
            <div className="text-[10px] uppercase text-muted-foreground">Locked Collateral</div>
            <div className="text-base font-black text-foreground mt-1">
              {marginAccount.lockedMarginUvbe.toFixed(2)} UVBE
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border-subtle">
            <div className="text-[10px] uppercase text-muted-foreground">Margin Ratio</div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {(marginAccount.marginHealthRatio * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
