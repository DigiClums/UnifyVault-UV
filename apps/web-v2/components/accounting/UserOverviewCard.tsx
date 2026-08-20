'use client';

import React, { useState } from 'react';
import { formatEther } from 'viem';
import { StatCard } from '../ui/StatCard';
import { StatusBadge } from '../ui/StatusBadge';
import {
  User,
  ExternalLink,
  Copy,
  Check,
  Coins,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { UserAccountingState } from '../../hooks/useUserAccounting';

export interface UserOverviewCardProps {
  state: UserAccountingState;
}

export function UserOverviewCard({ state }: UserOverviewCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (state.targetAddress) {
      navigator.clipboard.writeText(state.targetAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareBalanceFormatted = Number(formatEther(state.shareBalance)).toFixed(4);

  // Format first deposit timestamp
  const firstDepositDate =
    state.firstDepositTimestamp > 0n
      ? new Date(Number(state.firstDepositTimestamp) * 1000).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'No Active Deposits';

  // Format holding period
  const formatHoldingPeriod = (seconds: bigint): string => {
    if (seconds <= 0n) return '0 Days';
    const totalSec = Number(seconds);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const holdingPeriodStr = formatHoldingPeriod(state.performanceStruct.holdingPeriod);

  // Determine account status
  const getAccountStatus = () => {
    if (state.isEscrow) {
      return { status: 'Warning' as const, label: 'P2P ESCROW ISOLATION' };
    }
    if (state.shareBalance > 0n) {
      return { status: 'Healthy' as const, label: 'ACTIVE SHAREHOLDER' };
    }
    if (state.firstDepositTimestamp > 0n || state.costBasisUSD > 0n) {
      return { status: 'Admin' as const, label: 'HISTORICAL INVESTOR' };
    }
    return { status: 'Unknown' as const, label: 'UNINITIALIZED ACCOUNT' };
  };

  const statusBadge = getAccountStatus();

  return (
    <div className="space-y-6">
      {/* Inspected Account Header Banner */}
      <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground tracking-tight font-mono">
                {state.targetAddress}
              </h2>
              <StatusBadge status={statusBadge.status} label={statusBadge.label} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live on-chain state inspection from CostBasisManagerV2 & PerformanceManager
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-colors min-h-[38px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copy Address</span>
              </>
            )}
          </button>

          {state.targetAddress && (
            <a
              href={`${state.explorerBaseUrl}/address/${state.targetAddress}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors min-h-[38px]"
            >
              <span>BaseScan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Account Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="UVBE Share Holdings"
          value={`${shareBalanceFormatted} UVBE`}
          subtitle={`${state.shareBalance.toString()} wei`}
          icon={Coins}
          glowColor="purple"
        />

        <StatCard
          title="First Deposit Recorded"
          value={state.firstDepositTimestamp > 0n ? firstDepositDate.split(',')[0] : 'None'}
          subtitle={
            state.firstDepositTimestamp > 0n ? firstDepositDate.split(',')[1] : 'No entry record'
          }
          icon={Calendar}
          glowColor="blue"
        />

        <StatCard
          title="Cumulative Holding Period"
          value={holdingPeriodStr}
          subtitle={`${state.performanceStruct.holdingPeriod.toString()} seconds`}
          icon={Clock}
          glowColor="emerald"
        />

        <StatCard
          title="Escrow Accounting Context"
          value={state.isEscrow ? 'ESCROW ENABLED' : 'STANDARD'}
          subtitle={state.isEscrow ? 'Excluded from cost movement' : 'Normal portfolio basis'}
          icon={state.isEscrow ? ShieldAlert : ShieldCheck}
          glowColor={state.isEscrow ? 'amber' : 'cyan'}
        />
      </div>
    </div>
  );
}
