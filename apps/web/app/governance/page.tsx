'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { useGovernance } from '../../hooks/useGovernance';
import { useTransactionStore } from '../../store/useTransactionStore';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string') return message;
  }

  return fallback;
}

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const { roles } = useGovernance();
  const { openModal, setStep, setTxHash, setError } = useTransactionStore();

  const [btcWeight, setBtcWeight] = React.useState<number>(6000);
  const [ethWeight, setEthWeight] = React.useState<number>(4000);

  const totalWeight = btcWeight + ethWeight;
  const isValidStrategy = totalWeight === 10000;

  const handlePause = async (_pauseState: boolean) => {
    openModal('APPROVE');
    setStep('EXECUTING');
    try {
      // Simulate governance action execution
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTxHash(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      );
    } catch (error) {
      setError(getErrorMessage(error, 'Governance execution failed'));
    }
  };

  const handleRefill = async () => {
    openModal('APPROVE');
    setStep('EXECUTING');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTxHash(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
      );
    } catch (error) {
      setError(getErrorMessage(error, 'Liquidity refill failed'));
    }
  };

  const handleSweep = async () => {
    openModal('APPROVE');
    setStep('EXECUTING');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTxHash(
        '0x9999999999abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      );
    } catch (error) {
      setError(getErrorMessage(error, 'Liquidity sweep failed'));
    }
  };

  const handleUpdateStrategy = async () => {
    if (!isValidStrategy) return;
    openModal('APPROVE');
    setStep('EXECUTING');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTxHash(
        '0x8888888888abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      );
    } catch (error) {
      setError(getErrorMessage(error, 'Strategy update failed'));
    }
  };

  const activityLog: Array<{
    id: string;
    action: string;
    executor: string;
    time: string;
    status: string;
    txHash: string;
  }> = [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Title & Role Verification */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Governance Dashboard & Admin Console
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Protocol parameter governance, emergency pause switches, strategy allocation, and
              treasury management.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {roles.isAdmin && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                DEFAULT_ADMIN_ROLE
              </span>
            )}
            {roles.isGovernance && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                GOVERNANCE_ROLE
              </span>
            )}
            {roles.isGuardian && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                GUARDIAN_ROLE
              </span>
            )}
            {roles.isReadOnly && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
                🔒 Read-Only Mode
              </span>
            )}
          </div>
        </div>

        {/* Governance Wallet Banner */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md mb-8 shadow-sm dark:shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block">Governance Role</span>
              <span className="font-bold text-foreground mt-1 block">
                {roles.isGovernance ? 'Active (Authorized)' : 'Restricted'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Guardian Role</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                {roles.isGuardian ? 'Active (Authorized)' : 'Restricted'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Connected Wallet</span>
              <span className="font-bold text-primary mt-1 block">
                {isConnected && address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : 'Not Connected'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Protocol Version</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                v2.0.0-rc1
              </span>
            </div>
          </div>
        </div>

        {/* Emergency & Liquidity Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Emergency Pause Controls */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10 p-6 backdrop-blur-md shadow-sm dark:shadow-none">
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center justify-between">
              <span>Emergency Controls</span>
              <HealthBadge status="HEALTHY" />
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Guardian and Governance role holders can trigger emergency pause to halt deposits and
              redemptions.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => handlePause(true)}
                disabled={!roles.isGuardian && !roles.isGovernance}
                className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-500 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
              >
                Emergency Pause Protocol
              </button>
              <button
                onClick={() => handlePause(false)}
                disabled={!roles.isGovernance}
                className="flex-1 rounded-xl border border-border bg-secondary hover:bg-accent py-3 font-bold text-foreground transition-colors disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                Unpause Protocol
              </button>
            </div>
          </div>

          {/* Liquidity Operations */}
          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Liquidity Management Operations
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Execute manual operational balance refills or reserve sweeps.
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-muted/40 dark:bg-gray-900/60 p-3 rounded-xl border border-border mb-4">
              <div>
                <span className="text-muted-foreground block">Operational Target</span>
                <span className="font-bold text-foreground">10.00% (1,000 BPS)</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Reserve Target</span>
                <span className="font-bold text-foreground">90.00% (9,000 BPS)</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRefill}
                disabled={!roles.isGovernance}
                className="flex-1 rounded-xl bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-lg shadow-amber-600/20"
              >
                Execute Refill
              </button>
              <button
                onClick={handleSweep}
                disabled={!roles.isGovernance}
                className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                Execute Sweep
              </button>
            </div>
          </div>
        </div>

        {/* Strategy Allocation Manager */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md mb-8 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Strategy Target Weight Allocation
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enforces strict 10,000 BPS (100.00%) total weight invariant
              </p>
            </div>
            <span
              className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                isValidStrategy
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              Total: {totalWeight} BPS{' '}
              {isValidStrategy ? '✓ Valid' : '✕ Invalid (Must equal 10000)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/60 border border-border">
              <label className="text-xs font-bold text-muted-foreground block mb-2">
                cbBTC Target Weight (BPS)
              </label>
              <input
                type="number"
                value={btcWeight}
                onChange={(e) => setBtcWeight(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-lg focus:outline-none"
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                {(btcWeight / 100).toFixed(2)}% Allocation
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 dark:bg-gray-900/60 border border-border">
              <label className="text-xs font-bold text-muted-foreground block mb-2">
                WETH Target Weight (BPS)
              </label>
              <input
                type="number"
                value={ethWeight}
                onChange={(e) => setEthWeight(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-lg focus:outline-none"
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                {(ethWeight / 100).toFixed(2)}% Allocation
              </span>
            </div>
          </div>

          <button
            onClick={handleUpdateStrategy}
            disabled={!roles.isGovernance || !isValidStrategy}
            className="w-full rounded-xl bg-purple-600 py-3.5 font-bold text-white hover:bg-purple-500 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-xl shadow-purple-600/20"
          >
            Submit Strategy Weight Update
          </button>
        </div>

        {/* Governance Activity Log Table */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none">
          <h3 className="text-lg font-bold text-foreground mb-4">Governance Activity Log</h3>

          {activityLog.length === 0 ? (
            <div className="p-8 text-center border border-border rounded-xl bg-muted/30">
              <span className="text-2xl mb-2 block">📋</span>
              <h4 className="font-bold text-foreground text-sm">No Governance Activity Recorded</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Admin strategy parameter updates and liquidity operations will be logged here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Action</th>
                    <th className="pb-3 font-semibold">Executor</th>
                    <th className="pb-3 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-xs">
                  {activityLog.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 font-bold text-foreground">{log.action}</td>
                      <td className="py-3.5 text-muted-foreground">{log.executor}</td>
                      <td className="py-3.5 text-muted-foreground">{log.time}</td>
                      <td className="py-3.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {log.status}
                      </td>
                      <td className="py-3.5 text-right">
                        <a
                          href={`https://basescan.org/tx/${log.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center min-h-[44px] text-primary hover:underline"
                        >
                          {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <TransactionModal />
    </div>
  );
}
