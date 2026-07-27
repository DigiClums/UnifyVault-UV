'use client';

import React from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { TableCard } from '../ui/TableCard';
import { TokenCard } from '../ui/TokenCard';
import { TableSkeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { ShieldCheck, LayoutGrid, List } from 'lucide-react';

export function HoldingsTable() {
  const { holdings, totalPortfolioUSD, isLoading } = usePortfolio();
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('grid');

  return (
    <div className="space-y-6">
      {/* Portfolio Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {holdings.map((asset) => (
          <TokenCard
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            balance={`${asset.balanceFormatted} ${asset.symbol}`}
            priceUSD={asset.priceUSD}
            valueUSD={asset.valueUSD}
            weightPercent={asset.weightPercent}
            status="Healthy"
          />
        ))}
      </div>

      {/* Structured Detailed Table */}
      <TableCard
        title="CustodyVault Asset Inventory"
        subtitle="Auditable multi-asset holdings custodied inside CustodyVault (0x54696d...09e)"
        icon={ShieldCheck}
        action={
          <div className="flex items-center space-x-1 bg-surface p-1 rounded-xl border border-border-subtle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-accent-blue text-white shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-accent-blue text-white shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-slate-400 font-semibold">
              <th className="py-3.5 px-3">Asset</th>
              <th className="py-3.5 px-3">Oracle Price</th>
              <th className="py-3.5 px-3">Custody Balance</th>
              <th className="py-3.5 px-3">USD Valuation</th>
              <th className="py-3.5 px-3">Target Weight</th>
              <th className="py-3.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={6}>
                  <TableSkeleton rows={3} />
                </td>
              </tr>
            ) : (
              holdings.map((asset) => (
                <tr key={asset.symbol} className="hover:bg-card/40 transition-colors">
                  <td className="py-4 px-3 font-sans font-bold text-white flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-extrabold text-[11px] text-accent-blue">
                      {asset.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{asset.symbol}</div>
                      <div className="text-[10px] text-slate-400">{asset.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-slate-300 font-semibold">{asset.priceUSD}</td>
                  <td className="py-4 px-3 text-slate-200">
                    {asset.balanceFormatted} {asset.symbol}
                  </td>
                  <td className="py-4 px-3 font-bold text-emerald-400">{asset.valueUSD}</td>
                  <td className="py-4 px-3 text-accent-blue font-bold">{asset.weightPercent}</td>
                  <td className="py-4 px-3 text-right font-sans">
                    <StatusBadge status="Healthy" label="Custodied" showPulse={false} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
