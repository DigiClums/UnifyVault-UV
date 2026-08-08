const {
  createPublicClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  decodeErrorResult,
} = require('viem');
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

const CONTROLLER_ADDR = '0x923a55e96bb5FaeDe0C05b4aA31cB61b9cc83546';

const CONTROLLER_ABI = parseAbi([
  'function getDepositQuote(address asset, uint256 amount, uint256 minSharesOut, address receiver) external view returns ((bytes32 assetId, address asset, address receiver, uint256 depositAmount, uint256 rawPrice, uint256 normalizedPrice, uint256 sharesPreview, uint256 protocolFee, uint256 netDeposit, uint256 timestamp))',
  'function getRedeemQuote(address asset, uint256 shares, address receiver) external view returns ((address asset, address receiver, uint256 shares, uint256 grossCollateral, uint256 grossValueUSD, uint256 protocolFee, uint256 netPayout, uint256 timestamp))',
  'function deposit(address asset, uint256 amount, uint256 minSharesOut, address receiver) external returns ((bytes32 assetId, address asset, address receiver, uint256 depositAmount, uint256 rawPrice, uint256 normalizedPrice, uint256 sharesPreview, uint256 protocolFee, uint256 netDeposit, uint256 timestamp))',
  'function redeem(address asset, uint256 shares, uint256 minAssetsOut, address receiver, uint256 deadline) external returns (uint256)',
  'function strategyManager() external view returns (address)',
  'function swapAdapter() external view returns (address)',
  'function portfolioManager() external view returns (address)',
]);

const STRATEGY_MANAGER_ABI = parseAbi([
  'function getTargetWeights() external view returns (address[] assets, uint256[] weightsBps)',
]);

const SWAP_ADAPTER_ABI = parseAbi([
  'function router() external view returns (address)',
  'function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address to) external returns (uint256)',
]);

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
  console.log('--- DEEP DEPOSIT & REDEEM SIMULATION DEBUG ---');

  const sm = await client.readContract({
    address: CONTROLLER_ADDR,
    abi: CONTROLLER_ABI,
    functionName: 'strategyManager',
  });
  const sa = await client.readContract({
    address: CONTROLLER_ADDR,
    abi: CONTROLLER_ABI,
    functionName: 'swapAdapter',
  });
  console.log('StrategyManager:', sm);
  console.log('SwapAdapter:    ', sa);

  if (sm !== '0x0000000000000000000000000000000000000000') {
    const [targetAssets, weightsBps] = await client.readContract({
      address: sm,
      abi: STRATEGY_MANAGER_ABI,
      functionName: 'getTargetWeights',
    });
    console.log('Strategy Manager Target Assets & Weights:');
    targetAssets.forEach((a, i) => {
      console.log(
        `  [${i}] ${a}: ${weightsBps[i].toString()} bps (${Number(weightsBps[i]) / 100}%)`,
      );
    });
  }

  if (sa !== '0x0000000000000000000000000000000000000000') {
    try {
      const r = await client.readContract({
        address: sa,
        abi: SWAP_ADAPTER_ABI,
        functionName: 'router',
      });
      console.log('SwapAdapter Router:', r);
    } catch (e) {
      console.log('SwapAdapter router() call failed:', e.message);
    }
  }

  const amountsToTest = [
    parseUnits('0.1', 6),
    parseUnits('1', 6),
    parseUnits('10', 6),
    parseUnits('25', 6),
    parseUnits('100', 6),
  ];

  for (const amt of amountsToTest) {
    console.log(`\n=== Testing Deposit Simulation for ${formatUnits(amt, 6)} USDC ===`);
    try {
      const quote = await client.readContract({
        address: CONTROLLER_ADDR,
        abi: CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [TOKENS.USDC, amt, 0n, TEST_WALLET],
      });
      const sharesPreview = quote.sharesPreview || quote[6];
      console.log(`  sharesPreview: ${formatUnits(sharesPreview, 18)}`);

      // Test with minShares = 0
      try {
        await client.simulateContract({
          account: TEST_WALLET,
          address: CONTROLLER_ADDR,
          abi: CONTROLLER_ABI,
          functionName: 'deposit',
          args: [TOKENS.USDC, amt, 0n, TEST_WALLET],
        });
        console.log(`  deposit(${formatUnits(amt, 6)} USDC, minShares=0) -> SUCCESS`);
      } catch (err) {
        console.log(`  deposit(${formatUnits(amt, 6)} USDC, minShares=0) -> REVERTED`);
        console.log('  Error:', err.shortMessage || err.message);
        if (err.data) {
          try {
            console.log(
              '  Decoded error:',
              decodeErrorResult({ abi: PROTOCOL_ERRORS_ABI, data: err.data }),
            );
          } catch {}
        }
      }

      // Test with 0.5% slippage minShares
      const minShares05 = (sharesPreview * 995n) / 1000n;
      try {
        await client.simulateContract({
          account: TEST_WALLET,
          address: CONTROLLER_ADDR,
          abi: CONTROLLER_ABI,
          functionName: 'deposit',
          args: [TOKENS.USDC, amt, minShares05, TEST_WALLET],
        });
        console.log(`  deposit(${formatUnits(amt, 6)} USDC, minShares 0.5% slippage) -> SUCCESS`);
      } catch (err) {
        console.log(`  deposit(${formatUnits(amt, 6)} USDC, minShares 0.5% slippage) -> REVERTED`);
        console.log('  Error:', err.shortMessage || err.message);
        if (err.data) {
          try {
            console.log(
              '  Decoded error:',
              decodeErrorResult({ abi: PROTOCOL_ERRORS_ABI, data: err.data }),
            );
          } catch {}
        }
      }
    } catch (e) {
      console.log(
        `  getDepositQuote(${formatUnits(amt, 6)} USDC) REVERTED:`,
        e.shortMessage || e.message,
      );
    }
  }

  // Redeem simulations for various share amounts
  const shareAmountsToTest = [
    parseUnits('0.1', 18),
    parseUnits('1', 18),
    parseUnits('14.092784658279326814', 18),
  ];

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  for (const shares of shareAmountsToTest) {
    console.log(
      `\n=== Testing Redeem Simulation for ${formatUnits(shares, 18)} UVBTCETH shares ===`,
    );
    try {
      const quote = await client.readContract({
        address: CONTROLLER_ADDR,
        abi: CONTROLLER_ABI,
        functionName: 'getRedeemQuote',
        args: [TOKENS.USDC, shares, TEST_WALLET],
      });
      const netPayout = quote.netPayout || quote[6];
      console.log(`  netPayout: ${formatUnits(netPayout, 6)} USDC`);

      // Test with minAssetsOut = 0
      try {
        await client.simulateContract({
          account: TEST_WALLET,
          address: CONTROLLER_ADDR,
          abi: CONTROLLER_ABI,
          functionName: 'redeem',
          args: [TOKENS.USDC, shares, 0n, TEST_WALLET, deadline],
        });
        console.log(`  redeem(${formatUnits(shares, 18)} shares, minAssets=0) -> SUCCESS`);
      } catch (err) {
        console.log(`  redeem(${formatUnits(shares, 18)} shares, minAssets=0) -> REVERTED`);
        console.log('  Error:', err.shortMessage || err.message);
        if (err.data) {
          try {
            console.log(
              '  Decoded error:',
              decodeErrorResult({ abi: PROTOCOL_ERRORS_ABI, data: err.data }),
            );
          } catch {}
        }
      }

      // Test with 0.5% slippage minAssetsOut
      const minAssets05 = (netPayout * 995n) / 1000n;
      try {
        await client.simulateContract({
          account: TEST_WALLET,
          address: CONTROLLER_ADDR,
          abi: CONTROLLER_ABI,
          functionName: 'redeem',
          args: [TOKENS.USDC, shares, minAssets05, TEST_WALLET, deadline],
        });
        console.log(
          `  redeem(${formatUnits(shares, 18)} shares, minAssets 0.5% slippage) -> SUCCESS`,
        );
      } catch (err) {
        console.log(
          `  redeem(${formatUnits(shares, 18)} shares, minAssets 0.5% slippage) -> REVERTED`,
        );
        console.log('  Error:', err.shortMessage || err.message);
        if (err.data) {
          try {
            console.log(
              '  Decoded error:',
              decodeErrorResult({ abi: PROTOCOL_ERRORS_ABI, data: err.data }),
            );
          } catch {}
        }
      }
    } catch (e) {
      console.log(
        `  getRedeemQuote(${formatUnits(shares, 18)} shares) REVERTED:`,
        e.shortMessage || e.message,
      );
    }
  }
}

main().catch(console.error);
