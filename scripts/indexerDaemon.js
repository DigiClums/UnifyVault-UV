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

const RPC_URL =
  process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PORT = process.env.INDEXER_PORT || 3006;
const DB_FILE = path.join(__dirname, '../apps/web-v2/public/indexer.json');
const NAV_DB_FILE = path.join(__dirname, '../apps/web-v2/public/historical-nav.json');
const DEPLOY_BLOCK = 44682885;

const MAX_BLOCKS_PER_CYCLE = parseInt(process.env.MAX_BLOCKS_PER_CYCLE || '100', 10);
const INITIAL_CHUNK_SIZE = 10;
const MAX_RETRIES = 5;

const CONTRACTS = {
  CONTROLLER: '0x7EF5D93f83995228efFc63dbe513367a719f0633',
  VAULT: '0x54696d5d00b58F27F9d8C358560ff2a7d10d409e',
  TREASURY: '0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D',
  ORACLE: '0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635',
  TOKEN: '0xce9e6Cb560aC3EdB9a8164d68205c895265c5ce4',
  CBBTC_AGGREGATOR: '0x384e9f7f5740fc7c081181cec0a7db945ad8c237',
  WETH_AGGREGATOR: '0xe0c96e485d8b5e6a2c7fe7b8598a061b52dfc381',
};

const ASSETS = {
  WBTC: '0xc83D0A904E1103d8144E9DF93cdb5bC05f7cdee6',
  WETH: '0xEEAa69Db6046f026d88004d0D6946518071bA15c',
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const TOPICS = {
  // DepositCompleted(address,address,uint256,uint256,uint256,uint256)
  DEPOSIT_COMPLETED: '0xc6adf00eb581311634c389e7daf8729eecb58a15f7b23367de7f6d55284bd7c9',
  // RedeemCompleted(address,address,uint256,uint256,uint256,uint256)
  REDEEM_COMPLETED: '0x4721d77d87221806e7f81092c203cf8e24cf5c79e5f9745c8634f00678632677',
  // FeeCollected(address,address,uint256)
  FEE_COLLECTED: '0xf228de527fc1b9843baac03b9a04565473a263375950e63435d4138464386f46',
  // ProtocolFeeCollected(address,address,uint256)
  PROTOCOL_FEE: '0xed040e87d6391f48e803a4af393c8744ae0b272b4a61f4a2203d8769149604eb',
  // Transfer(address,address,uint256)
  TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  // Oracle updates
  ANSWER_UPDATED: '0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f',
  ORACLE_PRICE_SYNC: '0xfbd792e793ca131d15ffb46625d281bcae58515dd418f6ffb96ed904820b9399',
  PRICE_SET: '0x2f0fe01aa6daff1c7bb411a324bdebe55dc2cd1e0ff2fc504b7569346e7d7d5a',
  // Rebalance events
  SWAP_EXECUTED: '0xee4825a7988c5519a874be79f2a84d13d02cfe5f74cad97cda2d5b55d2b13bfa',
  STRATEGY_UPDATED: '0xc8fa02b3a0ac174795ee7b1804c80f0d1f54406bd67a8909741982e4e598eb57',
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

let runtimeState = {
  latestChainBlock: 0,
  lastIndexedBlock: 0,
  blocksBehind: 0,
  rpcErrors: 0,
  retries429: 0,
  lastSuccessfulScan: null,
  lastScanDurationMs: 0,
  lastRpcCallsCount: 0,
  currentChunkSize: INITIAL_CHUNK_SIZE,
  status: 'OFFLINE',
  startTime: Date.now(),
};

let consecutiveSuccessChunks = 0;

let navCycleCache = {
  timestamp: 0,
  data: null,
};

// Load existing DB files on startup (Recovery after restart)
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      Object.assign(db, loaded);
    } catch (err) {
      console.warn('Initializing fresh indexer DB');
    }
  }

  if (fs.existsSync(NAV_DB_FILE)) {
    try {
      const rawNav = fs.readFileSync(NAV_DB_FILE, 'utf8');
      const navArray = JSON.parse(rawNav);
      if (Array.isArray(navArray) && navArray.length > 0) {
        db.navSnapshots = navArray;
      }
    } catch (err) {
      console.warn('Initializing fresh historical NAV DB');
    }
  }
}

loadDB();

function saveDB() {
  db.updatedAt = new Date().toISOString();
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db.navSnapshots = deduplicateAndSortSnapshots(db.navSnapshots);

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  fs.writeFileSync(NAV_DB_FILE, JSON.stringify(db.navSnapshots, null, 2));
}

function deduplicateAndSortSnapshots(snapshots) {
  if (!Array.isArray(snapshots)) return [];
  const seen = new Set();
  const result = [];

  for (const s of snapshots) {
    const key = `${s.blockNumber}-${s.timestamp}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }

  return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Semaphore for concurrency limiting
class Semaphore {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.current++;
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }
}

const MAX_CONCURRENT_RPC = parseInt(process.env.MAX_CONCURRENT_RPC || '2', 10);
const rpcSemaphore = new Semaphore(MAX_CONCURRENT_RPC);

function isRetryableError(err) {
  if (!err) return false;
  if (err.isRetryable || err.is429) return true;
  const msg = (err.message || '').toLowerCase();
  const code = err.code;

  if (
    msg.includes('429') ||
    msg.includes('compute units') ||
    msg.includes('capacity') ||
    msg.includes('exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('unexpected end of json') ||
    msg.includes('unexpected token') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('socket hang up') ||
    code === -32005 ||
    code === -32000 ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT'
  ) {
    return true;
  }
  return false;
}

function makeHttpRequest(postData) {
  return new Promise((resolve, reject) => {
    const url = new URL(RPC_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
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
        if (res.statusCode === 429) {
          const err = new Error('HTTP 429: Rate limit exceeded');
          err.is429 = true;
          err.isRetryable = true;
          return reject(err);
        }
        if (res.statusCode >= 500) {
          const err = new Error(`HTTP ${res.statusCode}: Server error`);
          err.isRetryable = true;
          return reject(err);
        }
        try {
          if (!body || body.trim() === '') {
            const err = new Error('Unexpected end of JSON input (empty response body)');
            err.isRetryable = true;
            return reject(err);
          }
          const parsed = JSON.parse(body);

          // Check single response error
          if (parsed && !Array.isArray(parsed) && parsed.error) {
            const msg = parsed.error.message || '';
            const err = new Error(msg);
            const lowerMsg = msg.toLowerCase();
            if (
              lowerMsg.includes('compute units') ||
              lowerMsg.includes('capacity') ||
              lowerMsg.includes('exceeded') ||
              lowerMsg.includes('rate limit') ||
              lowerMsg.includes('429') ||
              parsed.error.code === -32005 ||
              parsed.error.code === -32000
            ) {
              err.is429 = true;
            }
            err.isRetryable = true;
            return reject(err);
          }

          // Check batch response errors
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.error) {
                const msg = item.error.message || '';
                const lowerMsg = msg.toLowerCase();
                if (
                  lowerMsg.includes('compute units') ||
                  lowerMsg.includes('capacity') ||
                  lowerMsg.includes('exceeded') ||
                  lowerMsg.includes('rate limit') ||
                  lowerMsg.includes('429') ||
                  item.error.code === -32005 ||
                  item.error.code === -32000
                ) {
                  const err = new Error(msg);
                  err.is429 = true;
                  err.isRetryable = true;
                  return reject(err);
                }
              }
            }
          }

          resolve(parsed);
        } catch (e) {
          const err = new Error(`Unexpected end of JSON input: ${e.message}`);
          err.isRetryable = true;
          reject(err);
        }
      });
    });

    req.on('error', (netErr) => {
      netErr.isRetryable = true;
      reject(netErr);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      const err = new Error('RPC HTTP request timed out');
      err.isRetryable = true;
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function makeHttpRequestWithConcurrency(postData) {
  await rpcSemaphore.acquire();
  try {
    return await makeHttpRequest(postData);
  } finally {
    rpcSemaphore.release();
  }
}

async function executeRpcWithRetry(postData, methodInfo = '', retries = MAX_RETRIES) {
  let attempt = 0;

  while (true) {
    try {
      runtimeState.lastRpcCallsCount++;
      const parsed = await makeHttpRequestWithConcurrency(postData);
      return parsed;
    } catch (err) {
      runtimeState.rpcErrors++;
      const retryable = isRetryableError(err);
      const isRateLimit =
        err.is429 ||
        (err.message &&
          (err.message.includes('compute units') ||
            err.message.includes('capacity') ||
            err.message.includes('429')));

      if (isRateLimit) {
        runtimeState.retries429++;
        consecutiveSuccessChunks = 0;
        runtimeState.currentChunkSize = Math.max(1, Math.floor(runtimeState.currentChunkSize / 2));
      }

      if (retryable && attempt < retries) {
        attempt++;
        const baseBackoff = Math.min(16000, 1000 * Math.pow(2, attempt - 1));
        const jitter = Math.random() * (baseBackoff * 0.5);
        const backoffMs = Math.floor(baseBackoff * 0.5 + jitter);

        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        if (attempt >= retries) {
          console.error(
            `[RPC Error] ${methodInfo} failed after ${retries} attempts: ${err.message}`,
          );
        }
        throw err;
      }
    }
  }
}

async function jsonRpcCallWithRetry(method, params, retries = MAX_RETRIES) {
  const postData = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
  const parsed = await executeRpcWithRetry(postData, method, retries);
  return parsed ? parsed.result : null;
}

async function jsonRpcBatchCallWithRetry(requests, retries = MAX_RETRIES) {
  const postData = JSON.stringify(requests);
  const parsed = await executeRpcWithRetry(postData, 'batch', retries);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => (item && !item.error ? item.result : null));
  }
  return [];
}

function jsonRpcCall(method, params) {
  return jsonRpcCallWithRetry(method, params);
}

function parseHexBigInt(hexStr) {
  if (!hexStr || hexStr === '0x') return BigInt(0);
  return BigInt(hexStr);
}

function padAddress(addr) {
  return addr.toLowerCase().replace('0x', '').padStart(64, '0');
}

async function ethCall(to, data) {
  try {
    const res = await jsonRpcCallWithRetry('eth_call', [{ to, data }, 'latest']);
    return res;
  } catch (err) {
    return null;
  }
}

/**
 * Calculates and records a full NAV snapshot for the protocol
 */
async function recordNavSnapshot(
  blockNumber,
  blockHash,
  timestamp,
  triggerEvent,
  forceRefresh = false,
) {
  try {
    const now = Date.now();
    let navData = null;

    if (!forceRefresh && navCycleCache.data && now - navCycleCache.timestamp < 5000) {
      navData = navCycleCache.data;
    } else {
      const selectorTotalAssets = '0xf3e0ffbf'; // totalAssets(address)
      const selectorGetPrice = '0xb3596f07'; // getAssetPrice(address)
      const selectorTotalSupply = '0x18160ddd'; // totalSupply()

      const batchRequests = [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            { to: CONTRACTS.VAULT, data: selectorTotalAssets + padAddress(ASSETS.WBTC) },
            'latest',
          ],
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [
            { to: CONTRACTS.VAULT, data: selectorTotalAssets + padAddress(ASSETS.WETH) },
            'latest',
          ],
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'eth_call',
          params: [
            { to: CONTRACTS.VAULT, data: selectorTotalAssets + padAddress(ASSETS.USDC) },
            'latest',
          ],
        },
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'eth_call',
          params: [
            { to: CONTRACTS.ORACLE, data: selectorGetPrice + padAddress(ASSETS.WBTC) },
            'latest',
          ],
        },
        {
          jsonrpc: '2.0',
          id: 5,
          method: 'eth_call',
          params: [
            { to: CONTRACTS.ORACLE, data: selectorGetPrice + padAddress(ASSETS.WETH) },
            'latest',
          ],
        },
        {
          jsonrpc: '2.0',
          id: 6,
          method: 'eth_call',
          params: [
            { to: CONTRACTS.ORACLE, data: selectorGetPrice + padAddress(ASSETS.USDC) },
            'latest',
          ],
        },
        {
          jsonrpc: '2.0',
          id: 7,
          method: 'eth_call',
          params: [{ to: CONTRACTS.TOKEN, data: selectorTotalSupply }, 'latest'],
        },
      ];

      const batchResults = await jsonRpcBatchCallWithRetry(batchRequests).catch(() => null);

      const [
        wbtcAssetsRes,
        wethAssetsRes,
        usdcAssetsRes,
        wbtcPriceRes,
        wethPriceRes,
        usdcPriceRes,
        totalSupplyRes,
      ] = batchResults || [];

      const wbtcBalRaw = parseHexBigInt(wbtcAssetsRes);
      const wethBalRaw = parseHexBigInt(wethAssetsRes);
      const usdcBalRaw = parseHexBigInt(usdcAssetsRes);

      const btcPriceRaw = parseHexBigInt(wbtcPriceRes);
      const ethPriceRaw = parseHexBigInt(wethPriceRes);
      const usdcPriceRaw = parseHexBigInt(usdcPriceRes);
      const totalSupplyRaw = parseHexBigInt(totalSupplyRes);

      const btcPrice = btcPriceRaw > 0n ? Number(btcPriceRaw) / 1e18 : 65000.0;
      const ethPrice = ethPriceRaw > 0n ? Number(ethPriceRaw) / 1e18 : 1900.0;
      const usdcPrice = usdcPriceRaw > 0n ? Number(usdcPriceRaw) / 1e18 : 1.0;

      const wbtcUSD = (Number(wbtcBalRaw) / 1e8) * btcPrice;
      const wethUSD = (Number(wethBalRaw) / 1e18) * ethPrice;
      const usdcUSD = (Number(usdcBalRaw) / 1e6) * usdcPrice;

      const totalAssets = wbtcUSD + wethUSD + usdcUSD;
      const totalSupply = Number(totalSupplyRaw) / 1e18;

      const sharePrice = totalSupply > 0 ? totalAssets / totalSupply : 1.0;
      const nav = sharePrice;

      const btcWeight = totalAssets > 0 ? Number((wbtcUSD / totalAssets).toFixed(4)) : 0.5;
      const ethWeight = totalAssets > 0 ? Number((wethUSD / totalAssets).toFixed(4)) : 0.5;

      navData = {
        nav: Number(nav.toFixed(4)),
        totalAssets: Number(totalAssets.toFixed(2)),
        totalSupply: Number(totalSupply.toFixed(4)),
        btcPrice: Number(btcPrice.toFixed(2)),
        ethPrice: Number(ethPrice.toFixed(2)),
        btcWeight,
        ethWeight,
        sharePrice: Number(sharePrice.toFixed(4)),
      };

      navCycleCache = {
        timestamp: now,
        data: navData,
      };
    }

    const snapshot = {
      blockNumber: blockNumber || db.lastBlock || DEPLOY_BLOCK,
      blockHash: blockHash || `0x${(blockNumber || DEPLOY_BLOCK).toString(16)}`,
      timestamp: timestamp || new Date().toISOString(),
      ...navData,
    };

    // Duplicate Prevention: Check blockNumber and timestamp
    const isDuplicate = db.navSnapshots.some(
      (s) => s.blockNumber === snapshot.blockNumber && s.timestamp === snapshot.timestamp,
    );

    if (!isDuplicate) {
      db.navSnapshots.push(snapshot);
      db.navSnapshots = deduplicateAndSortSnapshots(db.navSnapshots);
      saveDB();
    }
    return snapshot;
  } catch (err) {
    console.error('Failed to calculate NAV snapshot:', err.message);
    return null;
  }
}

async function indexEvents() {
  const startTime = Date.now();
  runtimeState.lastRpcCallsCount = 0;
  runtimeState.retries429 = 0;
  let blocksProcessedInCycle = 0;

  try {
    const latestBlockHex = await jsonRpcCallWithRetry('eth_blockNumber', []).catch(() => null);
    if (!latestBlockHex) return;
    const latestBlock = parseInt(latestBlockHex, 16);

    runtimeState.latestChainBlock = latestBlock;

    if (db.lastBlock === 0 || db.lastBlock < DEPLOY_BLOCK) {
      db.lastBlock = DEPLOY_BLOCK - 1;
    }

    const targetBlock = Math.min(latestBlock, db.lastBlock + MAX_BLOCKS_PER_CYCLE);
    let currentFrom = db.lastBlock + 1;

    while (currentFrom <= targetBlock) {
      const chunkSize = runtimeState.currentChunkSize;
      const currentTo = Math.min(currentFrom + chunkSize - 1, targetBlock);

      let logs;
      try {
        logs = await jsonRpcCallWithRetry('eth_getLogs', [
          {
            address: [
              CONTRACTS.CONTROLLER,
              CONTRACTS.TOKEN,
              CONTRACTS.TREASURY,
              CONTRACTS.VAULT,
              CONTRACTS.ORACLE,
              CONTRACTS.CBBTC_AGGREGATOR,
              CONTRACTS.WETH_AGGREGATOR,
            ],
            fromBlock: '0x' + currentFrom.toString(16),
            toBlock: '0x' + currentTo.toString(16),
          },
        ]);
      } catch (err) {
        // Retries exhausted for eth_getLogs: stop cycle without updating db.lastBlock
        break;
      }

      if (!Array.isArray(logs)) {
        break;
      }
      for (const log of logs) {
        const txHash = log.transactionHash;
        const logIndex = parseInt(log.logIndex, 16);
        const blockNumber = parseInt(log.blockNumber, 16);
        const blockHash = log.blockHash;
        const topic0 = log.topics[0];
        const contractAddr = log.address.toLowerCase();

        // 1. DEPOSIT_COMPLETED
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

            await recordNavSnapshot(
              blockNumber,
              blockHash,
              new Date().toISOString(),
              'DepositCompleted',
            );
          }
        }

        // 2. REDEEM_COMPLETED
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

            await recordNavSnapshot(
              blockNumber,
              blockHash,
              new Date().toISOString(),
              'RedeemCompleted',
            );
          }
        }

        // 3. FeeCollected / ProtocolFeeCollected
        if (
          (topic0 === TOPICS.FEE_COLLECTED && contractAddr === CONTRACTS.TREASURY.toLowerCase()) ||
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

            await recordNavSnapshot(
              blockNumber,
              blockHash,
              new Date().toISOString(),
              'FeeCollected',
            );
          }
        }

        // 4. Oracle Price Updated
        if (
          topic0 === TOPICS.ANSWER_UPDATED ||
          topic0 === TOPICS.ORACLE_PRICE_SYNC ||
          topic0 === TOPICS.PRICE_SET
        ) {
          const isDuplicate = db.oracleUpdates.some(
            (o) => o.txHash === txHash && o.logIndex === logIndex,
          );
          if (!isDuplicate) {
            db.oracleUpdates.push({
              blockNumber,
              txHash,
              logIndex,
              type: 'ORACLE_UPDATE',
              timestamp: new Date().toISOString(),
            });

            await recordNavSnapshot(
              blockNumber,
              blockHash,
              new Date().toISOString(),
              'OraclePriceUpdated',
            );
          }
        }

        // 5. Rebalance Executed
        if (topic0 === TOPICS.SWAP_EXECUTED || topic0 === TOPICS.STRATEGY_UPDATED) {
          const isDuplicate = db.rebalances.some(
            (reb) => reb.txHash === txHash && reb.logIndex === logIndex,
          );
          if (!isDuplicate) {
            db.rebalances.push({
              blockNumber,
              txHash,
              logIndex,
              type: 'REBALANCE',
              timestamp: new Date().toISOString(),
            });

            await recordNavSnapshot(
              blockNumber,
              blockHash,
              new Date().toISOString(),
              'RebalanceExecuted',
            );
          }
        }

        // 6. TRANSFER on UVBTCETHToken
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
          }
        }
      }

      blocksProcessedInCycle += currentTo - currentFrom + 1;
      db.lastBlock = currentTo;

      // Persistence immediately after each successful chunk
      saveDB();

      currentFrom = currentTo + 1;

      consecutiveSuccessChunks++;
      if (consecutiveSuccessChunks >= 3 && runtimeState.currentChunkSize < INITIAL_CHUNK_SIZE) {
        runtimeState.currentChunkSize = Math.min(
          INITIAL_CHUNK_SIZE,
          runtimeState.currentChunkSize + 2,
        );
      }
    }

    runtimeState.lastIndexedBlock = db.lastBlock;
    runtimeState.blocksBehind = Math.max(0, runtimeState.latestChainBlock - db.lastBlock);
    runtimeState.lastSuccessfulScan = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    runtimeState.lastScanDurationMs = durationMs;

    if (runtimeState.blocksBehind > 10) {
      runtimeState.status = 'SYNCING';
    } else if (runtimeState.rpcErrors > 10) {
      runtimeState.status = 'DEGRADED';
    } else {
      runtimeState.status = 'ONLINE';
    }

    // Structured Logging
    if (blocksProcessedInCycle > 0 || runtimeState.blocksBehind > 0) {
      console.log(`[Indexer]
Blocks Indexed: ${blocksProcessedInCycle}
Latest: ${runtimeState.latestChainBlock}
Lag: ${runtimeState.blocksBehind}
RPC Calls: ${runtimeState.lastRpcCallsCount}
429 Retries: ${runtimeState.retries429}
Duration: ${(durationMs / 1000).toFixed(1)}s`);
    }
  } catch (err) {
    runtimeState.rpcErrors++;
    runtimeState.status = runtimeState.lastSuccessfulScan ? 'DEGRADED' : 'OFFLINE';
    console.error(`[Indexer Error] Scan cycle error: ${err.message}`);
  }
}

// Filter snapshots by period parameter
function filterSnapshotsByPeriod(snapshots, period) {
  if (!Array.isArray(snapshots)) return [];
  const now = Date.now();
  const sorted = deduplicateAndSortSnapshots(snapshots);

  if (!period || period.toUpperCase() === 'ALL') {
    return sorted;
  }

  let periodMs = 0;
  const p = period.toUpperCase();
  if (p === '1D') periodMs = 24 * 3600 * 1000;
  else if (p === '7D') periodMs = 7 * 24 * 3600 * 1000;
  else if (p === '30D') periodMs = 30 * 24 * 3600 * 1000;
  else if (p === '90D') periodMs = 90 * 24 * 3600 * 1000;
  else return sorted;

  const cutoff = now - periodMs;
  return sorted.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
}

function getHealthStatus() {
  const latestChainBlock = runtimeState.latestChainBlock || db.lastBlock;
  const lastIndexedBlock = db.lastBlock;
  const blocksBehind = Math.max(0, latestChainBlock - lastIndexedBlock);

  let status = 'ONLINE';
  if (!runtimeState.lastSuccessfulScan) {
    status = 'OFFLINE';
  } else if (blocksBehind > 10) {
    status = 'SYNCING';
  } else if (runtimeState.retries429 > 5 || runtimeState.rpcErrors > 20) {
    status = 'DEGRADED';
  }

  return {
    latestChainBlock,
    lastIndexedBlock,
    blocksBehind,
    indexerLag: blocksBehind,
    rpcProvider: RPC_URL,
    rpcErrors: runtimeState.rpcErrors,
    lastSuccessfulScan: runtimeState.lastSuccessfulScan,
    uptime: Math.round((Date.now() - runtimeState.startTime) / 1000),
    status,
  };
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

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname;

  // GET /api/health
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(getHealthStatus()));
  }

  // GET /api/nav/history
  if (pathname === '/api/nav/history') {
    const period = parsedUrl.searchParams.get('period') || 'ALL';
    const filtered = filterSnapshotsByPeriod(db.navSnapshots, period);
    res.writeHead(200, { 'Cache-Control': 'public, max-age=10' });
    return res.end(JSON.stringify(filtered));
  }

  if (pathname === '/api/indexer/stats') {
    const health = getHealthStatus();
    res.writeHead(200);
    return res.end(
      JSON.stringify({
        ...health,
        lastBlock: db.lastBlock,
        depositsCount: db.deposits.length,
        redeemsCount: db.redeems.length,
        transfersCount: db.transfers.length,
        feesCount: db.fees.length,
        oracleUpdatesCount: db.oracleUpdates.length,
        rebalancesCount: db.rebalances.length,
        navSnapshotsCount: db.navSnapshots.length,
        usersCount: Object.keys(db.users).length,
        updatedAt: db.updatedAt,
      }),
    );
  }

  if (pathname === '/api/indexer/events') {
    res.writeHead(200);
    return res.end(
      JSON.stringify({
        deposits: db.deposits,
        redeems: db.redeems,
        transfers: db.transfers,
        fees: db.fees,
        oracleUpdates: db.oracleUpdates,
        rebalances: db.rebalances,
      }),
    );
  }

  if (pathname === '/api/indexer/tvl') {
    res.writeHead(200);
    return res.end(JSON.stringify(db.tvlSnapshots));
  }

  if (pathname === '/api/indexer/nav') {
    const period = parsedUrl.searchParams.get('period') || 'ALL';
    const filtered = filterSnapshotsByPeriod(db.navSnapshots, period);
    res.writeHead(200);
    return res.end(JSON.stringify(filtered));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`UnifyVault Indexer Daemon running on port ${PORT}`);
    indexEvents();
    setInterval(indexEvents, 10_000);
  });
}

module.exports = {
  db,
  recordNavSnapshot,
  filterSnapshotsByPeriod,
  deduplicateAndSortSnapshots,
  saveDB,
  loadDB,
  indexEvents,
  server,
};
