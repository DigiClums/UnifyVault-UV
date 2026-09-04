'use client';

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Sparkles,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useStaking } from '../../hooks/useStaking';

export function StakingYieldCalculator() {
  const { dynamicApy, uvbeBalance, currentRank, rankDetails } = useStaking();
  const [stakeInput, setStakeInput] = useState<string>('500');
  const [durationDays, setDurationDays] = useState<number>(365);
  const [autoCompound, setAutoCompound] = useState<boolean>(true);

  const amount = useMemo(() => {
    const parsed = parseFloat(stakeInput);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [stakeInput]);

  // Net principal deposited into vault (95% after 5% treasury fee)
  const netPrincipal = useMemo(() => amount * 0.95, [amount]);

  // Calculations
  const calculations = useMemo(() => {
    const rateAnnual = dynamicApy / 100;
    const dailyRate = rateAnnual / 365;

    // Simple Yield
    const simpleDaily = netPrincipal * dailyRate;
    const simpleMonthly = simpleDaily * 30;
    const simplePeriod = netPrincipal * dailyRate * durationDays;

    // Compounded Yield (Daily compounding simulation if auto-compounded)
    const compoundPeriod = autoCompound
      ? netPrincipal * (Math.pow(1 + dailyRate, durationDays) - 1)
      : simplePeriod;

    const totalEndingCapital = netPrincipal + compoundPeriod;
    const effectiveRoiPercent = amount > 0 ? ((totalEndingCapital - amount) / amount) * 100 : 0;

    return {
      dailyYield: autoCompound ? netPrincipal * (Math.pow(1 + dailyRate, 1) - 1) : simpleDaily,
      monthlyYield: autoCompound ? netPrincipal * (Math.pow(1 + dailyRate, 30) - 1) : simpleMonthly,
      periodYield: compoundPeriod,
      totalEnding: totalEndingCapital,
      effectiveRoi: effectiveRoiPercent,
    };
  }, [netPrincipal, dynamicApy, durationDays, autoCompound, amount]);

  const presets = [100, 500, 1000, 5000, 25000];

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#BFFF00] flex flex-col justify-between space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#BFFF00]/20 text-black dark:text-[#BFFF00] border border-[#BFFF00]/40">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight">
              Interactive Yield & ROI Calculator
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Simulate your dynamic staking earnings with real-time 600% APY cap & auto-compounding.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Max Cap APY
          </span>
          <span className="text-sm font-mono font-black text-[#5f8f00] dark:text-[#BFFF00]">
            {dynamicApy}% Live
          </span>
        </div>
      </div>

      {/* Input Controls */}
      <div className="space-y-4">
        {/* Stake Amount Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <label className="text-slate-800 dark:text-slate-200">Stake Amount (UVBE)</label>
            <span className="text-slate-500 font-mono text-[11px]">
              Net Vault Principal:{' '}
              {netPrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })} UVBE
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              min="50"
              step="10"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              placeholder="500"
              className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-black dark:border-white/20 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-foreground focus:outline-none focus:border-[#BFFF00] transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
              UVBE
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {presets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setStakeInput(val.toString())}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                  amount === val
                    ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black border-black dark:border-[#BFFF00]'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {val.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <label className="text-slate-800 dark:text-slate-200">Staking Horizon</label>
            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
              {durationDays} Days ({Math.round(durationDays / 30)} Months)
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="730"
            step="15"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#BFFF00]"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>30 Days</span>
            <span>90 Days</span>
            <span>180 Days</span>
            <span>365 Days (1 Yr)</span>
            <span>730 Days (2 Yrs)</span>
          </div>
        </div>

        {/* Auto-Compound Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            <div>
              <div className="text-xs font-bold text-foreground">
                Auto-Compounding (Daily Restake)
              </div>
              <div className="text-[10px] text-muted-foreground">
                0% gas fee compounding on permanent vault capital
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoCompound(!autoCompound)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border ${
              autoCompound
                ? 'bg-[#BFFF00] border-black'
                : 'bg-slate-300 dark:bg-slate-800 border-slate-400 dark:border-white/20'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-black dark:bg-white transition-transform ${
                autoCompound ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Projection Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        <div className="p-3 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Est. Daily Yield
          </span>
          <div className="text-sm sm:text-base font-mono font-black text-foreground">
            +
            {calculations.dailyYield.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-[10px] text-muted-foreground">UVBE</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Est. 30-Day Yield
          </span>
          <div className="text-sm sm:text-base font-mono font-black text-blue-600 dark:text-blue-400">
            +
            {calculations.monthlyYield.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-[10px] text-muted-foreground">UVBE</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Period Yield ({durationDays}d)
          </span>
          <div className="text-sm sm:text-base font-mono font-black text-purple-600 dark:text-purple-400">
            +
            {calculations.periodYield.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-[10px] text-muted-foreground">UVBE</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Total Capital Backed
          </span>
          <div className="text-sm sm:text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
            {calculations.totalEnding.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            <span className="text-[10px] text-muted-foreground">UVBE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
