'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { NavSnapshot } from '../types';
import { getDefaultChainId } from '../constants';

const INDEXER_API_URL =
  process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_INDEXER_API_URL || '';

export interface IndexedEvent {
  blockNumber: number;
  txHash: string;
  logIndex?: number;
  type?: string;
  user?: string;
  asset?: string;
  from?: string;
  to?: string;
  amount?: string;
  amountIn?: string;
  grossAmount?: string;
  netAmount?: string;
  feeAmount?: string;
  sharesMinted?: string;
  sharesBurned?: string;
  value?: string;
  timestamp: string;
  [key: string]: unknown;
}

export function useTransactionHistory() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const [transactions, setTransactions] = useState<IndexedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(
          `${INDEXER_API_URL}/api/indexer/events?chainId=${activeChainId}`,
        ).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          const combined = [
            ...(data.deposits || []).map((d: IndexedEvent) => ({ ...d, type: 'DEPOSIT' })),
            ...(data.redeems || []).map((r: IndexedEvent) => ({ ...r, type: 'REDEEM' })),
            ...(data.transfers || []).map((t: IndexedEvent) => ({ ...t, type: 'TRANSFER' })),
            ...(data.fees || []).map((f: IndexedEvent) => ({ ...f, type: 'FEE_COLLECTED' })),
          ];
          setTransactions(combined);
        }
      } catch (err) {
        console.warn('Indexer connection warning:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 10_000);
    return () => clearInterval(interval);
  }, [activeChainId]);

  return { transactions, isLoading };
}

export function useProtocolRevenue() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const [revenueHistory, setRevenueHistory] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/events?chainId=${activeChainId}`);
        if (res.ok) {
          const data = await res.json();
          setRevenueHistory(data.fees || []);
        }
      } catch (err) {
        console.warn('Revenue indexer fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevenue();
  }, [activeChainId]);

  return { revenueHistory, isLoading };
}

export function useHistoricalNAV(period: string = 'ALL') {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const [navHistory, setNavHistory] = useState<NavSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNAV() {
      setIsLoading(true);
      try {
        let res = await fetch(`/api/nav/history?period=${period}&chainId=${activeChainId}`).catch(
          () => null,
        );
        if (!res || !res.ok) {
          res = await fetch(
            `${INDEXER_API_URL}/api/nav/history?period=${period}&chainId=${activeChainId}`,
          ).catch(() => null);
        }
        if (res && res.ok) {
          const data = await res.json();
          setNavHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('NAV history indexer error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNAV();
  }, [period, activeChainId]);

  return { navHistory, isLoading };
}

export function useHistoricalTVL() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const [tvlHistory, setTvlHistory] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTVL() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/tvl?chainId=${activeChainId}`);
        if (res.ok) {
          const data = await res.json();
          setTvlHistory(data || []);
        }
      } catch (err) {
        console.warn('TVL history indexer error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTVL();
  }, [activeChainId]);

  return { tvlHistory, isLoading };
}

export function useHistoricalFees() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const [feesHistory, setFeesHistory] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/events?chainId=${activeChainId}`);
        if (res.ok) {
          const data = await res.json();
          setFeesHistory(data.fees || []);
        }
      } catch (err) {
        console.warn('Fees history indexer error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFees();
  }, [activeChainId]);

  return { feesHistory, isLoading };
}

export function useIndexerStats() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/stats?chainId=${activeChainId}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.warn('Indexer stats fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [activeChainId]);

  return { stats, isLoading };
}
