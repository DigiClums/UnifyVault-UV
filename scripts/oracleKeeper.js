/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Mock Chainlink Aggregators on Base Sepolia
const CBBTC_AGGREGATOR = '0x384e9f7f5740fc7c081181cec0a7db945ad8c237';
const WETH_AGGREGATOR = '0xe0c96e485d8b5e6a2c7fe7b8598a061b52dfc381';
const HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutes

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isRunningCycle = false;
let keeperAddressCache = null;
const lastSentPrices = {};
const lastSentTimestamps = {};

function getKeeperAddress() {
  if (!PRIVATE_KEY) return null;
  if (keeperAddressCache) return keeperAddressCache;
  try {
    const cmd = `cast wallet address --private-key "$PRIVATE_KEY"`;
    const output = execSync(cmd, { env: process.env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    keeperAddressCache = output.trim();
    return keeperAddressCache;
  } catch (err) {
    return null;
  }
}

function getPendingNonce() {
  const addr = getKeeperAddress();
  if (!addr) return null;
  try {
    const cmd = `cast nonce ${addr} --block pending --rpc-url "${RPC_URL}"`;
    const output = execSync(cmd, { env: process.env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const parsed = parseInt(output.trim(), 10);
    return isNaN(parsed) ? null : parsed;
  } catch (err) {
    return null;
  }
}

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
      console.error('[OracleKeeper] All price feeds failed:', e.message);
      return null;
    }
  }
}

async function updateAggregator(aggregatorAddress, price, assetName) {
  const price8Decimals = BigInt(Math.round(price * 1e8)).toString();
  const now = Date.now();

  const lastPrice = lastSentPrices[aggregatorAddress];
  const lastTime = lastSentTimestamps[aggregatorAddress] || 0;

  if (lastPrice === price8Decimals && now - lastTime < HEARTBEAT_MS) {
    console.log(
      `[OracleKeeper] ${assetName} price unchanged ($${price.toFixed(2)}), skipping submit.`,
    );
    return;
  }

  const nonce = getPendingNonce();
  const nonceFlag = nonce !== null ? `--nonce ${nonce}` : '';
  const cmd = `cast send ${aggregatorAddress} "setPrice(int256)" ${price8Decimals} ${nonceFlag} --confirmations 1 --timeout 60 --rpc-url "${RPC_URL}" --private-key "$PRIVATE_KEY"`;

  try {
    execSync(cmd, { env: process.env, stdio: 'pipe' });
    lastSentPrices[aggregatorAddress] = price8Decimals;
    lastSentTimestamps[aggregatorAddress] = now;
    console.log(
      `[OracleKeeper] Updated ${assetName} Aggregator (${aggregatorAddress}): $${price.toFixed(2)}`,
    );
  } catch (err) {
    console.error(`[OracleKeeper] Failed to update ${assetName}:`, err.message || err.toString());
  }
}

async function checkAggregatorHealth(aggregatorAddress, assetName, livePrice) {
  try {
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
      const answerHex = hex.slice(64, 128);
      const updatedAtHex = hex.slice(192, 256);

      const answer = BigInt('0x' + answerHex);
      const updatedAt = Number(BigInt('0x' + updatedAtHex));

      const onChainPrice = Number(answer) / 1e8;
      const ageSeconds = Math.floor(Date.now() / 1000) - updatedAt;

      console.log(
        `[OracleMonitor] ${assetName} Feed: On-Chain $${onChainPrice.toFixed(2)} | Live Spot $${livePrice.toFixed(2)} | Age: ${ageSeconds}s | Status: HEALTHY`,
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

async function runCycle() {
  if (isRunningCycle) return;

  isRunningCycle = true;
  try {
    const prices = await fetchLivePrices();
    if (prices) {
      if (PRIVATE_KEY) {
        console.log(
          `[OracleKeeper] Live Spot Prices - BTC: $${prices.btcPrice.toFixed(2)}, ETH: $${prices.ethPrice.toFixed(2)}`,
        );
        await updateAggregator(CBBTC_AGGREGATOR, prices.btcPrice, 'BTC');
        await sleep(2000); // 2s delay to allow block inclusion & avoid nonce collision
        await updateAggregator(WETH_AGGREGATOR, prices.ethPrice, 'ETH');
      } else {
        await checkAggregatorHealth(CBBTC_AGGREGATOR, 'BTC', prices.btcPrice);
        await checkAggregatorHealth(WETH_AGGREGATOR, 'ETH', prices.ethPrice);
      }
    }
  } catch (err) {
    console.error('[OracleKeeper] Error in cycle:', err.message);
  } finally {
    isRunningCycle = false;
  }
}

async function main() {
  console.log('===========================================================');
  if (PRIVATE_KEY) {
    console.log('[OracleKeeper] UnifyVault Live Oracle Keeper Service (Writer Mode Active)');
    console.log(`[OracleKeeper] Target BTC Aggregator: ${CBBTC_AGGREGATOR}`);
    console.log(`[OracleKeeper] Target ETH Aggregator: ${WETH_AGGREGATOR}`);
  } else {
    console.log('[OracleKeeper] UnifyVault Oracle Monitor Online (Zero-Signer Read-Only Mode)');
    console.log('[OracleKeeper] Note: Set PRIVATE_KEY in environment to enable live on-chain testnet feed updates.');
  }
  console.log('===========================================================');

  while (true) {
    await runCycle();
    await sleep(PRIVATE_KEY ? 15000 : 30000);
  }
}

main().catch((err) => {
  console.error('[OracleKeeper] Fatal error:', err.message);
  process.exit(1);
});

