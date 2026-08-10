'use client';

import React, { useState, useMemo } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useHistoricalNAV, useTransactionHistory, IndexedEvent } from '../../hooks/useIndexerData';
import { useAccount } from 'wagmi';
import { Activity, History, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { NavSnapshot } from '../../types';
import { formatUnits } from '../../lib/math';

type PeriodOption = '1D' | '7D' | '30D' | '90D' | 'ALL';
const PERIODS: PeriodOption[] = ['1D', '7D', '30D', '90D', 'ALL'];

function formatAxisDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return timestampStr;
  }
}

function formatTooltipDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (e) {
    return timestampStr;
  }
}

interface ActivityMarkerPoint {
  txHash: string;
  type: 'DEPOSIT' | 'REDEEM';
  timestamp: string;
  nav: number;
  amountFormatted: string;
  sharesFormatted: string;
  isUser: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NavSnapshot }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[220px]">
      <div className="border-b border-slate-800 pb-1.5 font-semibold text-slate-300">
        {formatTooltipDate(data.timestamp)}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-slate-200">
          <span className="text-[#5f8f00] dark:text-[#BFFF00] font-medium">NAV Value:</span>
          <span className="font-bold text-white font-mono">
            ${Number(data.nav || data.sharePrice || 0).toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Total Assets:</span>
          <span className="font-semibold text-slate-200 font-mono">
            $
            {Number(data.totalAssets || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">BTC Price:</span>
          <span className="font-medium text-amber-400 font-mono">
            $
            {Number(data.btcPrice || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">ETH Price:</span>
          <span className="font-medium text-blue-400 font-mono">
            $
            {Number(data.ethPrice || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HistoricalNavChart() {
  const [period, setPeriod] = useState<PeriodOption>('ALL');
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const { address: userAddress } = useAccount();
  const { navHistory, isLoading: isLoadingNav } = useHistoricalNAV(period);
  const { transactions } = useTransactionHistory();

  // Detect bogus stub data: when useHistoricalNAV returns snapshots with
  // totalAssets=0 and btcPrice=0 and ethPrice=0 across all points, it means
  // no real historical data has been recorded yet.
  const hasRealHistoricalData = useMemo(() => {
    if (!navHistory || navHistory.length < 2) return false;
    return navHistory.some((s) => (s.totalAssets ?? 0) > 0 || (s.nav ?? 0) > 0);
  }, [navHistory]);

  // Match indexed transaction events to closest NAV point timestamps
  const activityMarkers: ActivityMarkerPoint[] = useMemo(() => {
    if (!navHistory || navHistory.length === 0 || !transactions || transactions.length === 0) {
      return [];
    }

    const filtered = transactions.filter((tx) => tx.type === 'DEPOSIT' || tx.type === 'REDEEM');

    return filtered.map((tx) => {
      const txTime = new Date(tx.timestamp).getTime();

      // Find nearest NAV snapshot point
      let closestPoint = navHistory[0];
      let minDiff = Math.abs(new Date(closestPoint.timestamp).getTime() - txTime);

      for (let i = 1; i < navHistory.length; i++) {
        const diff = Math.abs(new Date(navHistory[i].timestamp).getTime() - txTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = navHistory[i];
        }
      }

      const isUser = userAddress ? tx.user?.toLowerCase() === userAddress.toLowerCase() : true;
      const isDeposit = tx.type === 'DEPOSIT';

      const amountRaw = isDeposit
        ? tx.netAmount || tx.amountIn || '0'
        : tx.grossAmount || tx.netAmount || '0';
      const sharesRaw = isDeposit ? tx.sharesMinted || '0' : tx.sharesBurned || '0';

      return {
        txHash: tx.txHash,
        type: isDeposit ? 'DEPOSIT' : 'REDEEM',
        timestamp: closestPoint.timestamp, // attach to chart point X axis
        nav: closestPoint.nav || closestPoint.sharePrice || 1.0,
        amountFormatted: Number(formatUnits(BigInt(amountRaw), 6)).toFixed(2),
        sharesFormatted: Number(formatUnits(BigInt(sharesRaw), 18)).toFixed(4),
        isUser,
      };
    });
  }, [navHistory, transactions, userAddress]);

  const userActivityCount = useMemo(() => {
    return activityMarkers.filter((m) => m.isUser).length;
  }, [activityMarkers]);

  const periodSelector = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Activity Overlay Toggle */}
      <button
        onClick={() => setShowMarkers(!showMarkers)}
        className={`flex items-center space-x-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
          showMarkers
            ? 'bg-[#BFFF00]/10 text-[#BFFF00] border-[#BFFF00]/30'
            : 'bg-surface text-slate-400 border-border-subtle hover:text-white'
        }`}
        title="Toggle User Activity Markers"
      >
        <Filter className="w-3 h-3" />
        <span>Activity Markers</span>
        {userActivityCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#BFFF00] text-black text-[10px]">
            {userActivityCount}
          </span>
        )}
      </button>

      {/* Period Selector */}
      <div className="flex items-center space-x-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
        {PERIODS.map((p) => {
          const isActive = period === p;
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                isActive
                  ? 'bg-[#BFFF00] text-black shadow-md shadow-[#BFFF00]/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <ChartCard
      title="Historical NAV & Activity"
      subtitle="On-chain NAV progression with deposit and redemption markers"
      icon={Activity}
      action={periodSelector}
    >
      {isLoadingNav ? (
        <div className="h-64 w-full pt-2 flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      ) : !hasRealHistoricalData ? (
        <EmptyState
          title="No historical NAV data yet"
          description="Your NAV history will appear after portfolio activity is recorded on-chain. Deposits and redemptions create NAV snapshots over time."
          icon={History}
        />
      ) : (
        <div className="space-y-3">
          <div className="h-56 sm:h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navHistory} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioNavGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={formatAxisDate}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  domain={['dataMin - 0.002', 'dataMax + 0.002']}
                  tickFormatter={(val) => `$${Number(val || 0).toFixed(3)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="nav"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#portfolioNavGrad)"
                />

                {/* Render Deposit & Redemption Markers */}
                {showMarkers &&
                  activityMarkers.map((marker, idx) => {
                    const isDeposit = marker.type === 'DEPOSIT';
                    const color = isDeposit ? '#10B981' : '#F59E0B'; // Emerald vs Amber
                    return (
                      <ReferenceDot
                        key={`${marker.txHash}-${idx}`}
                        x={marker.timestamp}
                        y={marker.nav}
                        r={marker.isUser ? 6 : 4}
                        fill={color}
                        stroke="#0F172A"
                        strokeWidth={2}
                      />
                    );
                  })}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Legend Footer */}
          {showMarkers && activityMarkers.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle/60 text-[11px] text-slate-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
                  <span className="flex items-center text-slate-300 font-medium">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-400 mr-0.5" /> Deposit Event
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900" />
                  <span className="flex items-center text-slate-300 font-medium">
                    <ArrowUpRight className="w-3 h-3 text-amber-400 mr-0.5" /> Redemption Event
                  </span>
                </div>
              </div>
              <div className="font-mono text-[10px] text-slate-500">
                {activityMarkers.length} On-chain Activity Markers Displayed
              </div>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}
