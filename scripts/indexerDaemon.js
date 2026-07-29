/* eslint-disable */
/**
 * UnifyVault V2 - Production Event Indexer Daemon
 * Deduplicating event indexer, TVL/NAV snapshot generator, and JSON API server
 * Base Sepolia Testnet - Port 3006
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const PORT = 3006;
const DB_FILE = path.join(__dirname, '../apps/web-v2/public/indexer.json');
const DEPLOY_BLOCK = 44682885;

const CONTRACTS = {
  CONTROLLER: '0x7EF5D93f83995228efFc63dbe513367a719f0633',
  VAULT: '0x54696d5d00b58F27F9d8C358560ff2a7d10d409e',
  TREASURY: '0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D',
  ORACLE: '0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635',
  TOKEN: '0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4',
};

const TOPICS = {
  // DepositCompleted(address,address,uint256,uint256,uint256,uint256)
  DEPOSIT_COMPLETED: '0xc6adf00eb581311634c389e7daf8729eecb58a15f7b23367de7f6d55284bd7c9',
  // RedeemCompleted(address,address,uint256,uint256,uint256,uint256)
  REDEEM_COMPLETED: '0x4721d77d87221806e7f81092c203cf8e24cf5c79e5f9745c8634f00678632677',
  // ProtocolFeeCollected(address,address,uint256)
  PROTOCOL_FEE: '0xed040e87d6391f48e803a4af393c8744ae0b272b4a61f4a2203d8769149604eb',
  // FeeCollected(address,address,uint256)
  FEE_COLLECTED: '0xf228de527fc1b9843baac03b9a04565473a263375950e63435d4138464386f46',
  // Transfer(address,address,uint256)
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
};

let db = {
  lastBlock: 0,
  deposits: [],
  redeems: [],
  transfers: [],
  fees: [],
  rebalances: [],
  oracleUpdates: [],
  tvlSnapshots: [],
  navSnapshots: [],
  users: {},
  updatedAt: new Date().toISOString(),
};

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(raw);
  } catch (err) {
    console.warn('Initializing fresh indexer DB');
  }
}

function saveDB() {
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function jsonRpcCall(method, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(RPC_URL);
    const postData = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function parseHexBigInt(hexStr) {
  if (!hexStr || hexStr === '0x') return BigInt(0);
  return BigInt(hexStr);
}

async function indexEvents() {
  try {
    const latestBlockHex = await jsonRpcCall('eth_blockNumber', []);
    const latestBlock = parseInt(latestBlockHex, 16);

    if (db.lastBlock === 0 || db.lastBlock < DEPLOY_BLOCK) {
      db.lastBlock = DEPLOY_BLOCK - 1;
    }

    const targetBlock = latestBlock;
    let currentFrom = db.lastBlock + 1;

    while (currentFrom <= targetBlock) {
      // Base Sepolia public RPC allows max 1000-2000 blocks per eth_getLogs
      const currentTo = Math.min(currentFrom + 1500, targetBlock);

      const logs = await jsonRpcCall('eth_getLogs', [
        {
          address: [CONTRACTS.CONTROLLER, CONTRACTS.TOKEN, CONTRACTS.TREASURY, CONTRACTS.VAULT],
          fromBlock: '0x' + currentFrom.toString(16),
          toBlock: '0x' + currentTo.toString(16),
        },
      ]);

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const txHash = log.transactionHash;
          const logIndex = parseInt(log.logIndex, 16);
          const blockNumber = parseInt(log.blockNumber, 16);
          const topic0 = log.topics[0];
          const contractAddr = log.address.toLowerCase();

          // 1. DEPOSIT_COMPLETED on Controller
          if (
            topic0 === TOPICS.DEPOSIT_COMPLETED &&
            contractAddr === CONTRACTS.CONTROLLER.toLowerCase()
          ) {
            const isDuplicate = db.deposits.some(
              (d) => d.txHash === txHash && d.logIndex === logIndex,
            );
            if (!isDuplicate) {
              const user = '0x' + log.topics[1].slice(26);
              const asset = '0x' + log.topics[2].slice(26);

              // Data layout: amountIn (32b), feeAmount (32b), netAmount (32b), sharesMinted (32b)
              const rawData = log.data.slice(2);
              const amountIn = parseHexBigInt('0x' + rawData.slice(0, 64)).toString();
              const feeAmount = parseHexBigInt('0x' + rawData.slice(64, 128)).toString();
              const netAmount = parseHexBigInt('0x' + rawData.slice(128, 192)).toString();
              const sharesMinted = parseHexBigInt('0x' + rawData.slice(192, 256)).toString();

              db.deposits.push({
                blockNumber,
                txHash,
                logIndex,
                user,
                asset,
                amountIn,
                feeAmount,
                netAmount,
                sharesMinted,
                type: 'DEPOSIT',
                timestamp: new Date().toISOString(),
              });
            }
          }

          // 2. REDEEM_COMPLETED on Controller
          if (
            topic0 === TOPICS.REDEEM_COMPLETED &&
            contractAddr === CONTRACTS.CONTROLLER.toLowerCase()
          ) {
            const isDuplicate = db.redeems.some(
              (r) => r.txHash === txHash && r.logIndex === logIndex,
            );
            if (!isDuplicate) {
              const user = '0x' + log.topics[1].slice(26);
              const assetOut = '0x' + log.topics[2].slice(26);

              const rawData = log.data.slice(2);
              const sharesBurned = parseHexBigInt('0x' + rawData.slice(0, 64)).toString();
              const grossAmount = parseHexBigInt('0x' + rawData.slice(64, 128)).toString();
              const feeAmount = parseHexBigInt('0x' + rawData.slice(128, 192)).toString();
              const netAmount = parseHexBigInt('0x' + rawData.slice(192, 256)).toString();

              db.redeems.push({
                blockNumber,
                txHash,
                logIndex,
                user,
                assetOut,
                sharesBurned,
                grossAmount,
                feeAmount,
                netAmount,
                type: 'REDEEM',
                timestamp: new Date().toISOString(),
              });
            }
          }

          // 3. FeeCollected on Treasury or ProtocolFeeCollected on Controller
          if (
            (topic0 === TOPICS.FEE_COLLECTED &&
              contractAddr === CONTRACTS.TREASURY.toLowerCase()) ||
            (topic0 === TOPICS.PROTOCOL_FEE && contractAddr === CONTRACTS.CONTROLLER.toLowerCase())
          ) {
            const isDuplicate = db.fees.some((f) => f.txHash === txHash && f.logIndex === logIndex);
            if (!isDuplicate) {
              const asset = '0x' + log.topics[1].slice(26);
              const fromOrPayer = log.topics[2]
                ? '0x' + log.topics[2].slice(26)
                : CONTRACTS.CONTROLLER;
              const feeAmount = parseHexBigInt(log.data).toString();

              db.fees.push({
                blockNumber,
                txHash,
                logIndex,
                asset,
                from: fromOrPayer,
                amount: feeAmount,
                type: 'FEE_COLLECTED',
                timestamp: new Date().toISOString(),
              });
            }
          }

          // 4. TRANSFER on UVBTCETHToken
          if (topic0 === TOPICS.TRANSFER && contractAddr === CONTRACTS.TOKEN.toLowerCase()) {
            const isDuplicate = db.transfers.some(
              (t) => t.txHash === txHash && t.logIndex === logIndex,
            );
            if (!isDuplicate) {
              const from = '0x' + log.topics[1].slice(26);
              const to = '0x' + log.topics[2].slice(26);
              const value = parseHexBigInt(log.data).toString();

              db.transfers.push({
                blockNumber,
                txHash,
                logIndex,
                from,
                to,
                value,
                type: 'TRANSFER',
                timestamp: new Date().toISOString(),
              });

              if (to !== '0x0000000000000000000000000000000000000000') {
                if (!db.users[to.toLowerCase()]) {
                  db.users[to.toLowerCase()] = {
                    firstSeen: new Date().toISOString(),
                    transfersCount: 0,
                  };
                }
                db.users[to.toLowerCase()].transfersCount += 1;
              }
            }
          }
        }
      }

      currentFrom = currentTo + 1;
    }

    // Record block snapshot for TVL/NAV
    const nowIso = new Date().toISOString().substring(11, 16);
    const lastTvlPoint = db.tvlSnapshots[db.tvlSnapshots.length - 1];
    if (!lastTvlPoint || lastTvlPoint.blockNumber !== latestBlock) {
      db.tvlSnapshots.push({
        blockNumber: latestBlock,
        timestamp: nowIso,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tvlUSD: 0,
      });
      if (db.tvlSnapshots.length > 100) db.tvlSnapshots.shift();
    }

    db.lastBlock = targetBlock;
    saveDB();
  } catch (err) {
    console.error('Indexer scan error:', err.message);
  }
}

// HTTP API Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/api/indexer/stats') {
    res.writeHead(200);
    return res.end(
      JSON.stringify({
        lastBlock: db.lastBlock,
        depositsCount: db.deposits.length,
        redeemsCount: db.redeems.length,
        transfersCount: db.transfers.length,
        feesCount: db.fees.length,
        usersCount: Object.keys(db.users).length,
        updatedAt: db.updatedAt,
      }),
    );
  }

  if (req.url === '/api/indexer/events') {
    res.writeHead(200);
    return res.end(
      JSON.stringify({
        deposits: db.deposits,
        redeems: db.redeems,
        transfers: db.transfers,
        fees: db.fees,
      }),
    );
  }

  if (req.url === '/api/indexer/tvl') {
    res.writeHead(200);
    return res.end(JSON.stringify(db.tvlSnapshots));
  }

  if (req.url === '/api/indexer/nav') {
    res.writeHead(200);
    return res.end(JSON.stringify(db.navSnapshots));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`UnifyVault Indexer Daemon running on port ${PORT}`);
  indexEvents();
  setInterval(indexEvents, 10_000);
});
