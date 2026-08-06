/**
 * UnifyVault V2 — Real-Time Live Oracle Keeper Daemon
 * Fetches real-time market spot prices from Coinbase/CoinGecko APIs
 * and submits on-chain setPrice() transactions to Base Sepolia MockChainlinkAggregators.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY =
  process.env.KEEPER_PRIVATE_KEY ||
  '0xcda08c38c9fae447665aef7828d82e1862577dcffd1dbd6c07b332e576e9c8f8';

const AGGREGATORS = {
  cbBTC: { address: '0xd0efdebe1a6c77552ea17495cdeb4d57153a2f4d', decimals: 8 },
  WETH: { address: '0xb502c86bf6ebb3b4c7c441971788088f21e29be9', decimals: 8 },
  USDC: { address: '0x5426c9b6f7867af4d3447bde7652e20aa73dcc6d', decimals: 6 },
};

async function fetchLiveMarketPrices() {
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const json = await res.json();
    const rates = json?.data?.rates;
    if (rates && rates.BTC && rates.ETH) {
      const btcUSD = 1 / parseFloat(rates.BTC);
      const ethUSD = 1 / parseFloat(rates.ETH);
      const usdcUSD = rates.USDC ? 1 / parseFloat(rates.USDC) : 1.0;
      return { cbBTC: btcUSD, WETH: ethUSD, USDC: usdcUSD };
    }
  } catch {
    // Fallback to CoinGecko
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,usd-coin&vs_currencies=usd',
      );
      const cgData = await cgRes.json();
      if (cgData?.bitcoin?.usd && cgData?.ethereum?.usd) {
        return {
          cbBTC: cgData.bitcoin.usd,
          WETH: cgData.ethereum.usd,
          USDC: cgData['usd-coin']?.usd || 1.0,
        };
      }
    } catch (e) {
      console.warn('⚠️ Market price APIs failed:', e);
    }
  }
  return null;
}

async function runKeeperDaemon() {
  console.log('🤖 Starting UnifyVault Real-Time Oracle Keeper...');
  console.log(`🌐 Connected to Base Sepolia (${RPC_URL})`);

  const livePrices = await fetchLiveMarketPrices();
  if (!livePrices) {
    console.log('⚠️ Could not fetch live spot prices. Skipping update round.');
    return;
  }

  console.log(
    `📈 Real-Time Spot Prices: BTC = $${livePrices.cbBTC.toFixed(2)} | ETH = $${livePrices.WETH.toFixed(2)} | USDC = $${livePrices.USDC.toFixed(4)}`,
  );

  for (const [symbol, config] of Object.entries(AGGREGATORS)) {
    const targetPrice = livePrices[symbol];
    if (!targetPrice) continue;

    const priceScaled = Math.round(targetPrice * 10 ** config.decimals);

    try {
      const cmd = `cast send ${config.address} "setPrice(int256)" ${priceScaled} --private-key ${PRIVATE_KEY} --rpc-url ${RPC_URL}`;
      execSync(cmd, { stdio: 'pipe' });
      console.log(`✅ Updated On-Chain ${symbol} Oracle Feed -> $${targetPrice.toFixed(2)}`);
    } catch (err) {
      console.error(`❌ Failed to update ${symbol} feed:`, err);
    }
    // Sleep 3 seconds between transactions to avoid nonce collisions
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
}

runKeeperDaemon();
setInterval(runKeeperDaemon, 30_000);
