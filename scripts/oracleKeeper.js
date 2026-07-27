/* eslint-disable */
const { execSync } = require('child_process');

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY =
  process.env.PRIVATE_KEY || '852e2a34d79e4c77945339d11d3926743c7c73b3fe6d89654fa43cd8ad755ba0';

// Mock Chainlink Aggregators on Base Sepolia
const CBBTC_AGGREGATOR = '0x384e9f7f5740fc7c081181cec0a7db945ad8c237';
const WETH_AGGREGATOR = '0xe0c96e485d8b5e6a2c7fe7b8598a061b52dfc381';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchLivePrices() {
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
    const data = await res.json();
    const rates = data?.data?.rates;

    if (!rates) throw new Error('Invalid response from Coinbase API');

    const btcPrice = 1 / parseFloat(rates.BTC);
    const ethPrice = 1 / parseFloat(rates.ETH);

    return { btcPrice, ethPrice };
  } catch (err) {
    console.warn('[OracleKeeper] Coinbase API failed, trying CoinGecko fallback:', err.message);
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
      );
      const data = await res.json();
      return { btcPrice: data.bitcoin.usd, ethPrice: data.ethereum.usd };
    } catch (e) {
      console.error('[OracleKeeper] All price feeds failed:', e.message);
      return null;
    }
  }
}

async function updateAggregator(aggregatorAddress, price, assetName) {
  const price8Decimals = Math.round(price * 1e8);
  const dataHex = `0x3a00508600000000000000000000000000000000000000000000000000000000${price8Decimals.toString(16).padStart(64, '0')}`;

  const cmd = `cast send ${aggregatorAddress} "${dataHex}" --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY}`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(
      `[OracleKeeper] Updated ${assetName} Aggregator (${aggregatorAddress}): $${price.toFixed(2)} (${price8Decimals})`,
    );
  } catch (err) {
    console.error(`[OracleKeeper] Failed to update ${assetName}:`, err.message);
  }
}

async function main() {
  console.log('[OracleKeeper] Starting UnifyVault Live Oracle Keeper Service...');
  console.log(`[OracleKeeper] Target BTC Aggregator: ${CBBTC_AGGREGATOR}`);
  console.log(`[OracleKeeper] Target ETH Aggregator: ${WETH_AGGREGATOR}`);

  while (true) {
    const prices = await fetchLivePrices();
    if (prices) {
      console.log(
        `[OracleKeeper] Live Prices - BTC: $${prices.btcPrice.toFixed(2)}, ETH: $${prices.ethPrice.toFixed(2)}`,
      );
      await updateAggregator(CBBTC_AGGREGATOR, prices.btcPrice, 'BTC');
      await updateAggregator(WETH_AGGREGATOR, prices.ethPrice, 'ETH');
    }
    await sleep(15000);
  }
}

main().catch((err) => {
  console.error('[OracleKeeper] Fatal error:', err);
  process.exit(1);
});
