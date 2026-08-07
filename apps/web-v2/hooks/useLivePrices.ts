'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

export function useLivePrices(): LiveMarketPrices {
  const [prices, setPrices] = useState<{
    btcUSD: number;
    ethUSD: number;
    usdcUSD: number;
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
  }>({
    btcUSD: 0,
    ethUSD: 0,
    usdcUSD: 1.0,
    isLive: false,
    lastUpdated: null,
    btcTrend: 'flat',
    ethTrend: 'flat',
    usdcTrend: 'flat',
    btcChangeUSD: 0,
    ethChangeUSD: 0,
    updateCount: 0,
    isUpdating: false,
    flashStates: {
      btc: null,
      eth: null,
      usdc: null,
    },
  });

  const prevPricesRef = useRef<{ btcUSD: number; ethUSD: number; usdcUSD: number } | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSpotPrices = useCallback(async () => {
    setPrices((prev) => ({ ...prev, isUpdating: true }));
    try {
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
        const prev = prevPricesRef.current;
        let btcTrend: 'up' | 'down' | 'flat' = 'flat';
        let ethTrend: 'up' | 'down' | 'flat' = 'flat';
        let usdcTrend: 'up' | 'down' | 'flat' = 'flat';
        let btcFlash: 'up' | 'down' | null = null;
        let ethFlash: 'up' | 'down' | null = null;
        let usdcFlash: 'up' | 'down' | null = null;
        let btcChange = 0;
        let ethChange = 0;

        if (prev) {
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
        }

        prevPricesRef.current = { btcUSD, ethUSD, usdcUSD };

        setPrices((state) => ({
          btcUSD,
          ethUSD,
          usdcUSD,
          isLive: true,
          lastUpdated: new Date(),
          btcTrend: btcFlash ? btcTrend : state.btcTrend,
          ethTrend: ethFlash ? ethTrend : state.ethTrend,
          usdcTrend: usdcFlash ? usdcTrend : state.usdcTrend,
          btcChangeUSD: btcChange !== 0 ? btcChange : state.btcChangeUSD,
          ethChangeUSD: ethChange !== 0 ? ethChange : state.ethChangeUSD,
          updateCount: state.updateCount + 1,
          isUpdating: false,
          flashStates: {
            btc: btcFlash,
            eth: ethFlash,
            usdc: usdcFlash,
          },
        }));

        // Reset flash state after 1.5 seconds for visual cue
        if (btcFlash || ethFlash || usdcFlash) {
          if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = setTimeout(() => {
            setPrices((state) => ({
              ...state,
              flashStates: { btc: null, eth: null, usdc: null },
            }));
          }, 1500);
        }
      } else {
        setPrices((prev) => ({ ...prev, isUpdating: false }));
      }
    } catch (e) {
      console.warn('[useLivePrices] Error in fetchSpotPrices:', e);
      setPrices((prev) => ({ ...prev, isUpdating: false }));
    }
  }, []);

  useEffect(() => {
    fetchSpotPrices();
    // Poll every 15 seconds for real-time responsiveness
    const interval = setInterval(fetchSpotPrices, 15_000);

    return () => {
      clearInterval(interval);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [fetchSpotPrices]);

  const btcPrice18 = BigInt(Math.floor(prices.btcUSD * 1e18));
  const ethPrice18 = BigInt(Math.floor(prices.ethUSD * 1e18));
  const usdcPrice18 = BigInt(Math.floor(prices.usdcUSD * 1e18));

  return {
    btcPriceUSD: prices.btcUSD,
    ethPriceUSD: prices.ethUSD,
    usdcPriceUSD: prices.usdcUSD,
    btcPrice18,
    ethPrice18,
    usdcPrice18,
    isLive: prices.isLive,
    lastUpdated: prices.lastUpdated,
    btcTrend: prices.btcTrend,
    ethTrend: prices.ethTrend,
    usdcTrend: prices.usdcTrend,
    btcChangeUSD: prices.btcChangeUSD,
    ethChangeUSD: prices.ethChangeUSD,
    updateCount: prices.updateCount,
    isUpdating: prices.isUpdating,
    flashStates: prices.flashStates,
    refetch: fetchSpotPrices,
  };
}

