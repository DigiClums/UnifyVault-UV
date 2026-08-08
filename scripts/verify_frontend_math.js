const { createPublicClient, http, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
const DIRECTORY_ADDR = '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D';
const TEST_WALLET = '0xd905920c91853039060246Ed5724AA72B91a96DA';

const TOKENS = {
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  cbBTC: '0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29',
  WETH: '0xd116ab1c943cf15904ec4c8dd701086f175fa323',
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const {
  transformProtocolMetrics,
  transformUserPortfolio,
} = require('../apps/web-v2/lib/portfolioTransforms');

const DIRECTORY_ABI = parseAbi([
  'function getAddress(bytes32 name) external view returns (address)',
]);
const CUSTODY_VAULT_ABI = parseAbi([
  'function totalAssetBalance(address asset) external view returns (uint256)',
]);
const ORACLE_MANAGER_ABI = parseAbi([
  'function getAssetPrice(address asset) external view returns (uint256)',
]);
const ERC20_ABI = parseAbi([
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
]);
const COST_BASIS_MANAGER_ABI = parseAbi([
  'function costBasis(address user) external view returns (uint256)',
]);
const STRATEGY_MANAGER_ABI = parseAbi([
  'function getTargetWeights() external view returns (address[] assets, uint256[] weightsBps)',
]);
const PORTFOLIO_MANAGER_ABI = parseAbi([
  'function calculateNAV() external view returns (uint256 portfolioValUSD, uint256 navPerShare)',
]);
const PERFORMANCE_MANAGER_ABI = parseAbi([
  'function performance(address user) external view returns (uint256 currentValueUSD, uint256 investedCapitalUSD, uint256 realizedPnL, uint256 unrealizedPnL, uint256 netPnL, uint256 roiBps, uint256 holdingPeriod)',
]);

async function main() {
  const vault = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640'],
  });
  const oracle = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0x2e30c16253629c211949dfd3fde5e2a3de47827f45371d8ef81f41a881d12a04'],
  });
  const token = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8'],
  });
  const cbm = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0xd4741fb770f259864462ac1e0f0c516cde3c7a9a37aa2882da996c82ffff9796'],
  });
  const sm = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0x58b399e3748bdc2a6973276bd201243421cffba73d1ebdad6acf1b65eb6935e5'],
  });
  const pm = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0x3c40c670348eca8b03e7650189aa991cc9d77fcbee961381c2354fae1a3e2188'],
  });
  const perf = await client.readContract({
    address: DIRECTORY_ADDR,
    abi: DIRECTORY_ABI,
    functionName: 'getAddress',
    args: ['0x3cc6e30a00fc20cd55b209638eb88a197234ab24baed9e238b01e2c52159a815'],
  });

  const cbBtcBal = await client.readContract({
    address: vault,
    abi: CUSTODY_VAULT_ABI,
    functionName: 'totalAssetBalance',
    args: [TOKENS.cbBTC],
  });
  const wethBal = await client.readContract({
    address: vault,
    abi: CUSTODY_VAULT_ABI,
    functionName: 'totalAssetBalance',
    args: [TOKENS.WETH],
  });
  const usdcBal = await client.readContract({
    address: vault,
    abi: CUSTODY_VAULT_ABI,
    functionName: 'totalAssetBalance',
    args: [TOKENS.USDC],
  });

  const btcPrice = await client.readContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [TOKENS.cbBTC],
  });
  const ethPrice = await client.readContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [TOKENS.WETH],
  });
  const usdcPrice = await client.readContract({
    address: oracle,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [TOKENS.USDC],
  });

  const totalSupply = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });
  const userShareBal = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [TEST_WALLET],
  });
  const userUsdcBal = await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [TEST_WALLET],
  });

  const costBasis = await client.readContract({
    address: cbm,
    abi: COST_BASIS_MANAGER_ABI,
    functionName: 'costBasis',
    args: [TEST_WALLET],
  });
  const onChainNAV = await client.readContract({
    address: pm,
    abi: PORTFOLIO_MANAGER_ABI,
    functionName: 'calculateNAV',
  });
  const onChainPerf = await client.readContract({
    address: perf,
    abi: PERFORMANCE_MANAGER_ABI,
    functionName: 'performance',
    args: [TEST_WALLET],
  });

  const [_, weights] = await client.readContract({
    address: sm,
    abi: STRATEGY_MANAGER_ABI,
    functionName: 'getTargetWeights',
  });

  const rawProtocolData = {
    wbtcTotalAssets: cbBtcBal,
    wethTotalAssets: wethBal,
    usdcTotalAssets: usdcBal,
    priceWBTC: btcPrice,
    priceWETH: ethPrice,
    priceUSDC: usdcPrice,
    totalSharesRaw: totalSupply,
    onChainNAV: onChainNAV,
  };

  const rawUserData = {
    userAddress: TEST_WALLET,
    userSharesRaw: userShareBal,
    userUsdcRaw: userUsdcBal,
    contractInvestedAssetsRaw: costBasis,
    onChainPerformance: onChainPerf,
  };

  const strategyMetrics = {
    targetBtcBps: Number(weights[0]),
    targetEthBps: Number(weights[1]),
    targetBtcPercent: `${(Number(weights[0]) / 100).toFixed(1)}%`,
    targetEthPercent: `${(Number(weights[1]) / 100).toFixed(1)}%`,
  };

  const protocolMetrics = transformProtocolMetrics(rawProtocolData, strategyMetrics, 84532);
  const userPortfolio = transformUserPortfolio(
    rawUserData,
    rawProtocolData,
    protocolMetrics,
    84532,
  );

  console.log('--- TRANSFORMED PROTOCOL METRICS ---');
  console.log('  tvlUSD:', protocolMetrics.tvlUSD);
  console.log('  sharePriceUSD:', protocolMetrics.sharePriceUSD);
  console.log('  totalShares:', protocolMetrics.totalShares);
  console.log(
    '  holdings:',
    protocolMetrics.holdings.map((h) => `${h.symbol}: ${h.amountFormatted} (${h.usdValue})`),
  );

  console.log('\n--- TRANSFORMED USER PORTFOLIO ---');
  console.log('  userSharesFormatted:', userPortfolio.userSharesFormatted);
  console.log('  currentValueUSD:', userPortfolio.currentValueUSD);
  console.log('  investedAssetsUSD:', userPortfolio.investedAssetsUSD);
  console.log('  pnlUSD:', userPortfolio.pnlUSD);
  console.log('  pnlPercent:', userPortfolio.pnlPercent, '%');
  console.log('  pnlUSDFormatted:', userPortfolio.pnlUSDFormatted);
  console.log('  pnlPercentFormatted:', userPortfolio.pnlPercentFormatted);
}

main().catch(console.error);
