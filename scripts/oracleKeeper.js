/**
 * UnifyVault V2 — Oracle Keeper Daemon (Zero-Dependency)
 * Periodically polls and validates live Chainlink oracle prices on Base Sepolia.
 */

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const PROTOCOL_DIRECTORY_ADDRESS = '0x61572e7207057A0394Ec087995cA337556b95D5c';

const MODULE_IDS = {
  ORACLE: '0x2e30c16253629c211949dfd3fde5e2a3de47827f45371d8ef81f41a881d12a04',
};

const ASSETS = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  cbBTC: '0xD3eBa4947b8e2e33CE1B428F617aE90De70f5bD9',
  WETH: '0x5ab31FD7c54E2E915A84E13Fa1310E2C96F7F5Ae',
};

async function rpcCall(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC Call Failed');
  }
  return data.result;
}

// Function selector: getAddress(bytes32) -> 0x21f8a721
// Function selector: getAssetPrice(address) -> 0xb3596f07
// Function selector: isPriceFresh(address) -> 0x0af1a39f

async function runKeeperDaemon() {
  console.log('🤖 Starting UnifyVault V2 Oracle Keeper Daemon...');
  console.log(`🌐 Connected to Network: Base Sepolia (${RPC_URL})`);
  console.log(`📜 ProtocolDirectory: ${PROTOCOL_DIRECTORY_ADDRESS}`);

  try {
    // 1. Get OracleManager address from ProtocolDirectory
    const dirCallData = '0x21f8a721' + MODULE_IDS.ORACLE.slice(2);
    const rawOracleAddr = await rpcCall('eth_call', [
      { to: PROTOCOL_DIRECTORY_ADDRESS, data: dirCallData },
      'latest',
    ]);

    const oracleManagerAddress = '0x' + rawOracleAddr.slice(-40);
    console.log(`🔮 Resolved OracleManager Address: ${oracleManagerAddress}`);

    for (const [symbol, tokenAddress] of Object.entries(ASSETS)) {
      const paddedToken = tokenAddress.slice(2).padStart(64, '0');

      // getAssetPrice(address)
      const priceCallData = '0xb3596f07' + paddedToken;
      const priceHex = await rpcCall('eth_call', [
        { to: oracleManagerAddress, data: priceCallData },
        'latest',
      ]);
      const priceRaw = BigInt(priceHex);
      const priceUSD = (Number(priceRaw) / 1e18).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });

      // isPriceFresh(address)
      const freshCallData = '0x0af1a39f' + paddedToken;
      const freshHex = await rpcCall('eth_call', [
        { to: oracleManagerAddress, data: freshCallData },
        'latest',
      ]);
      const isFresh = BigInt(freshHex) === 1n;

      console.log(`✅ [${symbol}] Price: ${priceUSD} | Fresh: ${isFresh ? 'YES 🟢' : 'STALE 🔴'}`);
    }
  } catch (error) {
    console.error('❌ Oracle Keeper Daemon Error:', error.message || error);
  }
}

// Run immediately, then repeat every 30 seconds
runKeeperDaemon();
setInterval(runKeeperDaemon, 30_000);
