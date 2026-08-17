const {
  createPublicClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  hexToBigInt,
  decodeErrorResult,
} = require('viem');
const { baseSepolia } = require('viem/chains');

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
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

const DIRECTORY_ABI = parseAbi([
  'function getAddress(bytes32 name) external view returns (address)',
  'function exists(bytes32 name) external view returns (bool)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function symbol() external view returns (string)',
]);

const PORTFOLIO_MANAGER_ABI = parseAbi([
  'function calculatePortfolioValue() external view returns (uint256)',
  'function calculateNAV() external view returns (uint256 portfolioValUSD, uint256 navPerShare)',
  'function previewRedeem(uint256 shares, address asset) external view returns ((address asset, uint256 payoutAmount, uint256 feeAmount))',
]);

const CUSTODY_VAULT_ABI = parseAbi([
  'function totalAssets(address asset) external view returns (uint256)',
  'function isSupported(address asset) external view returns (bool)',
  'function assetConfig(address asset) external view returns ((bool enabled, uint8 decimals, uint256 minDeposit))',
]);

const ORACLE_MANAGER_ABI = parseAbi([
  'function getAssetPrice(address asset) external view returns (uint256)',
]);

const COST_BASIS_MANAGER_ABI = parseAbi([
  'function costBasis(address user) external view returns (uint256)',
  'function getCostBasis(address user) external view returns (uint256 totalCostUSD, uint256 avgCostPerShare)',
]);

const CONTROLLER_ABI = parseAbi([
  'function getDepositQuote(address asset, uint256 amount, uint256 minSharesOut, address receiver) external view returns ((bytes32 assetId, address asset, address receiver, uint256 depositAmount, uint256 rawPrice, uint256 normalizedPrice, uint256 sharesPreview, uint256 protocolFee, uint256 netDeposit, uint256 timestamp))',
  'function getRedeemQuote(address asset, uint256 shares, address receiver) external view returns ((address asset, address receiver, uint256 shares, uint256 grossCollateral, uint256 grossValueUSD, uint256 protocolFee, uint256 netPayout, uint256 timestamp))',
  'function deposit(address asset, uint256 amount, uint256 minSharesOut, address receiver) external returns ((bytes32 assetId, address asset, address receiver, uint256 depositAmount, uint256 rawPrice, uint256 normalizedPrice, uint256 sharesPreview, uint256 protocolFee, uint256 netDeposit, uint256 timestamp))',
  'function redeem(address asset, uint256 shares, uint256 minAssetsOut, address receiver, uint256 deadline) external returns (uint256)',
  'function strategyManager() external view returns (address)',
  'function swapAdapter() external view returns (address)',
]);

const STRATEGY_MANAGER_ABI = parseAbi([
  'function getTargetWeights() external view returns (address[] assets, uint256[] weightsBps)',
]);

const SWAP_ADAPTER_ABI = parseAbi(['function router() external view returns (address)']);

const PROTOCOL_ERRORS_ABI = parseAbi([
  'error NotAContract(address target)',
  'error DeadlineExpired(uint256 deadline, uint256 timestamp)',
  'error MathCalculationOverflow()',
  'error ZeroAddressDetected()',
  'error DepositExceedsTxLimit(uint256 requested, uint256 maxAllowed)',
  'error DailyDepositCapExceeded(uint256 newTotal, uint256 cap)',
  'error RedeemExceedsTxLimit(uint256 requested, uint256 maxAllowed)',
  'error DailyRedeemCapExceeded(uint256 newTotal, uint256 cap)',
  'error AssetNotSupported(bytes32 assetId)',
  'error InsufficientSwapOutput(uint256 expected, uint256 actual, uint256 minAllowed)',
  'error OraclePriceNegative(address asset, int256 price)',
  'error RegistryIsFrozen()',
  'error EntryAlreadyExists(bytes32 id)',
  'error EntryDoesNotExist(bytes32 id)',
  'error IdenticalAddressSubmitted()',
  'error EnforcedPause()',
  'error ExpectedPause()',
  'error UnauthorizedCaller(address caller)',
  'error InsufficientBalance(address token, uint256 required, uint256 available)',
  'error InsufficientAllowance(address token, uint256 required, uint256 available)',
  'error SlippageExceeded(uint256 expected, uint256 actual)',
  'error InvalidSlippageBps(uint256 bps)',
]);

async function main() {
  console.log('================================================================');
  console.log('    UNIFYVAULT V2 LIVE BASE SEPOLIA PRODUCTION AUDIT SCRIPT');
  console.log('================================================================');
  console.log('RPC URL:', RPC_URL);
  console.log('ProtocolDirectory:', DIRECTORY_ADDR);
  console.log('Test Wallet:', TEST_WALLET);

  const moduleNames = [
    {
      name: 'DepositManager',
      id: '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af',
    },
    {
      name: 'PortfolioManager',
      id: '0x3c40c670348eca8b03e7650189aa991cc9d77fcbee961381c2354fae1a3e2188',
    },
    {
      name: 'StrategyManager',
      id: '0x58b399e3748bdc2a6973276bd201243421cffba73d1ebdad6acf1b65eb6935e5',
    },
    {
      name: 'OracleManager',
      id: '0x2e30c16253629c211949dfd3fde5e2a3de47827f45371d8ef81f41a881d12a04',
    },
    {
      name: 'CustodyVault',
      id: '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640',
    },
    {
      name: 'IndexToken',
      id: '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8',
    },
    { name: 'Treasury', id: '0x6efca2866b731ee4984990bacad4cde10f1ef764fb54a5206bdfd291695b1a9b' },
    {
      name: 'SwapAdapter',
      id: '0xb38cc8783565eb75ee1b8d4c76a41d2179385de2efafcf6315528396e14ed8f2',
    },
    {
      name: 'FeeManager',
      id: '0x42e3570c507db8e472a4592e53f4b6df78eb7c8a8d593e718bb47b707f2c6a90',
    },
    {
      name: 'CostBasisManager',
      id: '0xd4741fb770f259864462ac1e0f0c516cde3c7a9a37aa2882da996c82ffff9796',
    },
    {
      name: 'PerformanceManager',
      id: '0x3cc6e30a00fc20cd55b209638eb88a197234ab24baed9e238b01e2c52159a815',
    },
    {
      name: 'Controller',
      id: '0x7c20e2bbcd91c5aaa7898ba022ab8867ac32d84e959c236484db066900aa363a',
    },
    {
      name: 'UnifyVaultController',
      id: '0xa543bc4ed1b0b3879d959f73d08bec324f84cda8174bc0a1709090f5789e13d7',
    },
  ];

  console.log('\n--- 0. DIRECTORY RESOLUTION ---');
  const modules = {};
  for (const mod of moduleNames) {
    try {
      const addr = await client.readContract({
        address: DIRECTORY_ADDR,
        abi: DIRECTORY_ABI,
        functionName: 'getAddress',
        args: [mod.id],
      });
      modules[mod.name] = addr;
      console.log(`  ${mod.name.padEnd(22)}: ${addr}`);
    } catch (e) {
      console.log(`  ${mod.name.padEnd(22)}: NOT REGISTERED (${e.shortMessage || e.message})`);
    }
  }

  const controllerAddr =
    modules.DepositManager || modules.UnifyVaultController || modules.Controller;
  const pmAddr = modules.PortfolioManager;
  const oracleAddr = modules.OracleManager;
  const vaultAddr = modules.CustodyVault;
  const tokenAddr = modules.IndexToken;
  const cbmAddr = modules.CostBasisManager;
  const smAddr = modules.StrategyManager;
  const saAddr = modules.SwapAdapter;

  // 1. Verify LIVE NAV
  console.log('\n--- 1. VERIFY LIVE NAV ---');
  const portVal = await client.readContract({
    address: pmAddr,
    abi: PORTFOLIO_MANAGER_ABI,
    functionName: 'calculatePortfolioValue',
  });
  const [navPortVal, navPerShare] = await client.readContract({
    address: pmAddr,
    abi: PORTFOLIO_MANAGER_ABI,
    functionName: 'calculateNAV',
  });
  const totalSupply = await client.readContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });

  const cbBtcBal = await client.readContract({
    address: vaultAddr,
    abi: CUSTODY_VAULT_ABI,
    functionName: 'totalAssets',
    args: [TOKENS.cbBTC],
  });
  const wethBal = await client.readContract({
    address: vaultAddr,
    abi: CUSTODY_VAULT_ABI,
    functionName: 'totalAssets',
    args: [TOKENS.WETH],
  });
  const usdcBal = await client.readContract({
    address: vaultAddr,
    abi: CUSTODY_VAULT_ABI,
    functionName: 'totalAssets',
    args: [TOKENS.USDC],
  });

  const btcPrice = await client.readContract({
    address: oracleAddr,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [TOKENS.cbBTC],
  });
  const ethPrice = await client.readContract({
    address: oracleAddr,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [TOKENS.WETH],
  });
  const usdcPrice = await client.readContract({
    address: oracleAddr,
    abi: ORACLE_MANAGER_ABI,
    functionName: 'getAssetPrice',
    args: [TOKENS.USDC],
  });

  console.log('Portfolio Value (calculatePortfolioValue):', formatUnits(portVal, 18), 'USD');
  console.log('Portfolio Value (calculateNAV):           ', formatUnits(navPortVal, 18), 'USD');
  console.log('NAV Per Share (calculateNAV):              ', formatUnits(navPerShare, 18), 'USD');
  console.log(
    'UVBTCETH Total Supply:                    ',
    formatUnits(totalSupply, 18),
    'UVBTCETH',
  );
  console.log('CustodyVault cbBTC balance:                ', formatUnits(cbBtcBal, 8), 'cbBTC');
  console.log('CustodyVault WETH balance:                 ', formatUnits(wethBal, 18), 'WETH');
  console.log('CustodyVault USDC balance:                 ', formatUnits(usdcBal, 6), 'USDC');
  console.log('Oracle cbBTC price:                        ', formatUnits(btcPrice, 18), 'USD');
  console.log('Oracle WETH price:                         ', formatUnits(ethPrice, 18), 'USD');
  console.log('Oracle USDC price:                         ', formatUnits(usdcPrice, 18), 'USD');

  const btcValUSD = (cbBtcBal * btcPrice) / 10n ** 8n;
  const ethValUSD = (wethBal * ethPrice) / 10n ** 18n;
  const usdcValUSD = (usdcBal * usdcPrice) / 10n ** 6n;
  const totalValUSDInd = btcValUSD + ethValUSD + usdcValUSD;
  const expectedNavPerShare =
    totalSupply > 0n ? (totalValUSDInd * 10n ** 18n) / totalSupply : 10n ** 18n;

  console.log('\n[INDEPENDENT NAV CALCULATION]');
  console.log('  cbBTC Value USD:                         $', formatUnits(btcValUSD, 18));
  console.log('  WETH Value USD:                          $', formatUnits(ethValUSD, 18));
  console.log('  USDC Value USD:                          $', formatUnits(usdcValUSD, 18));
  console.log('  Total Portfolio Value USD:               $', formatUnits(totalValUSDInd, 18));
  console.log('  Expected NAV Per Share:                  $', formatUnits(expectedNavPerShare, 18));
  console.log('  On-Chain NAV Per Share:                  $', formatUnits(navPerShare, 18));
  console.log(
    '  NAV Delta:                               $',
    formatUnits(navPerShare - expectedNavPerShare, 18),
  );

  // 2. Verify LIVE PnL
  console.log('\n--- 2. VERIFY LIVE PnL ---');
  let costBasisUSD = 0n;
  try {
    costBasisUSD = await client.readContract({
      address: cbmAddr,
      abi: COST_BASIS_MANAGER_ABI,
      functionName: 'costBasis',
      args: [TEST_WALLET],
    });
  } catch (e) {
    console.log('  costBasis(user) failed, trying getCostBasis...');
    const [tb] = await client.readContract({
      address: cbmAddr,
      abi: COST_BASIS_MANAGER_ABI,
      functionName: 'getCostBasis',
      args: [TEST_WALLET],
    });
    costBasisUSD = tb;
  }
  const userShareBal = await client.readContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [TEST_WALLET],
  });
  const currentHoldingValUSD = (userShareBal * navPerShare) / 10n ** 18n;
  const pnlUSD = currentHoldingValUSD - costBasisUSD;
  let pnlPercent = 0;
  if (costBasisUSD > 0n) {
    pnlPercent = (Number(pnlUSD) / Number(costBasisUSD)) * 100;
  } else {
    pnlPercent = userShareBal > 0n ? 100 : 0;
  }

  console.log('Test Wallet:', TEST_WALLET);
  console.log(
    'User UVBTCETH Share Balance:               ',
    formatUnits(userShareBal, 18),
    'shares',
  );
  console.log('User Cost Basis USD:                       $', formatUnits(costBasisUSD, 18));
  console.log(
    'Current Holding Value USD:                 $',
    formatUnits(currentHoldingValUSD, 18),
  );
  console.log('PnL USD:                                   $', formatUnits(pnlUSD, 18));
  console.log('PnL Percent:                               ', pnlPercent.toFixed(4), '%');

  // 3. Reproduce DEPOSIT failure
  console.log('\n--- 3. REPRODUCE DEPOSIT FAILURE ---');
  const depositAmountUSDC = parseUnits('1', 6);
  const userUSDCBal = await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [TEST_WALLET],
  });
  const userUSDCAllowance = await client.readContract({
    address: TOKENS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [TEST_WALLET, controllerAddr],
  });

  console.log('User USDC Balance:                         ', formatUnits(userUSDCBal, 6), 'USDC');
  console.log(
    'User USDC Allowance for Controller:        ',
    formatUnits(userUSDCAllowance, 6),
    'USDC',
  );
  console.log('Target Controller:                         ', controllerAddr);

  try {
    const depositQuote = await client.readContract({
      address: controllerAddr,
      abi: CONTROLLER_ABI,
      functionName: 'getDepositQuote',
      args: [TOKENS.USDC, depositAmountUSDC, 0n, TEST_WALLET],
    });
    console.log('getDepositQuote SUCCESS:');
    console.log(
      '  sharesPreview:                           ',
      formatUnits(depositQuote.sharesPreview || depositQuote[6], 18),
    );
    console.log(
      '  protocolFee:                             ',
      formatUnits(depositQuote.protocolFee || depositQuote[7], 6),
    );
    console.log(
      '  netDeposit:                              ',
      formatUnits(depositQuote.netDeposit || depositQuote[8], 6),
    );
  } catch (e) {
    console.log('getDepositQuote REVERTED:', e.shortMessage || e.message);
  }

  console.log('\nSimulating deposit(USDC, 1 USDC, 0 minShares, receiver)...');
  try {
    const { result } = await client.simulateContract({
      account: TEST_WALLET,
      address: controllerAddr,
      abi: CONTROLLER_ABI,
      functionName: 'deposit',
      args: [TOKENS.USDC, depositAmountUSDC, 0n, TEST_WALLET],
    });
    console.log('deposit SIMULATION SUCCEEDED!');
  } catch (err) {
    console.log('deposit SIMULATION REVERTED!');
    console.log('Full Error Name/Message:', err.name, err.shortMessage || err.message);
    if (err.cause) {
      console.log('Error Cause:', err.cause);
    }
    if (err.data) {
      console.log('Raw Revert Hex Data:', err.data);
      try {
        const decoded = decodeErrorResult({ abi: PROTOCOL_ERRORS_ABI, data: err.data });
        console.log('Decoded Protocol Error:', decoded);
      } catch (dErr) {
        console.log('Could not decode with Protocol Errors ABI:', dErr.message);
      }
    }
  }

  // 4. Reproduce REDEEM failure
  console.log('\n--- 4. REPRODUCE REDEEM FAILURE ---');
  const oneShare = parseUnits('1', 18);
  console.log('Testing getRedeemQuote for 1 share:');
  try {
    const quote1 = await client.readContract({
      address: controllerAddr,
      abi: CONTROLLER_ABI,
      functionName: 'getRedeemQuote',
      args: [TOKENS.USDC, oneShare, TEST_WALLET],
    });
    console.log(
      '  1 Share RedeemQuote netPayout:           ',
      formatUnits(quote1.netPayout || quote1[6], 6),
      'USDC',
    );
    console.log(
      '  1 Share RedeemQuote grossValueUSD:       $',
      formatUnits(quote1.grossValueUSD || quote1[4], 18),
    );
  } catch (e) {
    console.log('  getRedeemQuote(1 share) REVERTED:', e.shortMessage || e.message);
  }

  if (userShareBal > 0n) {
    console.log(
      `Testing getRedeemQuote for user balance (${formatUnits(userShareBal, 18)} shares):`,
    );
    try {
      const quoteUser = await client.readContract({
        address: controllerAddr,
        abi: CONTROLLER_ABI,
        functionName: 'getRedeemQuote',
        args: [TOKENS.USDC, userShareBal, TEST_WALLET],
      });
      console.log(
        '  User Balance RedeemQuote netPayout:     ',
        formatUnits(quoteUser.netPayout || quoteUser[6], 6),
        'USDC',
      );
    } catch (e) {
      console.log('  getRedeemQuote(user balance) REVERTED:', e.shortMessage || e.message);
    }
  }

  const redeemShares = userShareBal > 0n ? userShareBal : oneShare;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  console.log(
    `\nSimulating redeem(USDC, ${formatUnits(redeemShares, 18)} shares, 0 minOut, receiver, deadline)...`,
  );
  try {
    const { result } = await client.simulateContract({
      account: TEST_WALLET,
      address: controllerAddr,
      abi: CONTROLLER_ABI,
      functionName: 'redeem',
      args: [TOKENS.USDC, redeemShares, 0n, TEST_WALLET, deadline],
    });
    console.log('redeem SIMULATION SUCCEEDED! netAssets:', formatUnits(result, 6));
  } catch (err) {
    console.log('redeem SIMULATION REVERTED!');
    console.log('Full Error Name/Message:', err.name, err.shortMessage || err.message);
    if (err.cause) {
      console.log('Error Cause:', err.cause);
    }
    if (err.data) {
      console.log('Raw Revert Hex Data:', err.data);
      try {
        const decoded = decodeErrorResult({ abi: PROTOCOL_ERRORS_ABI, data: err.data });
        console.log('Decoded Protocol Error:', decoded);
      } catch (dErr) {
        console.log('Could not decode with Protocol Errors ABI:', dErr.message);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
