'use client';

import React from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { TableCard } from '../ui/TableCard';
import { TokenCard } from '../ui/TokenCard';
import { TokenIcon } from '../ui/TokenIcon';
import { TableSkeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { ShieldCheck, UserCheck, LayoutGrid, List } from 'lucide-react';

export function HoldingsTable() {
  const {
    holdings,
    userHoldings,
    userSharesRaw,
    isLoading,
    eoaSharesBalance,
    smartAccountSharesBalance,
    smartAccountAddress,
  } = usePortfolio();
  const [scope, setScope] = React.useState<'user' | 'protocol'>('user');
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('grid');

  const activeHoldings = scope === 'user' ? userHoldings : holdings;
  const hasUserShares = userSharesRaw > 0n;
  const hasSmartAccountBalance = smartAccountAddress && smartAccountSharesBalance !== '0.0000';

  return (
    <div className="space-y-6">
      {/* Scope Selector: User Personal Claim vs Protocol Total Reserve */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border-subtle backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          {scope === 'user' ? (
            <UserCheck className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00]" />
          )}
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">
              {scope === 'user'
                ? 'Personal Share Holdings Breakdown'
                : 'Protocol Custody Vault Inventory'}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {scope === 'user'
                ? 'Your pro-rata ownership claim on underlying strategy collateral assets based on UVBE shares owned.'
                : 'Auditable multi-asset pool reserves custodied inside CustodyVault.'}
            </p>
            {scope === 'user' && hasSmartAccountBalance && (
              <p className="text-[10px] text-muted-foreground/80 font-mono mt-1">
                Wallet: {eoaSharesBalance} UVBE · Smart Account: {smartAccountSharesBalance} UVBE
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg border border-border-subtle shrink-0">
          <button
            onClick={() => setScope('user')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              scope === 'user'
                ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Share Claim
          </button>
          <button
            onClick={() => setScope('protocol')}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              scope === 'protocol'
                ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Protocol Reserve
          </button>
        </div>
      </div>

      {/* Zero Shares Notice for User View */}
      {scope === 'user' && !hasUserShares && !isLoading && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
          <span>
            ℹ️ You currently hold 0 UVBE shares. Personal asset claim values will reflect $0.00
            until you deposit.
          </span>
          <button
            onClick={() => setScope('protocol')}
            className="text-[#5f8f00] dark:text-[#BFFF00] font-bold hover:underline shrink-0 ml-2"
          >
            View Protocol Reserve →
          </button>
        </div>
      )}

      {/* Portfolio Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {activeHoldings.map((asset) => (
          <TokenCard
            key={asset.symbol}
            symbol={asset.symbol}
            name={asset.name}
            balance={`${asset.balanceFormatted} ${asset.symbol}`}
            priceUSD={asset.priceUSD}
            valueUSD={asset.valueUSD}
            weightPercent={asset.weightPercent}
            status={scope === 'user' ? (hasUserShares ? 'Owned' : 'Unallocated') : 'Custodied'}
          />
        ))}
      </div>

      {/* Structured Detailed Table */}
      <TableCard
        title={scope === 'user' ? 'Personal Asset Breakdown' : 'CustodyVault Reserve Inventory'}
        subtitle={
          scope === 'user'
            ? 'Pro-rata share allocation calculated directly from on-chain share balance'
            : 'Auditable multi-asset holdings custodied inside CustodyVault (0x54696d...09e)'
        }
        icon={scope === 'user' ? UserCheck : ShieldCheck}
        action={
          <div className="flex items-center space-x-1 bg-surface p-1 rounded-xl border border-border-subtle">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle/60 text-muted-foreground font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-3">Oracle Unit Price</th>
              <th className="py-2.5 px-3">
                {scope === 'user' ? 'Your Claim Balance' : 'Custody Reserve'}
              </th>
              <th className="py-2.5 px-3">USD Valuation</th>
              <th className="py-2.5 px-3">Target Weight</th>
              <th className="py-2.5 px-3">Current Weight</th>
              <th className="py-3.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={7}>
                  <TableSkeleton rows={3} />
                </td>
              </tr>
            ) : (
              activeHoldings.map((asset) => (
                <tr key={asset.symbol} className="hover:bg-card/40 transition-colors">
                  <td className="py-3 px-3 font-sans font-bold text-foreground flex items-center space-x-3">
                    <TokenIcon symbol={asset.symbol} size={28} />
                    <div>
                      <div className="font-bold text-foreground text-sm">{asset.symbol}</div>
                      <div className="text-[10px] text-muted-foreground">{asset.name}</div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground font-semibold">
                    {asset.priceUSD}
                  </td>
                  <td className="py-3 px-3 text-foreground">
                    {asset.balanceFormatted} {asset.symbol}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400">
                    {asset.valueUSD}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground font-semibold">
                    {asset.targetWeightPercent || '0.0%'}
                  </td>
                  <td className="py-3 px-3 text-[#5f8f00] dark:text-[#BFFF00] font-bold">
                    {asset.currentWeightPercent || asset.weightPercent}
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <StatusBadge
                      status="Healthy"
                      label={
                        scope === 'user'
                          ? hasUserShares
                            ? 'Claim Active'
                            : '0 Shares'
                          : 'Custodied'
                      }
                      showPulse={false}
                    />
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
