/**
 * UnifyVault V2 — Indexer Daemon (Zero-Dependency)
 * On-chain event monitoring process listening for Deposit, Redeem, Fee, and Pause events.
 */

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const PROTOCOL_DIRECTORY_ADDRESS = '0x61572e7207057A0394Ec087995cA337556b95D5c';

const MODULE_IDS = {
  DEPOSIT_MANAGER: '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af',
  TOKEN: '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8',
  VAULT: '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640',
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

async function runIndexerDaemon() {
  console.log('📡 Starting UnifyVault V2 Indexer Daemon...');
  console.log(`🌐 Connected to Network: Base Sepolia (${RPC_URL})`);
  console.log(`📜 ProtocolDirectory: ${PROTOCOL_DIRECTORY_ADDRESS}`);

  try {
    // 1. Get latest block number
    const blockHex = await rpcCall('eth_blockNumber');
    const latestBlock = parseInt(blockHex, 16);
    const startBlock = Math.max(0, latestBlock - 1000);

    console.log(`📦 Scanning Block Range: #${startBlock} -> #${latestBlock}`);

    // 2. Resolve Controller and Vault addresses
    const dirCallData = '0x21f8a721' + MODULE_IDS.DEPOSIT_MANAGER.slice(2);
    const rawController = await rpcCall('eth_call', [
      { to: PROTOCOL_DIRECTORY_ADDRESS, data: dirCallData },
      'latest',
    ]);
    const controllerAddress = '0x' + rawController.slice(-40);

    console.log(`🎮 Resolved Controller Address: ${controllerAddress}`);

    // 3. Query logs for Controller events
    const logs = await rpcCall('eth_getLogs', [
      {
        fromBlock: '0x' + startBlock.toString(16),
        toBlock: '0x' + latestBlock.toString(16),
        address: controllerAddress,
      },
    ]);

    console.log(`🔍 Logs Found: ${logs.length} on-chain event logs.`);

    if (logs.length > 0) {
      logs.forEach((log, idx) => {
        console.log(
          `  [Event #${idx + 1}] TxHash: ${log.transactionHash} | Block: ${parseInt(log.blockNumber, 16)}`,
        );
      });
    } else {
      console.log('✅ No recent emergency pause or error events detected in log range.');
    }
  } catch (error) {
    console.error('❌ Indexer Daemon Error:', error.message || error);
  }
}

// Run immediately, then repeat every 30 seconds
runIndexerDaemon();
setInterval(runIndexerDaemon, 30_000);
