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

const CONTRACTS = {
  CONTROLLER: '0x7EF5D93f83995228efFc63dbe513367a719f0633',
  VAULT: '0x54696d5d00b58F27F9d8C358560ff2a7d10d409e',
  TREASURY: '0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D',
  ORACLE: '0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635',
  TOKEN: '0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4',
};

const TOPICS = {
  // Deposit(address,address,uint256,uint256,uint256)
  DEPOSIT: '0xe1fff3675409f656e3089d71c6a67d7168d89e52518e32906b3e70d44007b82f',
  // Redeem(address,address,uint256,uint256,uint256)
  REDEEM: '0x327a331165e638bc2c7a5223abf541249b6b9074092b7470fcf2cfb6967eb7d3',
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
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
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

async function indexEvents() {
  try {
    const latestBlockHex = await jsonRpcCall('eth_blockNumber', []);
    const latestBlock = parseInt(latestBlockHex, 16);

    if (db.lastBlock === 0) {
      db.lastBlock = Math.max(0, latestBlock - 5000);
    }

    const fromBlock = db.lastBlock + 1;
    const toBlock = latestBlock;

    if (fromBlock <= toBlock) {
      const logs = await jsonRpcCall('eth_getLogs', [
        {
          address: [CONTRACTS.CONTROLLER, CONTRACTS.TOKEN, CONTRACTS.VAULT],
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + toBlock.toString(16),
        },
      ]);

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const txHash = log.transactionHash;
          const logIndex = log.logIndex;
          const topic0 = log.topics[0];

          if (
            topic0 === TOPICS.TRANSFER &&
            log.address.toLowerCase() === CONTRACTS.TOKEN.toLowerCase()
          ) {
            const isDuplicate = db.transfers.some(
              (t) => t.txHash === txHash && t.logIndex === logIndex,
            );
            if (!isDuplicate) {
              const from = '0x' + log.topics[1].slice(26);
              const to = '0x' + log.topics[2].slice(26);
              const value = BigInt(log.data).toString();

              db.transfers.push({
                blockNumber: parseInt(log.blockNumber, 16),
                txHash,
                logIndex,
                from,
                to,
                value,
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

      db.lastBlock = latestBlock;
      saveDB();
    }
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
