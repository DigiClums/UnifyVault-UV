'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableCard } from '../../components/ui/TableCard';
import { useDashboard } from '../../hooks/useDashboard';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { getExplorerBaseUrl, getProtocolDirectoryAddress, DIRECTORY_ADDRESS_SEPOLIA } from '../../constants';
import { ShieldCheck, Vault, Activity, RefreshCw, ArrowUpRight, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { totalPortfolioValueUSD, sharePriceUSD } = useDashboard();
  const { controller, vault, treasury, oracle } = useProtocolDirectory();

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Connecting...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Admin Overview Dashboard
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Central telemetry, contract status, treasury revenue, and operational controls for
            UnifyVault V2.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Value Locked"
          value={totalPortfolioValueUSD || '$0.00'}
          subtitle="On-chain CustodyVault assets"
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="Current NAV / Share"
          value={sharePriceUSD || '$1.000'}
          subtitle="OracleManager valuation"
          icon={Activity}
          glowColor="emerald"
        />
        <StatCard
          title="Oracle Health"
          value="100% Fresh"
          subtitle="Heartbeat: 86400s"
          icon={Zap}
          glowColor="purple"
        />
        <StatCard
          title="Market Price Sync"
          value="ACTIVE"
          subtitle="Automated Feed Sync"
          icon={RefreshCw}
          glowColor="cyan"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/custody"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Custody Vault Release</h3>
          <p className="text-xs text-slate-400">
            Withdraw custodied vault reserves directly into authorized admin wallet.
          </p>
        </Link>

        <Link
          href="/admin/treasury"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Vault className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Treasury Management</h3>
          <p className="text-xs text-slate-400">
            View accrued deposit/redeem fees and withdraw protocol revenue.
          </p>
        </Link>

        <Link
          href="/admin/oracle"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-accent-blue/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              <Activity className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-accent-blue transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Oracle Telemetry</h3>
          <p className="text-xs text-slate-400">
            Monitor cbBTC, WETH, USDC feed prices, staleness, and keeper state.
          </p>
        </Link>

        <Link
          href="/admin/rebalance"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-accent-emerald/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-accent-emerald transition-colors" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Strategy Rebalance</h3>
          <p className="text-xs text-slate-400">
            View current vs target weight deviations and trigger rebalancing.
          </p>
        </Link>
      </div>

      {/* System Contract Registry Table */}
      <TableCard
        title="Deployed Protocol Module Directory"
        subtitle={`Canonical module registrations on ${chain?.name || (getProtocolDirectoryAddress(chain?.id) === DIRECTORY_ADDRESS_SEPOLIA ? 'Base Sepolia' : 'Base Mainnet')}`}
        icon={ShieldCheck}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-slate-400 font-semibold">
              <th className="py-3 px-3">Module Name</th>
              <th className="py-3 px-3">Contract Address</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white">UnifyVaultController</td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(controller)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {controller ? (
                  <a
                    href={`${explorerBaseUrl}/address/${controller}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white">CustodyVault</td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(vault)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {vault ? (
                  <a
                    href={`${explorerBaseUrl}/address/${vault}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white">Treasury</td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(treasury)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {treasury ? (
                  <a
                    href={`${explorerBaseUrl}/address/${treasury}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white">OracleManager</td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(oracle)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {oracle ? (
                  <a
                    href={`${explorerBaseUrl}/address/${oracle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
