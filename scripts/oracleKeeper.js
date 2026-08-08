const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org';
const ORACLE_MANAGER_ADDRESS = '0x375e023eBDc2866c6c8AF6Ac6394Ed16197d266F';

const TOKENS = {
  cbBTC: '0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29',
  WETH: '0xd116ab1c943cf15904ec4c8dd701086f175fa323',
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// getAssetPrice(address) selector = 0xb35b2e9d
function getPriceCalldata(tokenAddress) {
  const cleanAddr = tokenAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0xb35b2e9d' + cleanAddr;
}

async function callRpc(data) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: ORACLE_MANAGER_ADDRESS, data: data }, 'latest'],
    }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message);
  return BigInt(json.result);
}

async function runKeeperDaemon() {
  try {
    const btcRaw = await callRpc(getPriceCalldata(TOKENS.cbBTC));
    const ethRaw = await callRpc(getPriceCalldata(TOKENS.WETH));
    const usdcRaw = await callRpc(getPriceCalldata(TOKENS.USDC));

    const btcPrice = (Number(btcRaw) / 1e18).toFixed(2);
    const ethPrice = (Number(ethRaw) / 1e18).toFixed(2);
    const usdcPrice = (Number(usdcRaw) / 1e18).toFixed(4);

    let liveMarketStr = '';
    try {
      const liveRes = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
      const liveJson = await liveRes.json();
      const rates = liveJson?.data?.rates;
      if (rates && rates.BTC && rates.ETH) {
        const liveBtc = (1 / parseFloat(rates.BTC)).toFixed(2);
        const liveEth = (1 / parseFloat(rates.ETH)).toFixed(2);
        liveMarketStr = ` | Live Market: BTC = $${liveBtc} | ETH = $${liveEth}`;
      }
    } catch {}

    console.log(`🤖 UnifyVault Real-Time Oracle Keeper Active`);
    console.log(`🌐 Network: Base Sepolia (${RPC_URL})`);
    console.log(
      `📈 On-Chain Valuation: BTC = $${btcPrice} | ETH = $${ethPrice} | USDC = $${usdcPrice}${liveMarketStr}`,
    );
  } catch (err) {
    console.error('Oracle Keeper Error:', err.message);
  }
}

console.log('Starting UnifyVault Oracle Keeper Daemon...');
runKeeperDaemon();
setInterval(runKeeperDaemon, 15000);
