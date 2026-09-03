'use client';

import React, { useState } from 'react';
import { useOptionsProtocol } from '../../hooks/useOptionsProtocol';
import { OptionContractQuote } from '../../types/options';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ArrowDownRight, SlidersHorizontal, Sparkles } from 'lucide-react';

export function OptionChain() {
  const {
    strikeRows,
    selectedOption,
    setSelectedOption,
    activeExpiry,
    expiries,
    selectedCycle,
    setSelectedCycle,
    indexData,
  } = useOptionsProtocol();

  const router = useRouter();
  const [viewMode, setViewMode] = useState<'prices' | 'greeks' | 'all'>('prices');
  const [mobileTab, setMobileTab] = useState<'CE' | 'PE'>('CE');
  const [strikeFilter, setStrikeFilter] = useState<'ALL' | 'ATM' | 'NEAR'>('ALL');

  // Filter strikes
  const filteredRows = React.useMemo(() => {
    if (strikeFilter === 'ATM') {
      return strikeRows.filter((r) => r.isAtm);
    }
    if (strikeFilter === 'NEAR') {
      const atmIndex = strikeRows.findIndex((r) => r.isAtm);
      if (atmIndex !== -1) {
        return strikeRows.slice(
          Math.max(0, atmIndex - 2),
          Math.min(strikeRows.length, atmIndex + 3),
        );
      }
    }
    return strikeRows;
  }, [strikeRows, strikeFilter]);

  const handleSelectOption = (opt: OptionContractQuote) => {
    setSelectedOption(opt);
  };

  const handleTradeDirect = (opt: OptionContractQuote) => {
    setSelectedOption(opt);
    router.push('/options/trade');
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Expiry & View Filter Controls */}
      <div className="p-3 bg-surface border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-wrap items-center justify-between gap-3">
        {/* Expiry Cycle Tabs */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-black dark:border-white/10 overflow-x-auto">
          {expiries.map((exp) => (
            <button
              key={exp.cycle}
              onClick={() => setSelectedCycle(exp.cycle)}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all min-h-[36px] ${
                selectedCycle === exp.cycle
                  ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {exp.cycle}
            </button>
          ))}
        </div>

        {/* View Mode & Strike Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border-subtle text-xs">
            <span className="text-[10px] uppercase text-muted-foreground px-1.5 font-bold hidden sm:inline">
              View:
            </span>
            {(['prices', 'greeks', 'all'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-muted text-foreground font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Strike Filter Selector */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border-subtle text-xs">
            {(['ALL', 'NEAR', 'ATM'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStrikeFilter(filter)}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  strikeFilter === filter
                    ? 'bg-black text-white dark:bg-white/20 font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DESKTOP OPTION CHAIN (Dual-Sided Strike Ladder) ── */}
      <div className="hidden md:block bg-background border-2 border-black dark:border-white/10 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-muted text-xs font-black border-b-2 border-black dark:border-white/10">
                <th
                  colSpan={viewMode === 'all' ? 4 : viewMode === 'greeks' ? 3 : 2}
                  className="py-2.5 text-emerald-600 dark:text-emerald-400 border-r-2 border-black dark:border-white/10"
                >
                  CALLS (CE)
                </th>
                <th className="py-2.5 text-amber-600 dark:text-amber-400 font-black bg-surface border-r-2 border-l-2 border-black dark:border-white/10 min-w-[120px]">
                  STRIKE
                </th>
                <th
                  colSpan={viewMode === 'all' ? 4 : viewMode === 'greeks' ? 3 : 2}
                  className="py-2.5 text-rose-600 dark:text-rose-400 border-l-2 border-black dark:border-white/10"
                >
                  PUTS (PE)
                </th>
              </tr>
              <tr className="bg-surface text-muted-foreground border-b border-border-subtle text-[11px]">
                {/* Calls Header */}
                <th className="py-1 px-3 text-right">Premium (UVBE)</th>
                {(viewMode === 'prices' || viewMode === 'all') && (
                  <th className="py-1 px-2 text-right">USD</th>
                )}
                {(viewMode === 'greeks' || viewMode === 'all') && (
                  <th className="py-1 px-2">Delta</th>
                )}
                {(viewMode === 'greeks' || viewMode === 'all') && (
                  <th className="py-1 px-2 border-r border-border-subtle">IV%</th>
                )}

                {/* Strike Header */}
                <th className="py-1 px-3 bg-muted font-black text-foreground border-r border-l border-border-subtle">
                  PRICE
                </th>

                {/* Puts Header */}
                {(viewMode === 'greeks' || viewMode === 'all') && (
                  <th className="py-1 px-2 border-l border-border-subtle">IV%</th>
                )}
                {(viewMode === 'greeks' || viewMode === 'all') && (
                  <th className="py-1 px-2">Delta</th>
                )}
                {(viewMode === 'prices' || viewMode === 'all') && (
                  <th className="py-1 px-2 text-left">USD</th>
                )}
                <th className="py-1 px-3 text-left">Premium (UVBE)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isCeSelected =
                  selectedOption?.type === 'CE' && selectedOption.strike === row.strike;
                const isPeSelected =
                  selectedOption?.type === 'PE' && selectedOption.strike === row.strike;

                const ceBg =
                  row.ce.moneyness === 'ITM'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-foreground';
                const peBg =
                  row.pe.moneyness === 'ITM'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'text-foreground';

                return (
                  <tr
                    key={row.strike}
                    className={`border-b border-border-subtle hover:bg-muted/40 transition-colors ${
                      row.isAtm ? 'bg-amber-500/10 dark:bg-amber-500/5 font-semibold' : ''
                    }`}
                  >
                    {/* CE Side */}
                    <td
                      onClick={() => handleSelectOption(row.ce)}
                      className={`py-2.5 px-3 text-right cursor-pointer font-bold transition-all ${ceBg} ${
                        isCeSelected
                          ? 'bg-[#BFFF00] text-black font-black shadow-inner'
                          : 'hover:bg-emerald-500/20'
                      }`}
                    >
                      {row.ce.premiumUvbe.toFixed(2)} UVBE
                    </td>

                    {(viewMode === 'prices' || viewMode === 'all') && (
                      <td
                        onClick={() => handleSelectOption(row.ce)}
                        className="py-2.5 px-2 text-right text-muted-foreground cursor-pointer"
                      >
                        ${row.ce.premiumUsd.toFixed(1)}
                      </td>
                    )}

                    {(viewMode === 'greeks' || viewMode === 'all') && (
                      <td
                        onClick={() => handleSelectOption(row.ce)}
                        className="py-2.5 px-2 text-muted-foreground cursor-pointer"
                      >
                        {row.ce.delta.toFixed(2)}
                      </td>
                    )}

                    {(viewMode === 'greeks' || viewMode === 'all') && (
                      <td
                        onClick={() => handleSelectOption(row.ce)}
                        className="py-2.5 px-2 text-muted-foreground border-r border-border-subtle cursor-pointer"
                      >
                        {row.ce.iv.toFixed(1)}%
                      </td>
                    )}

                    {/* Strike Column */}
                    <td
                      className={`py-2.5 px-4 font-bold border-r border-l border-border-subtle ${
                        row.isAtm
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black'
                          : 'bg-muted/30 text-foreground'
                      }`}
                    >
                      {row.strike.toLocaleString()}
                      {row.isAtm && (
                        <span className="block text-[8px] uppercase tracking-tighter text-amber-600 dark:text-amber-400 font-black">
                          ATM
                        </span>
                      )}
                    </td>

                    {/* PE Side */}
                    {(viewMode === 'greeks' || viewMode === 'all') && (
                      <td
                        onClick={() => handleSelectOption(row.pe)}
                        className="py-2.5 px-2 text-muted-foreground border-l border-border-subtle cursor-pointer"
                      >
                        {row.pe.iv.toFixed(1)}%
                      </td>
                    )}

                    {(viewMode === 'greeks' || viewMode === 'all') && (
                      <td
                        onClick={() => handleSelectOption(row.pe)}
                        className="py-2.5 px-2 text-muted-foreground cursor-pointer"
                      >
                        {row.pe.delta.toFixed(2)}
                      </td>
                    )}

                    {(viewMode === 'prices' || viewMode === 'all') && (
                      <td
                        onClick={() => handleSelectOption(row.pe)}
                        className="py-2.5 px-2 text-left text-muted-foreground cursor-pointer"
                      >
                        ${row.pe.premiumUsd.toFixed(1)}
                      </td>
                    )}

                    <td
                      onClick={() => handleSelectOption(row.pe)}
                      className={`py-2.5 px-3 text-left cursor-pointer font-bold transition-all ${peBg} ${
                        isPeSelected
                          ? 'bg-[#BFFF00] text-black font-black shadow-inner'
                          : 'hover:bg-rose-500/20'
                      }`}
                    >
                      {row.pe.premiumUvbe.toFixed(2)} UVBE
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOBILE OPTION CHAIN (Tabbed CE / PE Cards with Sticky Strike Header) ── */}
      <div className="block md:hidden space-y-3">
        {/* Mobile CE / PE Segmented Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-surface p-1 rounded-2xl border-2 border-black dark:border-white/10 shadow-sm">
          <button
            onClick={() => setMobileTab('CE')}
            className={`py-2.5 text-xs font-black rounded-xl transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              mobileTab === 'CE'
                ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span>CALLS (CE)</span>
          </button>
          <button
            onClick={() => setMobileTab('PE')}
            className={`py-2.5 text-xs font-black rounded-xl transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              mobileTab === 'PE'
                ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            <span>PUTS (PE)</span>
          </button>
        </div>

        {/* Mobile Strike List Cards */}
        <div className="space-y-2">
          {filteredRows.map((row) => {
            const opt = mobileTab === 'CE' ? row.ce : row.pe;
            const isSelected =
              selectedOption?.type === opt.type && selectedOption.strike === opt.strike;
            const isItm = opt.moneyness === 'ITM';

            return (
              <div
                key={row.strike}
                onClick={() => handleSelectOption(opt)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-black dark:border-[#BFFF00] bg-[#BFFF00]/15 shadow-md'
                    : 'border-black dark:border-white/10 bg-surface shadow-sm hover:border-black'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground">
                      Strike {row.strike.toLocaleString()}
                    </span>
                    {row.isAtm && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        ATM
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                        isItm
                          ? mobileTab === 'CE'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {opt.moneyness}
                    </span>
                  </div>

                  <div className="text-right font-black text-sm text-foreground">
                    {opt.premiumUvbe.toFixed(2)}{' '}
                    <span className="text-[10px] text-[#5f8f00] dark:text-[#BFFF00]">UVBE</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border-subtle">
                  <div className="flex items-center gap-3 text-[11px]">
                    <span>${opt.premiumUsd.toFixed(2)} USD</span>
                    <span>Δ {opt.delta.toFixed(2)}</span>
                    <span>IV {opt.iv.toFixed(1)}%</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTradeDirect(opt);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-black bg-[#BFFF00] text-black border border-black hover:bg-[#a6e000] shadow-sm min-h-[32px]"
                  >
                    Trade →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
