/* eslint-disable */
const { execSync } = require('child_process');
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

const ENVIRONMENT = process.env.NODE_ENV || 'development';
const ACTIVE_CHAIN = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'base-sepolia';

// STAGE 2: Auto-disable keeper service if deployed on Base Mainnet
if (
  ACTIVE_CHAIN === 'base-mainnet' ||
  ACTIVE_CHAIN === '8453' ||
  ENVIRONMENT === 'production_mainnet'
) {
  console.log(
    '[OracleKeeper] Production Base Mainnet active: Chainlink mainnet feeds are decentralized on-chain.',
  );
  console.log('[OracleKeeper] Testnet keeper daemon auto-disabling.');
  process.exit(0);
}

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('[OracleKeeper] FATAL ERROR: PRIVATE_KEY environment variable is not defined.');
  console.error(
    '[OracleKeeper] Service aborting. Please set PRIVATE_KEY in environment variables.',
  );
  process.exit(1);
}

// Mock Chainlink Aggregators on Base Sepolia (Testnet Simulation Only)
const CBBTC_AGGREGATOR = '0x384e9f7f5740fc7c081181cec0a7db945ad8c237';
const WETH_AGGREGATOR = '0xe0c96e485d8b5e6a2c7fe7b8598a061b52dfc381';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lastSentPrices = {};
const lastSentTimestamps = {};
const HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutes heartbeat force update

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
    console.warn('[OracleKeeper] Coinbase API failed, trying CoinGecko fallback:', err.message);
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
      console.error('[OracleKeeper] All price feeds failed:', e.message);
      return null;
    }
  }
}

function sanitizeLog(text) {
  if (!text || typeof text !== 'string') return text;
  return PRIVATE_KEY ? text.replaceAll(PRIVATE_KEY, '[REDACTED]') : text;
}

async function updateAggregator(aggregatorAddress, price, assetName) {
  const price8Decimals = BigInt(Math.round(price * 1e8)).toString();
  const now = Date.now();

  const lastPrice = lastSentPrices[aggregatorAddress];
  const lastTime = lastSentTimestamps[aggregatorAddress] || 0;

  // Deduplicate identical price updates unless heartbeat expired (5 minutes)
  if (lastPrice === price8Decimals && now - lastTime < HEARTBEAT_MS) {
    console.log(
      `[OracleKeeper] ${assetName} price unchanged ($${price.toFixed(2)} / ${price8Decimals}), skipping on-chain submit (heartbeat active).`,
    );
    return;
  }

  // Pass $PRIVATE_KEY via shell environment variable expansion so private key isn't in command string
  const cmd = `cast send ${aggregatorAddress} "setPrice(int256)" ${price8Decimals} --rpc-url "${RPC_URL}" --private-key "$PRIVATE_KEY"`;

  try {
    execSync(cmd, { env: process.env, stdio: 'pipe' });
    lastSentPrices[aggregatorAddress] = price8Decimals;
    lastSentTimestamps[aggregatorAddress] = now;
    console.log(
      `[OracleKeeper] Updated ${assetName} Aggregator (${aggregatorAddress}): $${price.toFixed(2)} (${price8Decimals})`,
    );
  } catch (err) {
    const rawMsg = err.message || err.toString();
    console.error(`[OracleKeeper] Failed to update ${assetName}:`, sanitizeLog(rawMsg));
  }
}

async function main() {
  console.log('[OracleKeeper] Starting UnifyVault Live Oracle Keeper Service (Testnet Mode)...');
  console.log(`[OracleKeeper] Target BTC Aggregator: ${CBBTC_AGGREGATOR}`);
  console.log(`[OracleKeeper] Target ETH Aggregator: ${WETH_AGGREGATOR}`);

  while (true) {
    const prices = await fetchLivePrices();
    if (prices) {
      console.log(
        `[OracleKeeper] Live Prices - BTC: $${prices.btcPrice.toFixed(2)}, ETH: $${prices.ethPrice.toFixed(2)}`,
      );
      await updateAggregator(CBBTC_AGGREGATOR, prices.btcPrice, 'BTC');
      await sleep(2500);
      await updateAggregator(WETH_AGGREGATOR, prices.ethPrice, 'ETH');
    }
    await sleep(15000);
  }
}

main().catch((err) => {
  const rawMsg = err.stack || err.message || String(err);
  console.error('[OracleKeeper] Fatal error:', sanitizeLog(rawMsg));
  process.exit(1);
});
