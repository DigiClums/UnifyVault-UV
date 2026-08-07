const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org';
const ORACLE_MANAGER_ADDRESS = '0x375e023eBDc2866c6c8AF6Ac6394Ed16197d266F';

const TOKENS = {
  cbBTC: '0xc83D0A904E1103d8144E9DF93cdb5bC05f7cdee6',
  WETH: '0xEEAa69Db6046f026d88004d0D6946518071bA15c',
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// getAssetPrice(address) selector = 0xb35b2e9d
function getPriceCalldata(tokenAddress) {
  const cleanAddr = tokenAddress.toLowerCase().replace('0x', '').padStart(64, '0');
  return '0xb3596f07' + cleanAddr;
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

    console.log(`🤖 Starting UnifyVault Real-Time Oracle Keeper...`);
    console.log(`🌐 Connected to Base Sepolia (${RPC_URL})`);
    console.log(`📈 Real-Time Spot Prices: BTC = $${btcPrice} | ETH = $${ethPrice} | USDC = $${usdcPrice}`);
  } catch (err) {
    console.error('Oracle Keeper Error:', err.message);
  }
}

console.log('Starting UnifyVault Oracle Keeper Daemon...');
runKeeperDaemon();
setInterval(runKeeperDaemon, 15000);
