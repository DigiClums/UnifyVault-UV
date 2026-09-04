'use client';

import React, { useState, useMemo } from 'react';
import { useOptionsProtocol } from '../../hooks/useOptionsProtocol';
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Filter,
  BarChart3,
  Percent,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { UV_OPTION_POSITION_MANAGER_ABI } from '../../lib/contracts/optionsABIs';
import { UserOptionPosition } from '../../types/options';

export function PositionsAndMargin() {
  const {
    positions,
    marginAccount,
    uvbePriceUsd,
    indexData,
    isBaseSepolia,
    isMainnet,
    contracts,
    refetchPositions,
    refetchBalance,
  } = useOptionsProtocol();

  // State Management
  const [closingPosId, setClosingPosId] = useState<string | null>(null);
  const [closeTxHash, setCloseTxHash] = useState<`0x${string}` | undefined>();
  const [selectedDrawerPos, setSelectedDrawerPos] = useState<UserOptionPosition | null>(null);
  const [filterType, setFilterType] = useState<
    'ALL' | 'OPEN' | 'CLOSED' | 'CE' | 'PE' | 'BUY' | 'WRITE'
  >('ALL');
  const [sortBy, setSortBy] = useState<'PNL' | 'EXPIRY' | 'STRIKE' | 'SIZE'>('PNL');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [expandedGreeks, setExpandedGreeks] = useState<Record<string, boolean>>({});

  const { writeContractAsync: writeClosePosition, isPending: isClosePending } = useWriteContract();
  const { isLoading: isCloseLoading, isSuccess: isCloseSuccess } = useWaitForTransactionReceipt({
    hash: closeTxHash,
  });

  const handleClose = async (posId: string) => {
    try {
      if (!contracts.optionPositionManager) return;
      setClosingPosId(posId);
      const hash = await writeClosePosition({
        address: contracts.optionPositionManager,
        abi: UV_OPTION_POSITION_MANAGER_ABI,
        functionName: 'closePosition',
        args: [posId as `0x${string}`, 1n],
      });
      setCloseTxHash(hash);
    } catch (err: any) {
      console.error('Failed to close position:', err);
      setClosingPosId(null);
    }
  };

  React.useEffect(() => {
    if (isCloseSuccess) {
      refetchPositions();
      refetchBalance();
      setClosingPosId(null);
      if (selectedDrawerPos) {
        const updated = positions.find((p) => p.id === selectedDrawerPos.id);
        if (updated) setSelectedDrawerPos(updated);
      }
    }
  }, [isCloseSuccess, refetchPositions, refetchBalance]);

  // Aggregated Portfolio Metrics
  const openPositions = useMemo(() => positions.filter((p) => p.status === 'OPEN'), [positions]);
  const closedPositions = useMemo(() => positions.filter((p) => p.status !== 'OPEN'), [positions]);

  const totalUnrealizedPnlUvbe = useMemo(() => {
    return openPositions.reduce((acc, p) => acc + p.unrealizedPnlUvbe, 0);
  }, [openPositions]);

  const totalUnrealizedPnlUsd = totalUnrealizedPnlUvbe * uvbePriceUsd;

  // Portfolio Greeks Totals
  const portfolioGreeks = useMemo(() => {
    return openPositions.reduce(
      (acc, p) => {
        acc.delta += (p.delta ?? 0) * p.quantityLots;
        acc.gamma += (p.gamma ?? 0) * p.quantityLots;
        acc.theta += (p.theta ?? 0) * p.quantityLots;
        acc.vega += (p.vega ?? 0) * p.quantityLots;
        return acc;
      },
      { delta: 0, gamma: 0, theta: 0, vega: 0 },
    );
  }, [openPositions]);

  // Filtering & Sorting
  const filteredPositions = useMemo(() => {
    let result = [...positions];

    if (filterType === 'OPEN') result = result.filter((p) => p.status === 'OPEN');
    else if (filterType === 'CLOSED') result = result.filter((p) => p.status !== 'OPEN');
    else if (filterType === 'CE') result = result.filter((p) => p.optionType === 'CE');
    else if (filterType === 'PE') result = result.filter((p) => p.optionType === 'PE');
    else if (filterType === 'BUY') result = result.filter((p) => p.side === 'BUY');
    else if (filterType === 'WRITE') result = result.filter((p) => p.side === 'WRITE');

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'PNL') comparison = a.unrealizedPnlUvbe - b.unrealizedPnlUvbe;
      else if (sortBy === 'EXPIRY') comparison = a.expiryTimestamp - b.expiryTimestamp;
      else if (sortBy === 'STRIKE') comparison = a.strike - b.strike;
      else if (sortBy === 'SIZE') comparison = a.quantityLots - b.quantityLots;

      return sortOrder === 'DESC' ? -comparison : comparison;
    });

    return result;
  }, [positions, filterType, sortBy, sortOrder]);

  const toggleGreekRow = (id: string) => {
    setExpandedGreeks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. TOP PORTFOLIO & MARGIN DESK HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Value */}
        <div className="bg-surface border-2 border-black dark:border-white/10 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)]">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
            Portfolio UVBE
            <span className="text-[9px] px-1 py-0.2 rounded bg-muted">ON-CHAIN</span>
          </div>
          <div className="text-base font-black text-foreground mt-1">
            {marginAccount.totalUvbeBalance.toFixed(2)}{' '}
            <span className="text-[10px] text-[#5f8f00] dark:text-[#BFFF00] font-bold">UVBE</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            ≈ ${(marginAccount.totalUvbeBalance * uvbePriceUsd).toFixed(2)} USD
          </div>
        </div>

        {/* Free / Available Margin */}
        <div className="bg-surface border-2 border-black dark:border-white/10 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)]">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
            Available Margin
            <span className="text-[9px] text-emerald-500 font-bold">LIVE</span>
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {marginAccount.availableMarginUvbe.toFixed(2)}{' '}
            <span className="text-[10px] font-bold">UVBE</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Free:{' '}
            {(
              (marginAccount.availableMarginUvbe / Math.max(1, marginAccount.totalUvbeBalance)) *
              100
            ).toFixed(0)}
            %
          </div>
        </div>

        {/* Locked Collateral */}
        <div className="bg-surface border-2 border-black dark:border-white/10 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)]">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
            Locked Collateral
            <span className="text-[9px] px-1 py-0.2 rounded bg-muted">MARGIN</span>
          </div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-1">
            {marginAccount.lockedMarginUvbe.toFixed(4)}{' '}
            <span className="text-[10px] font-bold">UVBE</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Maint: {marginAccount.maintenanceMarginRequiredUvbe.toFixed(4)} UVBE
          </div>
        </div>

        {/* Portfolio Unrealized PnL */}
        <div className="bg-surface border-2 border-black dark:border-white/10 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)]">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
            Unrealized P&L
            <span className="text-[9px] px-1 py-0.2 rounded bg-muted">MARK</span>
          </div>
          <div
            className={`text-base font-black mt-1 flex items-center gap-1 ${
              totalUnrealizedPnlUvbe >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalUnrealizedPnlUvbe >= 0 ? '+' : ''}
            {totalUnrealizedPnlUvbe.toFixed(4)} UVBE
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            ≈ {totalUnrealizedPnlUsd >= 0 ? '+' : ''}${totalUnrealizedPnlUsd.toFixed(2)} USD
          </div>
        </div>

        {/* Margin Health */}
        <div className="bg-surface border-2 border-black dark:border-white/10 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)]">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
            Margin Health
            <span className="text-[9px] font-bold text-emerald-500">
              MCR {((1 + marginAccount.haircutAppliedPercent / 100) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {(marginAccount.marginHealthRatio * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Haircut: {marginAccount.haircutAppliedPercent}%
          </div>
        </div>

        {/* Position Summary */}
        <div className="bg-surface border-2 border-black dark:border-white/10 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)]">
          <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
            Positions
            <span className="text-[9px] px-1 py-0.2 rounded bg-muted">SUMMARY</span>
          </div>
          <div className="text-base font-black text-foreground mt-1">
            {openPositions.length}{' '}
            <span className="text-xs font-normal text-muted-foreground">Open</span> /{' '}
            {closedPositions.length}{' '}
            <span className="text-xs font-normal text-muted-foreground">Closed</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Total: {positions.length}</div>
        </div>
      </div>

      {/* 2. PORTFOLIO GREEKS RISK DESK */}
      <div className="bg-surface border-2 border-black dark:border-white/10 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Portfolio Risk & Greeks Desk
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              Source: PRICING_ENGINE / BLACK-SCHOLES
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            UV-NIFTY Spot:{' '}
            <span className="font-bold text-foreground">${indexData.spotPriceUsd.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
          <div>
            <div className="text-[10px] text-muted-foreground">Net Delta (Δ)</div>
            <div
              className={`text-sm font-black mt-0.5 ${portfolioGreeks.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
            >
              {portfolioGreeks.delta >= 0 ? '+' : ''}
              {portfolioGreeks.delta.toFixed(4)}
            </div>
            <div className="text-[9px] text-muted-foreground">Sensitivity per $1 index move</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Net Gamma (Γ)</div>
            <div className="text-sm font-black text-foreground mt-0.5">
              +{portfolioGreeks.gamma.toFixed(4)}
            </div>
            <div className="text-[9px] text-muted-foreground">Delta acceleration</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Net Theta (Θ)</div>
            <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {portfolioGreeks.theta.toFixed(4)} UVBE/Day
            </div>
            <div className="text-[9px] text-muted-foreground">Time decay per 24h</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Net Vega (ν)</div>
            <div className="text-sm font-black text-foreground mt-0.5">
              +{portfolioGreeks.vega.toFixed(4)}
            </div>
            <div className="text-[9px] text-muted-foreground">Per 1% IV change</div>
          </div>
        </div>
      </div>

      {/* 3. POSITIONS TABLE & CONTROLS */}
      <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
        {/* Controls Bar */}
        <div className="p-3 bg-surface border-b-2 border-black dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-black uppercase text-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>
            {(['ALL', 'OPEN', 'CLOSED', 'CE', 'PE', 'BUY', 'WRITE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                  filterType === f
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-surface text-muted-foreground border-border-subtle hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface border border-border-subtle rounded-md px-2 py-1 text-foreground font-semibold focus:outline-none"
            >
              <option value="PNL">P&L</option>
              <option value="EXPIRY">Expiry</option>
              <option value="STRIKE">Strike</option>
              <option value="SIZE">Quantity</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
              className="px-2 py-1 bg-surface border border-border-subtle rounded-md font-bold text-foreground"
            >
              {sortOrder === 'DESC' ? '↓ DESC' : '↑ ASC'}
            </button>
          </div>
        </div>

        {filteredPositions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            No matching option positions found.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted text-[10px] uppercase text-muted-foreground border-b border-border-subtle font-semibold">
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Strike</th>
                    <th className="py-2.5 px-3">Expiry / DTE</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Entry / Collateral</th>
                    <th className="py-2.5 px-3">Mark (Indicative)</th>
                    <th className="py-2.5 px-3">Unrealized P&L</th>
                    <th className="py-2.5 px-3">Delta (Δ)</th>
                    <th className="py-2.5 px-3">IV</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPositions.map((pos) => {
                    const isExpanded = expandedGreeks[pos.id];
                    return (
                      <React.Fragment key={pos.id}>
                        <tr className="border-b border-border-subtle hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  pos.optionType === 'CE'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {pos.optionType}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  pos.side === 'BUY'
                                    ? 'text-foreground'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {pos.side}
                              </span>
                              <button
                                onClick={() => setSelectedDrawerPos(pos)}
                                className="text-muted-foreground hover:text-foreground text-[10px] underline ml-1"
                              >
                                {pos.id.slice(0, 8)}...
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-black text-foreground">
                            ${pos.strike.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-[11px]">
                            <div className="text-foreground">{pos.expiryLabel}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {pos.timeToExpiryStr}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-foreground">
                            {pos.quantityLots} {pos.quantityLots === 1 ? 'Lot' : 'Lots'}
                          </td>

                          <td className="py-2.5 px-3 text-[11px]">
                            {pos.side === 'BUY' ? (
                              pos.entryPremiumUvbe > 0 ? (
                                <span className="text-foreground">
                                  {pos.entryPremiumUvbe.toFixed(4)} UVBE
                                </span>
                              ) : (
                                <span className="text-muted-foreground">&lt;0.0001 UVBE</span>
                              )
                            ) : pos.collateralLockedUvbe > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                {pos.collateralLockedUvbe.toFixed(4)} UVBE (Locked)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-foreground">
                            {pos.status === 'OPEN' ? (
                              <div>
                                {(pos.currentMarkPremiumUvbe ?? pos.currentPremiumUvbe) > 0
                                  ? `${(pos.currentMarkPremiumUvbe ?? pos.currentPremiumUvbe).toFixed(4)} UVBE`
                                  : '—'}
                                <div className="text-[9px] text-muted-foreground">
                                  $
                                  {(
                                    pos.currentMarkPremiumUsd ??
                                    pos.currentPremiumUvbe * uvbePriceUsd
                                  ).toFixed(2)}{' '}
                                  USD
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-black text-[11px]">
                            {pos.status === 'OPEN' ? (
                              <div
                                className={
                                  pos.unrealizedPnlUvbe >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }
                              >
                                {pos.unrealizedPnlUvbe >= 0 ? '+' : ''}
                                {pos.unrealizedPnlUvbe.toFixed(4)} UVBE
                                <div className="text-[9px] font-medium text-muted-foreground">
                                  {(pos.unrealizedPnlUsd ?? pos.unrealizedPnlUvbe * uvbePriceUsd) >=
                                  0
                                    ? '+'
                                    : ''}
                                  $
                                  {(
                                    pos.unrealizedPnlUsd ?? pos.unrealizedPnlUvbe * uvbePriceUsd
                                  ).toFixed(2)}{' '}
                                  USD
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            <span
                              className={
                                (pos.delta ?? 0) >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {(pos.delta ?? 0) >= 0 ? '+' : ''}
                              {(pos.delta ?? 0).toFixed(3)}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                            {(pos.ivPercent ?? 45.0).toFixed(1)}%
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                                pos.status === 'OPEN'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                  : pos.status === 'SETTLED'
                                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40'
                                    : 'bg-muted text-muted-foreground border-border-subtle'
                              }`}
                            >
                              {pos.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedDrawerPos(pos)}
                                className="px-2 py-1 text-[10px] font-bold bg-surface hover:bg-muted border border-border-subtle rounded-md"
                              >
                                View
                              </button>
                              {pos.status === 'OPEN' ? (
                                <button
                                  onClick={() => handleClose(pos.id)}
                                  disabled={closingPosId === pos.id || isCloseLoading}
                                  className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-md transition-all flex items-center gap-1"
                                >
                                  {closingPosId === pos.id && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  Close
                                </button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground font-semibold px-2">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden p-3 space-y-3">
              {filteredPositions.map((pos) => (
                <div
                  key={pos.id}
                  className="p-3 rounded-xl bg-surface border border-border-subtle space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                          pos.optionType === 'CE'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pos.optionType}
                      </span>
                      <span className="font-black text-foreground">
                        ${pos.strike.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        ({pos.side})
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                        pos.status === 'OPEN'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                          : 'bg-muted text-muted-foreground border-border-subtle'
                      }`}
                    >
                      {pos.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border-subtle">
                    <div>
                      Quantity:{' '}
                      <span className="font-bold text-foreground">
                        {pos.quantityLots} {pos.quantityLots === 1 ? 'Lot' : 'Lots'}
                      </span>
                    </div>
                    <div>
                      Expiry: <span className="font-bold text-foreground">{pos.expiryLabel}</span>
                    </div>
                    <div>
                      Mark:{' '}
                      <span className="font-bold text-foreground">
                        {(pos.currentMarkPremiumUvbe ?? pos.currentPremiumUvbe) > 0
                          ? `${(pos.currentMarkPremiumUvbe ?? pos.currentPremiumUvbe).toFixed(4)} UVBE`
                          : '—'}
                      </span>
                    </div>
                    <div>
                      P&L:{' '}
                      <span
                        className={`font-black ${
                          pos.unrealizedPnlUvbe >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pos.unrealizedPnlUvbe >= 0 ? '+' : ''}
                        {pos.unrealizedPnlUvbe.toFixed(4)} UVBE
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setSelectedDrawerPos(pos)}
                      className="flex-1 py-1.5 bg-background hover:bg-muted text-foreground border border-border-subtle rounded-lg font-bold text-[11px]"
                    >
                      View Details & Greeks
                    </button>
                    {pos.status === 'OPEN' && (
                      <button
                        onClick={() => handleClose(pos.id)}
                        disabled={closingPosId === pos.id || isCloseLoading}
                        className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5"
                      >
                        {closingPosId === pos.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Close
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. PROFESSIONAL POSITION DETAIL DRAWER / MODAL */}
      {selectedDrawerPos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-background border-2 border-black dark:border-white/20 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] font-mono text-xs max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    selectedDrawerPos.optionType === 'CE'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selectedDrawerPos.optionType}
                </span>
                <span className="font-black text-sm text-foreground">
                  UV-NIFTY ${selectedDrawerPos.strike.toLocaleString()} ({selectedDrawerPos.side})
                </span>
              </div>
              <button
                onClick={() => setSelectedDrawerPos(null)}
                className="text-muted-foreground hover:text-foreground font-black text-sm px-2 py-0.5"
              >
                ✕
              </button>
            </div>

            {/* Position Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                <div className="text-[10px] text-muted-foreground">Quantity & Lot Size</div>
                <div className="font-bold text-foreground mt-0.5">
                  {selectedDrawerPos.quantityLots} Lots ({selectedDrawerPos.lotSize} Index Unit/Lot)
                </div>
              </div>
              <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                <div className="text-[10px] text-muted-foreground">Expiry & DTE</div>
                <div className="font-bold text-foreground mt-0.5">
                  {selectedDrawerPos.timeToExpiryStr ?? selectedDrawerPos.expiryLabel}
                </div>
              </div>
              <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                <div className="text-[10px] text-muted-foreground">Entry Premium</div>
                <div className="font-bold text-foreground mt-0.5">
                  {selectedDrawerPos.entryPremiumUvbe > 0
                    ? `${selectedDrawerPos.entryPremiumUvbe.toFixed(4)} UVBE ($${(selectedDrawerPos.entryPremiumUsd ?? selectedDrawerPos.entryPremiumUvbe * uvbePriceUsd).toFixed(2)})`
                    : '—'}
                </div>
              </div>
              <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                <div className="text-[10px] text-muted-foreground">Current Indicative Mark</div>
                <div className="font-bold text-foreground mt-0.5">
                  {(selectedDrawerPos.currentMarkPremiumUvbe ??
                    selectedDrawerPos.currentPremiumUvbe) > 0
                    ? `${(selectedDrawerPos.currentMarkPremiumUvbe ?? selectedDrawerPos.currentPremiumUvbe).toFixed(4)} UVBE ($${(selectedDrawerPos.currentMarkPremiumUsd ?? selectedDrawerPos.currentPremiumUvbe * uvbePriceUsd).toFixed(2)})`
                    : '—'}
                </div>
              </div>
              <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                <div className="text-[10px] text-muted-foreground">Break-Even @ Expiry</div>
                <div className="font-bold text-foreground mt-0.5">
                  ${(selectedDrawerPos.breakEvenPriceUsd ?? selectedDrawerPos.strike).toFixed(2)}{' '}
                  USD
                </div>
              </div>
              <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                <div className="text-[10px] text-muted-foreground">Locked Collateral</div>
                <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {selectedDrawerPos.collateralLockedUvbe > 0
                    ? `${selectedDrawerPos.collateralLockedUvbe.toFixed(4)} UVBE`
                    : 'N/A (Long Option)'}
                </div>
              </div>
            </div>

            {/* Greeks & Volatility Section */}
            <div className="border-t border-border-subtle pt-3">
              <div className="text-[11px] font-black uppercase text-foreground mb-2 flex items-center justify-between">
                <span>Option Greeks (Live Model)</span>
                <span className="text-[9px] text-muted-foreground font-normal">
                  IV: {(selectedDrawerPos.ivPercent ?? 45.0).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <div className="bg-surface p-2 rounded-md border border-border-subtle">
                  <div className="text-muted-foreground">Delta (Δ)</div>
                  <div className="font-black text-foreground mt-0.5">
                    {(selectedDrawerPos.delta ?? 0).toFixed(4)}
                  </div>
                </div>
                <div className="bg-surface p-2 rounded-md border border-border-subtle">
                  <div className="text-muted-foreground">Gamma (Γ)</div>
                  <div className="font-black text-foreground mt-0.5">
                    +{(selectedDrawerPos.gamma ?? 0).toFixed(4)}
                  </div>
                </div>
                <div className="bg-surface p-2 rounded-md border border-border-subtle">
                  <div className="text-muted-foreground">Theta (Θ)</div>
                  <div className="font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {(selectedDrawerPos.theta ?? 0).toFixed(4)}
                  </div>
                </div>
                <div className="bg-surface p-2 rounded-md border border-border-subtle">
                  <div className="text-muted-foreground">Vega (ν)</div>
                  <div className="font-black text-foreground mt-0.5">
                    +{(selectedDrawerPos.vega ?? 0).toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payoff Structure */}
            <div className="border-t border-border-subtle pt-3 text-[11px] space-y-1 text-muted-foreground">
              <div className="text-[10px] font-bold uppercase text-foreground">
                Payoff Profile @ Expiry
              </div>
              <div>
                Max Loss:{' '}
                <span className="font-bold text-foreground">
                  {selectedDrawerPos.side === 'BUY'
                    ? `${selectedDrawerPos.entryPremiumUvbe.toFixed(4)} UVBE (Premium Paid)`
                    : `${selectedDrawerPos.collateralLockedUvbe.toFixed(4)} UVBE (Locked Margin)`}
                </span>
              </div>
              <div>
                Break-even Index Price:{' '}
                <span className="font-bold text-foreground">
                  ${(selectedDrawerPos.breakEvenPriceUsd ?? selectedDrawerPos.strike).toFixed(2)}{' '}
                  USD
                </span>
              </div>
            </div>

            {/* Identifiers */}
            <div className="border-t border-border-subtle pt-2 text-[10px] text-muted-foreground space-y-1">
              <div>
                Position ID:{' '}
                <span className="font-mono text-foreground break-all">{selectedDrawerPos.id}</span>
              </div>
              <div>
                Series ID:{' '}
                <span className="font-mono text-foreground break-all">
                  {selectedDrawerPos.seriesId ?? selectedDrawerPos.id}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
              <button
                onClick={() => setSelectedDrawerPos(null)}
                className="px-3 py-1.5 bg-surface hover:bg-muted border border-border-subtle rounded-lg font-bold"
              >
                Close View
              </button>
              {selectedDrawerPos.status === 'OPEN' && (
                <button
                  onClick={() => handleClose(selectedDrawerPos.id)}
                  disabled={closingPosId === selectedDrawerPos.id || isCloseLoading}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                >
                  {closingPosId === selectedDrawerPos.id && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Close Position
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
