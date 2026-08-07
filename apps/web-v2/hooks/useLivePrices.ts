'use client';

import { useState, useEffect } from 'react';

export interface LiveMarketPrices {
  btcPriceUSD: number;
  ethPriceUSD: number;
  usdcPriceUSD: number;
  btcPrice18: bigint;
  ethPrice18: bigint;
  usdcPrice18: bigint;
  isLive: boolean;
}

export function useLivePrices(): LiveMarketPrices {
  const [prices, setPrices] = useState<LiveMarketPrices>({
    btcPriceUSD: 0,
    ethPriceUSD: 0,
    usdcPriceUSD: 1.0,
    btcPrice18: 0n,
    ethPrice18: 0n,
    usdcPrice18: 1_000_000_000_000_000_000n,
    isLive: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchSpotPrices() {
      try {
        const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
          cache: 'no-store',
        });
        const json = await res.json();
        const rates = json?.data?.rates;

        if (rates && rates.BTC && rates.ETH) {
          const btcUSD = 1 / parseFloat(rates.BTC);
          const ethUSD = 1 / parseFloat(rates.ETH);
          const usdcUSD = rates.USDC ? 1 / parseFloat(rates.USDC) : 1.0;

          if (isMounted) {
            setPrices({
              btcPriceUSD: btcUSD,
              ethPriceUSD: ethUSD,
              usdcPriceUSD: usdcUSD,
              btcPrice18: BigInt(Math.floor(btcUSD * 1e18)),
              ethPrice18: BigInt(Math.floor(ethUSD * 1e18)),
              usdcPrice18: BigInt(Math.floor(usdcUSD * 1e18)),
              isLive: true,
            });
          }
        }
      } catch (err) {
        // Fallback to CoinGecko if Coinbase fails
        try {
          const cgRes = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,usd-coin&vs_currencies=usd',
            { cache: 'no-store' },
          );
          const cgData = await cgRes.json();
          if (cgData?.bitcoin?.usd && cgData?.ethereum?.usd) {
            const btcUSD = cgData.bitcoin.usd;
            const ethUSD = cgData.ethereum.usd;
            const usdcUSD = cgData['usd-coin']?.usd || 1.0;

            if (isMounted) {
              setPrices({
                btcPriceUSD: btcUSD,
                ethPriceUSD: ethUSD,
                usdcPriceUSD: usdcUSD,
                btcPrice18: BigInt(Math.floor(btcUSD * 1e18)),
                ethPrice18: BigInt(Math.floor(ethUSD * 1e18)),
                usdcPrice18: BigInt(Math.floor(usdcUSD * 1e18)),
                isLive: true,
              });
            }
          }
        } catch (e) {
          console.warn('[useLivePrices] Failed fetching live prices:', e);
        }
      }
    }

    fetchSpotPrices();
    // Poll every 5 seconds for real-time responsiveness
    const interval = setInterval(fetchSpotPrices, 5_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return prices;
}
