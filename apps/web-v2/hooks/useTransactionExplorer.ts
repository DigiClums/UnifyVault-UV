'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import type { Address } from 'viem';

import { useProtocolDirectory } from './useProtocolDirectory';
import { getChainTokens } from '../constants';
import {
  discoverTransactions,
  type TransactionGroup,
  type DecodedTimelineEvent,
  type ExplorerState,
  type SyncStatus,
  type BlockWindow,
  type ExplorerStats,
} from '../lib/explorer';

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  TransactionGroup,
  DecodedTimelineEvent,
  ExplorerState,
  SyncStatus,
  BlockWindow,
  ExplorerStats,
};

export interface ExplorerData {
  transactions: TransactionGroup[];
  currentWindow: BlockWindow;
  latestBlock: bigint;
  stats: ExplorerStats;
}

// ─── Polling fallback interval ──────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // 30 seconds – conservative

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTransactionExplorer(pageIndex: number) {
  const { chain } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chainId = chain?.id || baseSepolia.id;
  const tokens = getChainTokens(chainId);

  const {
    controller,
    vault,
    treasury,
    token,
    strategyManager,
    costBasisManager,
    performanceManager,
    swapAdapter,
    isLoading: isDirLoading,
    isError: isDirError,
  } = useProtocolDirectory();

  const supported = Boolean(chainId && publicClient && controller);

  // ─── Main Query ──────────────────────────────────────────────────────

  const query = useQuery({
    queryKey: ['unifyvault-explorer', chainId, controller, pageIndex],
    enabled: supported,
    staleTime: 15_000,
    gcTime: 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    queryFn: async (): Promise<ExplorerData> => {
      if (!publicClient || !controller) {
        throw new Error('Public client or controller unavailable');
      }

      const latestBlock = await publicClient.getBlockNumber();

      const { groups, window, hasMore } = await discoverTransactions(
        publicClient,
        controller,
        {
          controller,
          vault,
          treasury,
          token,
          strategyManager,
          costBasisManager,
          performanceManager,
          swapAdapter,
        },
        tokens.USDC,
        tokens.cbBTC,
        tokens.WETH,
        latestBlock,
        pageIndex,
      );

      const stats: ExplorerStats = {
        total: groups.length,
        deposits: groups.filter((g) => g.actionType === 'deposit').length,
        redeems: groups.filter((g) => g.actionType === 'redeem').length,
        fees: groups.filter((g) => g.actionType === 'fee').length,
        admin: groups.filter((g) => g.actionType === 'admin').length,
      };

      setLastSyncTime(Date.now());
      setSyncStatus('live');

      return {
        transactions: groups,
        currentWindow: window,
        latestBlock,
        stats,
      };
    },
  });

  // ─── State derivation ────────────────────────────────────────────────

  const state: ExplorerState = useMemo(() => {
    if (!chainId || !publicClient || !controller) {
      return isDirLoading ? 'loading' : 'unsupported';
    }
    if (query.isLoading) return 'loading';
    if (query.isFetching && query.data) return 'syncing';
    if (query.isError || isDirError) return 'error';
    return 'ready';
  }, [chainId, controller, isDirError, isDirLoading, publicClient, query]);

  // ─── Live Watcher ────────────────────────────────────────────────────

  useEffect(() => {
    if (!publicClient || !controller || !chainId) return;

    let active = true;

    // Primary: watchContractEvent
    let unwatch: (() => void) | undefined;
    try {
      unwatch = publicClient.watchContractEvent({
        address: controller,
        abi: [
          {
            type: 'event',
            name: 'DepositExecuted',
            inputs: [
              { indexed: true, name: 'user', type: 'address' },
              { indexed: false, name: 'depositAmount', type: 'uint256' },
              { indexed: false, name: 'fee', type: 'uint256' },
              { indexed: false, name: 'targetAssets', type: 'address[]' },
              { indexed: false, name: 'assetsBought', type: 'uint256[]' },
              { indexed: false, name: 'sharesMinted', type: 'uint256' },
              { indexed: false, name: 'navAfter', type: 'uint256' },
            ],
          },
          {
            type: 'event',
            name: 'DepositCompleted',
            inputs: [
              { indexed: true, name: 'receiver', type: 'address' },
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: false, name: 'grossDeposit', type: 'uint256' },
              { indexed: false, name: 'protocolFee', type: 'uint256' },
              { indexed: false, name: 'netDeposit', type: 'uint256' },
              { indexed: false, name: 'sharesMinted', type: 'uint256' },
            ],
          },
          {
            type: 'event',
            name: 'RedeemExecuted',
            inputs: [
              { indexed: true, name: 'user', type: 'address' },
              { indexed: false, name: 'sharesBurned', type: 'uint256' },
              { indexed: false, name: 'targetAssets', type: 'address[]' },
              { indexed: false, name: 'assetsSold', type: 'uint256[]' },
              { indexed: false, name: 'fee', type: 'uint256' },
              { indexed: false, name: 'usdcReturned', type: 'uint256' },
              { indexed: false, name: 'navAfter', type: 'uint256' },
            ],
          },
          {
            type: 'event',
            name: 'RedeemCompleted',
            inputs: [
              { indexed: true, name: 'owner', type: 'address' },
              { indexed: true, name: 'receiver', type: 'address' },
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: false, name: 'sharesBurned', type: 'uint256' },
              { indexed: false, name: 'grossAssets', type: 'uint256' },
              { indexed: false, name: 'protocolFee', type: 'uint256' },
              { indexed: false, name: 'netAssets', type: 'uint256' },
            ],
          },
          {
            type: 'event',
            name: 'ProtocolFeeCollected',
            inputs: [
              { indexed: true, name: 'payer', type: 'address' },
              { indexed: true, name: 'asset', type: 'address' },
              { indexed: false, name: 'feeAmount', type: 'uint256' },
            ],
          },
        ],
        onLogs: () => {
          if (!active) return;
          setSyncStatus('syncing');
          queryClient.invalidateQueries({
            queryKey: ['unifyvault-explorer', chainId, controller],
          });
        },
        onError: () => {
          // Fall through to polling
        },
      });
    } catch {
      // watchContractEvent not supported – use polling
    }

    // Fallback polling
    pollRef.current = setInterval(() => {
      if (!active) return;
      const sinceLastSync = Date.now() - lastSyncTime;
      if (sinceLastSync > 60_000) {
        setSyncStatus('stale');
      }
      queryClient.invalidateQueries({
        queryKey: ['unifyvault-explorer', chainId, controller],
      });
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (unwatch) unwatch();
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [chainId, controller, publicClient, queryClient, lastSyncTime]);

  // ─── Refresh ─────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    setSyncStatus('syncing');
    queryClient.invalidateQueries({
      queryKey: ['unifyvault-explorer', chainId, controller],
    });
  }, [chainId, controller, queryClient]);

  // ─── Chain name ───────────────────────────────────────────────────────

  const chainName = useMemo(() => {
    if (chain?.name) return chain.name;
    if (chainId === baseSepolia.id) return 'Base Sepolia';
    return 'Unknown Network';
  }, [chain, chainId]);

  return {
    ...query,
    state,
    syncStatus,
    lastSyncTime,
    controller,
    vault,
    treasury,
    token,
    chainId,
    chainName,
    refresh,
    isLive: syncStatus === 'live',
  };
}
