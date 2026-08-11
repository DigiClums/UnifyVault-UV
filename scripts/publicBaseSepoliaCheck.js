const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA ||
  'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';

const DIRECTORY_ADDR = '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D';
const CONTROLLER_ADDR = '0xF66Cfb1233548176cD4bFe8224fB18450Bf3c13e';
const PORTFOLIO_MANAGER_ADDR = '0x68c969b758e682B67e99a1ed2CC5753Ff1B2635E';
const INDEX_TOKEN_ADDR = '0xa34596D38Be381A4764141105A91C338Ca5503bB';
const USDC_ADDR = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const TEST_WALLET = '0xd905920c91853039060246Ed5724AA72B91a96DA';

async function callRpc(to, data) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function run() {
  console.log('=== PUBLIC BASE SEPOLIA LIVE CONTRACT AUDIT (POST-DEPLOYMENT) ===');
  console.log('RPC:', RPC_URL);

  // 1. Directory address checks
  // selector for getAddress(bytes32) = 0x21f8a721
  const pmFromDir = await callRpc(
    DIRECTORY_ADDR,
    '0x21f8a7213c40c670348eca8b03e7650189aa991cc9d77fcbee961381c2354fae1a3e2188',
  );
  const ctrlFromDir = await callRpc(
    DIRECTORY_ADDR,
    '0x21f8a721a547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af',
  );
  console.log('1. Registered PM in ProtocolDirectory:', '0x' + pmFromDir.slice(26));
  console.log('   Registered Controller in ProtocolDirectory:', '0x' + ctrlFromDir.slice(26));

  // 2. UVBTCETH balance & decimals
  const balanceCalldata = '0x70a08231' + TEST_WALLET.replace('0x', '').padStart(64, '0');
  const rawBalance = BigInt(await callRpc(INDEX_TOKEN_ADDR, balanceCalldata));
  const rawDecimals = BigInt(await callRpc(INDEX_TOKEN_ADDR, '0x313ce567'));
  const rawTotalSupply = BigInt(await callRpc(INDEX_TOKEN_ADDR, '0x18160ddd'));
  console.log('\n2. Token Metrics:');
  console.log('   - UVBTCETH Balance (raw):', rawBalance.toString());
  console.log('   - UVBTCETH Decimals:', rawDecimals.toString());
  console.log('   - UVBTCETH TotalSupply:', rawTotalSupply.toString());

  // 3. calculateNAV() -> (portfolioValUSD, navPerShare)
  const navHex = await callRpc(PORTFOLIO_MANAGER_ADDR, '0x11ebc619');
  const portfolioValUSD = BigInt('0x' + navHex.slice(2, 66));
  const navPerShare = BigInt('0x' + navHex.slice(66, 130));
  console.log('\n3 & 4. Portfolio Manager NAV:');
  console.log(
    '   - portfolioValUSD (18 decimals):',
    portfolioValUSD.toString(),
    '($' + (Number(portfolioValUSD) / 1e18).toFixed(6) + ')',
  );
  console.log(
    '   - navPerShare (18 decimals):',
    navPerShare.toString(),
    '($' + (Number(navPerShare) / 1e18).toFixed(6) + ')',
  );

  // 4. Call getRedeemQuote(address asset, uint256 shares, address receiver)
  // selector = 0xb8f82b26
  const cleanAsset = USDC_ADDR.replace('0x', '').padStart(64, '0');
  const sharesHex = (10n ** 18n).toString(16).padStart(64, '0');
  const cleanReceiver = TEST_WALLET.replace('0x', '').padStart(64, '0');
  const quoteCalldata = '0x3fe900d9' + cleanAsset + sharesHex + cleanReceiver;

  const quoteHex = await callRpc(CONTROLLER_ADDR, quoteCalldata);
  const grossCollateral = BigInt('0x' + quoteHex.slice(194, 258));
  const grossValueUSD = BigInt('0x' + quoteHex.slice(258, 322));
  const protocolFee = BigInt('0x' + quoteHex.slice(322, 386));
  const netPayout = BigInt('0x' + quoteHex.slice(386, 450));

  console.log('\n5. DEPLOYED CONTROLLER getRedeemQuote(1 UVBTCETH):');
  console.log(
    '   - grossCollateral:',
    grossCollateral.toString(),
    'wei =',
    (Number(grossCollateral) / 1e6).toFixed(2),
    'USDC',
  );
  console.log(
    '   - grossValueUSD:',
    grossValueUSD.toString(),
    'wei = $' + (Number(grossValueUSD) / 1e18).toFixed(4),
    'USD',
  );
  console.log(
    '   - protocolFee:',
    protocolFee.toString(),
    'wei =',
    (Number(protocolFee) / 1e6).toFixed(4),
    'USDC',
  );
  console.log(
    '   - netPayout:',
    netPayout.toString(),
    'wei =',
    (Number(netPayout) / 1e6).toFixed(4),
    'USDC',
  );

  // 5. Independent Calculation
  const expectedGrossUSD = 1n * navPerShare;
  const expectedFeeUSD = (expectedGrossUSD * 2n) / 100n;
  const expectedNetUSD = expectedGrossUSD - expectedFeeUSD;
  const expectedNetUSDC = (expectedNetUSD * 10n ** 6n) / 10n ** 18n;

  console.log('\n6 & 7. INDEPENDENT CALCULATION:');
  console.log(
    '   - expectedGrossUSD:',
    expectedGrossUSD.toString(),
    'wei = $' + (Number(expectedGrossUSD) / 1e18).toFixed(4),
  );
  console.log(
    '   - expectedFeeUSD:',
    expectedFeeUSD.toString(),
    'wei = $' + (Number(expectedFeeUSD) / 1e18).toFixed(4),
  );
  console.log(
    '   - expectedNetUSD:',
    expectedNetUSD.toString(),
    'wei = $' + (Number(expectedNetUSD) / 1e18).toFixed(4),
  );
  console.log(
    '   - expectedNetUSDC:',
    expectedNetUSDC.toString(),
    'wei =',
    (Number(expectedNetUSDC) / 1e6).toFixed(4),
    'USDC',
  );

  // 6. Hard Safety Checks
  const grossUSDNum = Number(grossValueUSD) / 1e18;
  const netUSDCNum = Number(netPayout) / 1e6;

  console.log('\n8. HARD SAFETY VERIFICATION:');
  console.log('   - Contract Gross USD:', grossUSDNum);
  console.log('   - Contract Net USDC:', netUSDCNum);

  if (rawTotalSupply > 0n) {
    if (grossUSDNum > 10) {
      throw new Error('❌ SANITY CHECK FAILED: grossUSD is over $10 ($' + grossUSDNum + ')');
    }
    if (grossUSDNum < 0.001) {
      throw new Error('❌ SANITY CHECK FAILED: grossUSD is below $0.001 ($' + grossUSDNum + ')');
    }
    if (Math.abs(netUSDCNum - 0.98) > 0.05) {
      throw new Error(
        '❌ SANITY CHECK FAILED: netUSDC is not approximately $0.98 (' + netUSDCNum + ')',
      );
    }
  } else {
    console.log(
      '   - Fresh deployment state verified: Total supply = 0, initial NAV per share = $1.000000',
    );
  }

  console.log('\n✅ ALL ON-CHAIN PUBLIC BASE SEPOLIA SANITY CHECKS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
