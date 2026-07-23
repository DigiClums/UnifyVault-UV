'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { useGovernance } from '../../hooks/useGovernance';
import { useTransactionStore } from '../../store/useTransactionStore';

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const { roles, governanceData } = useGovernance();
  const { openModal, setStep, setTxHash, setError } = useTransactionStore();

  const [btcWeight, setBtcWeight] = React.useState<number>(6000);
  const [ethWeight, setEthWeight] = React.setEthWeight || React.useState<number>(4000);

  const totalWeight = btcWeight + ethWeight;
  const isValidStrategy = totalWeight === 10000;

  const handlePause = async (pauseState: boolean) => {
    openModal('APPROVE');
    setStep('EXECUTING');
    try {
      // Simulate governance action execution
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTxHash(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      );
    } catch (err: any) {
      setError(err?.message || 'Governance execution failed');
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
    } catch (err: any) {
      setError(err?.message || 'Liquidity refill failed');
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
    } catch (err: any) {
      setError(err?.message || 'Liquidity sweep failed');
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
    } catch (err: any) {
      setError(err?.message || 'Strategy update failed');
    }
  };

  const activityLog = [
    {
      id: '1',
      action: 'Liquidity Refill',
      executor: '0x1111...1111',
      time: '2 hours ago',
      status: 'CONFIRMED',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    {
      id: '2',
      action: 'Strategy Weight Update',
      executor: '0x1111...1111',
      time: '1 day ago',
      status: 'CONFIRMED',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      id: '3',
      action: 'Emergency Unpause',
      executor: '0x2222...2222',
      time: '3 days ago',
      status: 'CONFIRMED',
      txHash: '0x9999999999abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Title & Role Verification */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Governance Dashboard & Admin Console
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Protocol parameter governance, emergency pause switches, strategy allocation, and
              treasury management.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {roles.isAdmin && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                DEFAULT_ADMIN_ROLE
              </span>
            )}
            {roles.isGovernance && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                GOVERNANCE_ROLE
              </span>
            )}
            {roles.isGuardian && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                GUARDIAN_ROLE
              </span>
            )}
            {roles.isReadOnly && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                🔒 Read-Only Mode
              </span>
            )}
          </div>
        </div>

        {/* Governance Wallet Banner */}
        <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs font-mono">
            <div>
              <span className="text-gray-400 block">Governance Multisig</span>
              <span className="font-bold text-white mt-1 block">0x1111...1111</span>
            </div>
            <div>
              <span className="text-gray-400 block">Guardian Multisig</span>
              <span className="font-bold text-amber-400 mt-1 block">0x2222...2222</span>
            </div>
            <div>
              <span className="text-gray-400 block">Connected Wallet</span>
              <span className="font-bold text-blue-400 mt-1 block">
                {isConnected && address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : 'Not Connected'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Protocol Version</span>
              <span className="font-bold text-emerald-400 mt-1 block">v2.0.0-rc1</span>
            </div>
          </div>
        </div>

        {/* Emergency & Liquidity Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Emergency Pause Controls */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-rose-400 mb-2 flex items-center justify-between">
              <span>Emergency Controls</span>
              <HealthBadge status="HEALTHY" />
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Guardian and Governance role holders can trigger emergency pause to halt deposits and
              redemptions.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => handlePause(true)}
                disabled={!roles.isGuardian && !roles.isGovernance}
                className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-500 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
              >
                Emergency Pause Protocol
              </button>
              <button
                onClick={() => handlePause(false)}
                disabled={!roles.isGovernance}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800 py-3 font-bold text-gray-200 hover:bg-gray-700 transition-colors disabled:bg-gray-800/40 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Unpause Protocol
              </button>
            </div>
          </div>

          {/* Liquidity Operations */}
          <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-2">Liquidity Management Operations</h3>
            <p className="text-xs text-gray-400 mb-4">
              Execute manual operational balance refills or reserve sweeps.
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-gray-900/60 p-3 rounded-xl border border-gray-800 mb-4">
              <div>
                <span className="text-gray-400 block">Operational Bal</span>
                <span className="font-bold text-white">$100,000.00 (10%)</span>
              </div>
              <div>
                <span className="text-gray-400 block">Reserve Bal</span>
                <span className="font-bold text-white">$900,000.00 (90%)</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRefill}
                disabled={!roles.isGovernance}
                className="flex-1 rounded-xl bg-amber-600 py-3 font-bold text-white hover:bg-amber-500 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-amber-600/20"
              >
                Execute Refill
              </button>
              <button
                onClick={handleSweep}
                disabled={!roles.isGovernance}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
              >
                Execute Sweep
              </button>
            </div>
          </div>
        </div>

        {/* Strategy Allocation Manager */}
        <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Strategy Target Weight Allocation</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Enforces strict 10,000 BPS (100.00%) total weight invariant
              </p>
            </div>
            <span
              className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${
                isValidStrategy
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              Total: {totalWeight} BPS{' '}
              {isValidStrategy ? '✓ Valid' : '✕ Invalid (Must equal 10000)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <label className="text-xs font-bold text-gray-300 block mb-2">
                cbBTC Target Weight (BPS)
              </label>
              <input
                type="number"
                value={btcWeight}
                onChange={(e) => setBtcWeight(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-lg focus:outline-none"
              />
              <span className="text-xs text-gray-400 mt-1 block">
                {(btcWeight / 100).toFixed(2)}% Allocation
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <label className="text-xs font-bold text-gray-300 block mb-2">
                WETH Target Weight (BPS)
              </label>
              <input
                type="number"
                value={ethWeight}
                onChange={(e) => setEthWeight(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-lg focus:outline-none"
              />
              <span className="text-xs text-gray-400 mt-1 block">
                {(ethWeight / 100).toFixed(2)}% Allocation
              </span>
            </div>
          </div>

          <button
            onClick={handleUpdateStrategy}
            disabled={!roles.isGovernance || !isValidStrategy}
            className="w-full rounded-xl bg-purple-600 py-3.5 font-bold text-white hover:bg-purple-500 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-xl shadow-purple-600/20"
          >
            Submit Strategy Weight Update
          </button>
        </div>

        {/* Governance Activity Log Table */}
        <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-white mb-4">Governance Activity Log</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Executor</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                {activityLog.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5 font-bold text-white">{log.action}</td>
                    <td className="py-3.5 text-gray-400">{log.executor}</td>
                    <td className="py-3.5 text-gray-400">{log.time}</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">{log.status}</td>
                    <td className="py-3.5 text-right">
                      <a
                        href={`https://basescan.org/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <TransactionModal />
      <Footer />
    </div>
  );
}
