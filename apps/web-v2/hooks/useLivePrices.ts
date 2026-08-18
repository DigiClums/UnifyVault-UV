'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface LiveMarketPrices {
  btcPriceUSD: number;
  ethPriceUSD: number;
  usdcPriceUSD: number;
  btcPrice18: bigint;
  ethPrice18: bigint;
  usdcPrice18: bigint;
  isLive: boolean;
  lastUpdated: Date | null;
  btcTrend: 'up' | 'down' | 'flat';
  ethTrend: 'up' | 'down' | 'flat';
  usdcTrend: 'up' | 'down' | 'flat';
  btcChangeUSD: number;
  ethChangeUSD: number;
  updateCount: number;
  isUpdating: boolean;
  flashStates: {
    btc: 'up' | 'down' | null;
    eth: 'up' | 'down' | null;
    usdc: 'up' | 'down' | null;
  };
  refetch: () => Promise<void>;
}

interface SpotRates {
  btcUSD: number;
  ethUSD: number;
  usdcUSD: number;
  timestamp: number;
}

async function fetchSpotRatesFromAPI(): Promise<SpotRates | null> {
  let btcUSD = 0;
  let ethUSD = 0;
  let usdcUSD = 1.0;
  let fetched = false;

  // Primary source: Coinbase Rates API
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
      cache: 'no-store',
    });
    const json = await res.json();
    const rates = json?.data?.rates;

    if (rates && rates.BTC && rates.ETH) {
      btcUSD = 1 / parseFloat(rates.BTC);
      ethUSD = 1 / parseFloat(rates.ETH);
      usdcUSD = rates.USDC ? 1 / parseFloat(rates.USDC) : 1.0;
      fetched = true;
    }
  } catch (err) {
    // Fallback to CoinGecko
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,usd-coin&vs_currencies=usd',
        { cache: 'no-store' },
      );
      const cgData = await cgRes.json();
      if (cgData?.bitcoin?.usd && cgData?.ethereum?.usd) {
        btcUSD = cgData.bitcoin.usd;
        ethUSD = cgData.ethereum.usd;
        usdcUSD = cgData['usd-coin']?.usd || 1.0;
        fetched = true;
      }
    } catch (e) {
      console.warn('[useLivePrices] Failed fetching live prices fallback:', e);
    }
  }

  if (fetched && btcUSD > 0 && ethUSD > 0) {
    return { btcUSD, ethUSD, usdcUSD, timestamp: Date.now() };
  }
  return null;
}

export function useLivePrices(): LiveMarketPrices {
  const query = useQuery({
    queryKey: ['liveSpotPrices'],
    queryFn: fetchSpotRatesFromAPI,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const [flashStates, setFlashStates] = useState<{
    btc: 'up' | 'down' | null;
    eth: 'up' | 'down' | null;
    usdc: 'up' | 'down' | null;
  }>({ btc: null, eth: null, usdc: null });

  const [trends, setTrends] = useState<{
    btcTrend: 'up' | 'down' | 'flat';
    ethTrend: 'up' | 'down' | 'flat';
    usdcTrend: 'up' | 'down' | 'flat';
    btcChangeUSD: number;
    ethChangeUSD: number;
    updateCount: number;
  }>({
    btcTrend: 'flat',
    ethTrend: 'flat',
    usdcTrend: 'flat',
    btcChangeUSD: 0,
    ethChangeUSD: 0,
    updateCount: 0,
  });

  const prevPricesRef = useRef<{ btcUSD: number; ethUSD: number; usdcUSD: number } | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const { btcUSD, ethUSD, usdcUSD } = query.data;
    const prev = prevPricesRef.current;
    if (!prev) {
      prevPricesRef.current = { btcUSD, ethUSD, usdcUSD };
      return;
    }

    let btcTrend: 'up' | 'down' | 'flat' = 'flat';
    let ethTrend: 'up' | 'down' | 'flat' = 'flat';
    let usdcTrend: 'up' | 'down' | 'flat' = 'flat';
    let btcFlash: 'up' | 'down' | null = null;
    let ethFlash: 'up' | 'down' | null = null;
    let usdcFlash: 'up' | 'down' | null = null;
    let btcChange = 0;
    let ethChange = 0;

    if (btcUSD > prev.btcUSD) {
      btcTrend = 'up';
      btcFlash = 'up';
      btcChange = btcUSD - prev.btcUSD;
    } else if (btcUSD < prev.btcUSD) {
      btcTrend = 'down';
      btcFlash = 'down';
      btcChange = btcUSD - prev.btcUSD;
    }

    if (ethUSD > prev.ethUSD) {
      ethTrend = 'up';
      ethFlash = 'up';
      ethChange = ethUSD - prev.ethUSD;
    } else if (ethUSD < prev.ethUSD) {
      ethTrend = 'down';
      ethFlash = 'down';
      ethChange = ethUSD - prev.ethUSD;
    }

    if (usdcUSD > prev.usdcUSD) {
      usdcTrend = 'up';
      usdcFlash = 'up';
    } else if (usdcUSD < prev.usdcUSD) {
      usdcTrend = 'down';
      usdcFlash = 'down';
    }

    prevPricesRef.current = { btcUSD, ethUSD, usdcUSD };

    setTrends((state) => ({
      btcTrend: btcFlash ? btcTrend : state.btcTrend,
      ethTrend: ethFlash ? ethTrend : state.ethTrend,
      usdcTrend: usdcFlash ? usdcTrend : state.usdcTrend,
      btcChangeUSD: btcChange !== 0 ? btcChange : state.btcChangeUSD,
      ethChangeUSD: ethChange !== 0 ? ethChange : state.ethChangeUSD,
      updateCount: state.updateCount + 1,
    }));

    if (btcFlash || ethFlash || usdcFlash) {
      setFlashStates({ btc: btcFlash, eth: ethFlash, usdc: usdcFlash });
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashStates({ btc: null, eth: null, usdc: null });
      }, 1500);
    }
  }, [query.data]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const btcUSD = query.data?.btcUSD ?? 0;
  const ethUSD = query.data?.ethUSD ?? 0;
  const usdcUSD = query.data?.usdcUSD ?? 1.0;
  const isLive = Boolean(query.data && btcUSD > 0 && ethUSD > 0);
  const lastUpdated = query.data?.timestamp ? new Date(query.data.timestamp) : null;

  const btcPrice18 = BigInt(Math.floor(btcUSD * 1e18));
  const ethPrice18 = BigInt(Math.floor(ethUSD * 1e18));
  const usdcPrice18 = BigInt(Math.floor(usdcUSD * 1e18));

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    btcPriceUSD: btcUSD,
    ethPriceUSD: ethUSD,
    usdcPriceUSD: usdcUSD,
    btcPrice18,
    ethPrice18,
    usdcPrice18,
    isLive,
    lastUpdated,
    btcTrend: trends.btcTrend,
    ethTrend: trends.ethTrend,
    usdcTrend: trends.usdcTrend,
    btcChangeUSD: trends.btcChangeUSD,
    ethChangeUSD: trends.ethChangeUSD,
    updateCount: trends.updateCount,
    isUpdating: query.isFetching,
    flashStates,
    refetch,
  };
}
