'use client';

import { useState, useEffect } from 'react';

const INDEXER_API_URL = process.env.NEXT_PUBLIC_INDEXER_API_URL || 'http://localhost:3006';

export interface IndexedEvent {
  blockNumber: number;
  txHash: string;
  user?: string;
  asset?: string;
  from?: string;
  to?: string;
  amount?: string;
  value?: string;
  timestamp: string;
}

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<IndexedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/events`);
        if (res.ok) {
          const data = await res.json();
          const combined = [
            ...(data.deposits || []).map((d: any) => ({ ...d, type: 'DEPOSIT' })),
            ...(data.redeems || []).map((r: any) => ({ ...r, type: 'REDEEM' })),
            ...(data.transfers || []).map((t: any) => ({ ...t, type: 'TRANSFER' })),
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
  }, []);

  return { transactions, isLoading };
}

export function useProtocolRevenue() {
  const [revenueHistory, setRevenueHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/events`);
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
  }, []);

  return { revenueHistory, isLoading };
}

export function useHistoricalNAV() {
  const [navHistory, setNavHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNAV() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/nav`);
        if (res.ok) {
          const data = await res.json();
          setNavHistory(data || []);
        }
      } catch (err) {
        console.warn('NAV history indexer error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNAV();
  }, []);

  return { navHistory, isLoading };
}

export function useHistoricalTVL() {
  const [tvlHistory, setTvlHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTVL() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/tvl`);
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
  }, []);

  return { tvlHistory, isLoading };
}

export function useHistoricalFees() {
  const [feesHistory, setFeesHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await fetch(`${INDEXER_API_URL}/api/indexer/events`);
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
  }, []);

  return { feesHistory, isLoading };
}
