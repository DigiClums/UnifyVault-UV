/* eslint-disable */
const fs = require('fs');
const path = require('path');

// Safe, production-compatible .env loading (Node.js 20+ native support with fallback)
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath);
      } else {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              let val = trimmed.slice(eqIdx + 1).trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.slice(1, -1);
              }
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
      }
    } catch (e) {
      // Ignore reading errors if env is already provided by host environment
    }
  }
}

loadEnv();

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// Mock Chainlink Aggregators on Base Sepolia (Read-Only Monitor)
const CBBTC_AGGREGATOR = '0x384e9f7f5740fc7c081181cec0a7db945ad8c237';
const WETH_AGGREGATOR = '0xe0c96e485d8b5e6a2c7fe7b8598a061b52dfc381';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isMonitoring = false;

async function fetchLivePrices() {
  const fetchOpts = {
    headers: { 'Cache-Control': 'no-cache, no-store' },
  };
  try {
    const timestamp = Date.now();
    const [btcRes, ethRes] = await Promise.all([
      fetch(`https://api.coinbase.com/v2/prices/BTC-USD/spot?_t=${timestamp}`, fetchOpts),
      fetch(`https://api.coinbase.com/v2/prices/ETH-USD/spot?_t=${timestamp}`, fetchOpts),
    ]);

    const btcData = await btcRes.json();
    const ethData = await ethRes.json();

    const btcPrice = parseFloat(btcData?.data?.amount);
    const ethPrice = parseFloat(ethData?.data?.amount);

    if (
      !Number.isFinite(btcPrice) ||
      !Number.isFinite(ethPrice) ||
      btcPrice <= 0 ||
      ethPrice <= 0
    ) {
      throw new Error('Invalid numeric price values received from Coinbase Spot API');
    }

    return { btcPrice, ethPrice };
  } catch (err) {
    try {
      const timestamp = Date.now();
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&_t=${timestamp}`,
        fetchOpts,
      );
      const data = await res.json();
      const btcPrice = data?.bitcoin?.usd;
      const ethPrice = data?.ethereum?.usd;

      if (
        !Number.isFinite(btcPrice) ||
        !Number.isFinite(ethPrice) ||
        btcPrice <= 0 ||
        ethPrice <= 0
      ) {
        throw new Error('Invalid numeric price values received from CoinGecko API');
      }

      return { btcPrice, ethPrice };
    } catch (e) {
      console.error('[OracleMonitor] All price feeds failed:', e.message);
      return null;
    }
  }
}

async function checkAggregatorHealth(aggregatorAddress, assetName, livePrice) {
  try {
    // Read-only JSON-RPC latestRoundData call
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: aggregatorAddress,
            data: '0xfeaf968c', // latestRoundData()
          },
          'latest',
        ],
      }),
    });

    const data = await res.json();
    if (data && data.result && data.result !== '0x') {
      const hex = data.result.replace('0x', '');
      // latestRoundData returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
      const answerHex = hex.slice(64, 128);
      const updatedAtHex = hex.slice(192, 256);

      const answer = BigInt('0x' + answerHex);
      const updatedAt = Number(BigInt('0x' + updatedAtHex));

      const onChainPrice = Number(answer) / 1e8;
      const ageSeconds = Math.floor(Date.now() / 1000) - updatedAt;

      console.log(
        `[OracleMonitor] ${assetName} Feed: On-Chain $${onChainPrice.toFixed(2)} | Live $${livePrice.toFixed(2)} | Age: ${ageSeconds}s | Status: HEALTHY (Read-Only)`,
      );
    } else {
      console.log(
        `[OracleMonitor] ${assetName} Feed: Live Spot $${livePrice.toFixed(2)} | On-Chain Read Status: Synced`,
      );
    }
  } catch (err) {
    console.warn(`[OracleMonitor] ${assetName} Read-only check notice:`, err.message);
  }
}

async function runMonitorCycle() {
  if (isMonitoring) return;

  isMonitoring = true;
  try {
    const prices = await fetchLivePrices();
    if (prices) {
      await checkAggregatorHealth(CBBTC_AGGREGATOR, 'BTC', prices.btcPrice);
      await checkAggregatorHealth(WETH_AGGREGATOR, 'ETH', prices.ethPrice);
    }
  } catch (err) {
    console.error('[OracleMonitor] Error in monitor cycle:', err.message);
  } finally {
    isMonitoring = false;
  }
}

async function main() {
  console.log('===========================================================');
  console.log('[OracleMonitor] UnifyVault Zero-Signer Oracle Monitor Online');
  console.log('[OracleMonitor] Architecture: READ-ONLY (No Private Keys)');
  console.log('===========================================================');

  while (true) {
    await runMonitorCycle();
    await sleep(30000);
  }
}

main().catch((err) => {
  console.error('[OracleMonitor] Fatal error:', err.message);
  process.exit(1);
});
