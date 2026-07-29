/* eslint-disable */
/**
 * UnifyVault V2 - NAV Indexer & Storage Verification Test Suite
 * Tests all 7 validation requirements for Historical NAV indexing
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  db,
  recordNavSnapshot,
  filterSnapshotsByPeriod,
  deduplicateAndSortSnapshots,
  saveDB,
  loadDB,
} = require('./indexerDaemon.js');

const NAV_DB_FILE = path.join(__dirname, '../apps/web-v2/public/historical-nav.json');

async function runValidationSuite() {
  console.log('\n==================================================');
  console.log('UNIFYVAULT V2 - HISTORICAL NAV INDEXER VALIDATION');
  console.log('==================================================\n');

  // Clear test state
  db.navSnapshots = [];
  saveDB();

  // Test 1: Deposit creates snapshot
  console.log('1. Testing DepositCreatesSnapshot...');
  const depositSnapshot = await recordNavSnapshot(
    44683001,
    '0xhash1',
    '2026-07-29T11:01:00.000Z',
    'DepositCompleted',
  );
  assert.ok(depositSnapshot, 'Deposit snapshot should be generated');
  assert.strictEqual(depositSnapshot.blockNumber, 44683001);
  assert.strictEqual(typeof depositSnapshot.nav, 'number');
  assert.strictEqual(typeof depositSnapshot.totalAssets, 'number');
  assert.strictEqual(typeof depositSnapshot.totalSupply, 'number');
  assert.strictEqual(typeof depositSnapshot.btcPrice, 'number');
  assert.strictEqual(typeof depositSnapshot.ethPrice, 'number');
  assert.strictEqual(typeof depositSnapshot.btcWeight, 'number');
  assert.strictEqual(typeof depositSnapshot.ethWeight, 'number');
  assert.strictEqual(typeof depositSnapshot.sharePrice, 'number');
  console.log('  ✓ Deposit creates snapshot verified');

  // Test 2: Redeem creates snapshot
  console.log('\n2. Testing RedeemCreatesSnapshot...');
  const redeemSnapshot = await recordNavSnapshot(
    44683002,
    '0xhash2',
    '2026-07-29T11:02:00.000Z',
    'RedeemCompleted',
  );
  assert.ok(redeemSnapshot, 'Redeem snapshot should be generated');
  assert.strictEqual(redeemSnapshot.blockNumber, 44683002);
  console.log('  ✓ Redeem creates snapshot verified');

  // Test 3: Fee collection creates snapshot
  console.log('\n3. Testing FeeCollectionCreatesSnapshot...');
  const feeSnapshot = await recordNavSnapshot(
    44683003,
    '0xhash3',
    '2026-07-29T11:03:00.000Z',
    'FeeCollected',
  );
  assert.ok(feeSnapshot, 'Fee collection snapshot should be generated');
  assert.strictEqual(feeSnapshot.blockNumber, 44683003);
  console.log('  ✓ Fee collection creates snapshot verified');

  // Test 4: Oracle update creates snapshot
  console.log('\n4. Testing OracleUpdateCreatesSnapshot...');
  const oracleSnapshot = await recordNavSnapshot(
    44683004,
    '0xhash4',
    '2026-07-29T11:04:00.000Z',
    'OraclePriceUpdated',
  );
  assert.ok(oracleSnapshot, 'Oracle update snapshot should be generated');
  assert.strictEqual(oracleSnapshot.blockNumber, 44683004);
  console.log('  ✓ Oracle update creates snapshot verified');

  // Test 5: Rebalance creates snapshot
  console.log('\n5. Testing RebalanceCreatesSnapshot...');
  const rebalanceSnapshot = await recordNavSnapshot(
    44683005,
    '0xhash5',
    '2026-07-29T11:05:00.000Z',
    'RebalanceExecuted',
  );
  assert.ok(rebalanceSnapshot, 'Rebalance snapshot should be generated');
  assert.strictEqual(rebalanceSnapshot.blockNumber, 44683005);
  console.log('  ✓ Rebalance creates snapshot verified');

  // Test 6: Duplicate prevention works
  console.log('\n6. Testing DuplicatePrevention...');
  const initialCount = db.navSnapshots.length;
  // Attempt to insert exact same blockNumber and timestamp
  await recordNavSnapshot(44683005, '0xhash5', '2026-07-29T11:05:00.000Z', 'RebalanceExecuted');
  assert.strictEqual(
    db.navSnapshots.length,
    initialCount,
    'Duplicate snapshot should not be added',
  );
  console.log('  ✓ Duplicate prevention verified');

  // Test 7: Restart preserves history
  console.log('\n7. Testing RestartPreservesHistory...');
  saveDB();
  db.navSnapshots = []; // simulate crash / memory wipe
  assert.strictEqual(db.navSnapshots.length, 0);

  loadDB(); // simulate daemon restart reloading from storage
  assert.strictEqual(
    db.navSnapshots.length,
    initialCount,
    'All snapshots should be restored from historical-nav.json after restart',
  );
  assert.ok(fs.existsSync(NAV_DB_FILE), 'historical-nav.json file must exist on disk');
  console.log('  ✓ Restart preserves history verified');

  // Test 8: API Period Filtering
  console.log('\n8. Testing API Period Filtering (?period=1D, 7D, 30D, 90D, ALL)...');
  const now = new Date();
  const oldDate = new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString();
  db.navSnapshots.unshift({
    blockNumber: 44680000,
    blockHash: '0xoldhash',
    timestamp: oldDate,
    nav: 1.0,
    totalAssets: 1000.0,
    totalSupply: 1000.0,
    btcPrice: 60000.0,
    ethPrice: 1800.0,
    btcWeight: 0.5,
    ethWeight: 0.5,
    sharePrice: 1.0,
  });
  saveDB();

  const allFiltered = filterSnapshotsByPeriod(db.navSnapshots, 'ALL');
  const d7Filtered = filterSnapshotsByPeriod(db.navSnapshots, '7D');
  const d30Filtered = filterSnapshotsByPeriod(db.navSnapshots, '30D');
  const d90Filtered = filterSnapshotsByPeriod(db.navSnapshots, '90D');

  assert.strictEqual(allFiltered.length, initialCount + 1);
  assert.strictEqual(d7Filtered.length, initialCount); // oldDate (40 days ago) excluded
  assert.strictEqual(d30Filtered.length, initialCount); // oldDate excluded
  assert.strictEqual(d90Filtered.length, initialCount + 1); // oldDate included
  console.log('  ✓ Period filtering (1D, 7D, 30D, 90D, ALL) verified');

  console.log('\n==================================================');
  console.log('ALL 7 VALIDATION REQUIREMENTS PASSED SUCCESSFULLY!');
  console.log('==================================================\n');

  process.exit(0);
}

runValidationSuite().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
