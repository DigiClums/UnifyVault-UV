'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import {
  History,
  Lock,
  Download,
  RefreshCw,
  Award,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { formatUnits, type Address, parseAbiItem } from 'viem';
import { useStaking } from '../../hooks/useStaking';
import { getExplorerBaseUrl, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

interface StakingTxItem {
  id: string;
  type: 'stake' | 'claim' | 'restake' | 'milestone';
  amount: bigint;
  timestamp: number;
  txHash?: string;
  details?: string;
}

export function StakingTransactionHistory() {
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const { permanentStake, stakeCount, initialStakeDate, rewards, totalRewardPaid } = useStaking();
  const [filter, setFilter] = useState<'all' | 'stake' | 'claim' | 'restake'>('all');
  const [events, setEvents] = useState<StakingTxItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const explorerBase = getExplorerBaseUrl(chain?.id);

  // Synthesize and fetch transaction logs when available
  useEffect(() => {
    let isMounted = true;

    async function fetchUserEvents() {
      if (!userAddress || !publicClient) {
        if (isMounted) setEvents([]);
        return;
      }

      setIsLoadingEvents(true);
      const items: StakingTxItem[] = [];

      try {
        const stakingVault = DEPLOYED_CONTRACTS_SEPOLIA.StakingVault as Address;
        const distributor = DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor as Address;
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 10_000n ? currentBlock - 10_000n : 0n;

        // 1. Fetch StakeCreated logs
        const stakeLogs = await publicClient.getLogs({
          address: stakingVault,
          event: parseAbiItem(
            'event StakeCreated(address indexed user, uint256 indexed stakeId, uint256 grossAmount, uint256 protocolCapital, uint256 treasuryFee, address indexed referrer)',
          ),
          args: { user: userAddress },
          fromBlock,
          toBlock: 'latest',
        });

        for (const log of stakeLogs) {
          items.push({
            id: `stake-${log.transactionHash}-${log.logIndex}`,
            type: 'stake',
            amount: (log.args as any).grossAmount || 0n,
            timestamp: Date.now() - 3600_000,
            txHash: log.transactionHash,
            details: `Net Capital: ${Number(formatUnits((log.args as any).protocolCapital || 0n, 18)).toFixed(2)} UVBE (95%)`,
          });
        }

        // 2. Fetch RewardClaimed logs
        const claimLogs = await publicClient.getLogs({
          address: distributor,
          event: parseAbiItem(
            'event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp)',
          ),
          args: { user: userAddress },
          fromBlock,
          toBlock: 'latest',
        });

        for (const log of claimLogs) {
          items.push({
            id: `claim-${log.transactionHash}-${log.logIndex}`,
            type: 'claim',
            amount: (log.args as any).amount || 0n,
            timestamp: Number((log.args as any).timestamp || 0n) * 1000 || Date.now(),
            txHash: log.transactionHash,
            details: 'Claimed to wallet',
          });
        }

        // 3. Fetch RewardRestaked logs
        const restakeLogs = await publicClient.getLogs({
          address: distributor,
          event: parseAbiItem(
            'event RewardRestaked(address indexed user, uint256 indexed newStakeId, uint256 amount, uint256 timestamp)',
          ),
          args: { user: userAddress },
          fromBlock,
          toBlock: 'latest',
        });

        for (const log of restakeLogs) {
          items.push({
            id: `restake-${log.transactionHash}-${log.logIndex}`,
            type: 'restake',
            amount: (log.args as any).amount || 0n,
            timestamp: Number((log.args as any).timestamp || 0n) * 1000 || Date.now(),
            txHash: log.transactionHash,
            details: 'Compounded into permanent stake (0% fee)',
          });
        }
      } catch (err) {
        console.warn('Could not query recent on-chain logs:', err);
      }

      // If user has recorded permanent stake but no RPC logs in recent block window, synthesize recorded position
      if (items.length === 0 && permanentStake > 0n) {
        items.push({
          id: 'stake-recorded-position',
          type: 'stake',
          amount: permanentStake,
          timestamp: initialStakeDate ? initialStakeDate.getTime() : Date.now(),
          details: 'Recorded Permanent Protocol Stake',
        });
      }

      if (isMounted) {
        setEvents(items);
        setIsLoadingEvents(false);
      }
    }

    fetchUserEvents();

    return () => {
      isMounted = false;
    };
  }, [userAddress, publicClient, permanentStake, initialStakeDate]);

  const filteredEvents = events.filter((ev) => {
    if (filter === 'all') return true;
    return ev.type === filter;
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_rgba(0,0,0,0.85)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-black dark:text-[#BFFF00]" />
            Staking & Reward Transaction History
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Auditable on-chain activity log for permanent stakes, reward claims, and compound
            restakes.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'stake', 'claim', 'restake'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-colors ${
                filter === tab
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List / Table */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-400" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {userAddress
              ? 'No transactions found for this filter'
              : 'Connect wallet to view your history'}
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your stake creations, reward claims, and compound restake transactions will appear here
            with live Basescan verification links.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-3.5 py-2.5">Action Type</th>
                <th className="px-3.5 py-2.5">Amount</th>
                <th className="px-3.5 py-2.5">Details</th>
                <th className="px-3.5 py-2.5">Date / Timestamp</th>
                <th className="px-3.5 py-2.5 text-right">Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
              {filteredEvents.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-3.5 py-2.5 font-sans font-semibold">
                    {item.type === 'stake' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30">
                        <Lock className="w-3 h-3" /> Permanent Stake
                      </span>
                    )}
                    {item.type === 'claim' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        <Download className="w-3 h-3" /> Claim Rewards
                      </span>
                    )}
                    {item.type === 'restake' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <RefreshCw className="w-3 h-3" /> Compound Restake
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                    {Number(formatUnits(item.amount, 18)).toFixed(4)} UVBE
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 font-sans text-[11px]">
                    {item.details || '—'}
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                    {new Date(item.timestamp).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {item.txHash ? (
                      <a
                        href={`${explorerBase}/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-500 hover:underline font-mono text-[11px]"
                      >
                        {item.txHash.slice(0, 6)}...{item.txHash.slice(-4)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px]">On-chain Position</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
