const {
  createPublicClient,
  http,
  formatEther,
  getAddress,
  keccak256,
  toHex,
  stringToHex,
} = require('viem');
const { baseSepolia } = require('viem/chains');

const contracts = {
  ProtocolDirectory: getAddress('0xd2715141a0f5998b707baa963990bfc2e94cf145'),
  OracleManager: getAddress('0x5b6067982c6cce2dc760eb4731c1b40136776d4a'),
  ChainlinkOracleProvider: getAddress('0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a'),
  Treasury: getAddress('0x66182f56bd5e523c655f6890290ab519f528e83f'),
  FeeManager: getAddress('0x0721465b01b586b7aadf957a4a884ace46cfbec9'),
  CustodyVault: getAddress('0x27b5c6dea90678b78856b0b10dba37a789fde97e'),
  LiquidityManager: getAddress('0xa938aacea64be8f41c90960aff232da4df7fc329'),
  UVBEV2: getAddress('0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde'),
  SwapAdapter: getAddress('0xcb1a434c5ebe2f2f8672ca507ee819c6888ae634'),
  StrategyManager: getAddress('0x14058459198a2cffc8ce89c364334a80da82d6a3'),
  PortfolioManager: getAddress('0x1c65b1667c8cc03138b8e57cdd40b0bf28a4cdc4'),
  UnifyVaultController: getAddress('0x07f3d3432b64dbf67c5b061af2bc8aef70221cea'),
  CostBasisManagerV2: getAddress('0xf71706a2fd8692e3c739855b2a33c0e679b4c382'),
  P2PEscrowV2: getAddress('0xbac9c1b440adf74688abbd5be950abd2766e5b7b'),
  PerformanceManager: getAddress('0x133fd024ea635694a223e66b936c2afab4f2db78'),
};

const assets = {
  USDC: getAddress('0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
  cbBTC: getAddress('0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29'),
  WETH: getAddress('0xd116ab1c943cf15904eC4c8dd701086f175FA323'),
};

const deployer = getAddress('0x441dbf8076d0b143EC17199baE94Daa884161454');
const CONTROLLER_ROLE = '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357';

const MODULE_IDS = {
  ORACLE: keccak256(stringToHex('OracleManager')),
  VAULT: keccak256(stringToHex('CustodyVault')),
  TREASURY: keccak256(stringToHex('Treasury')),
  TOKEN: keccak256(stringToHex('IndexToken')),
  DEPOSIT_MANAGER: keccak256(stringToHex('DepositManager')),
  STRATEGY_MANAGER: keccak256(stringToHex('StrategyManager')),
  PORTFOLIO_MANAGER: keccak256(stringToHex('PortfolioManager')),
  SWAP_ADAPTER: keccak256(stringToHex('SwapAdapter')),
  LIQUIDITY_MANAGER: keccak256(stringToHex('LiquidityManager')),
  FEE_MANAGER: keccak256(stringToHex('FeeManager')),
  COST_BASIS_MANAGER: keccak256(stringToHex('CostBasisManager')),
  PERFORMANCE_MANAGER: keccak256(stringToHex('PerformanceManager')),
  P2P_ESCROW: keccak256(stringToHex('P2PEscrow')),
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

async function main() {
  console.log(
    '========================================================================================',
  );
  console.log('CANONICAL BASE SEPOLIA V2 DEPLOYMENT VALIDATION REPORT');
  console.log('Chain ID: 84532 | ProtocolDirectory: ' + contracts.ProtocolDirectory);
  console.log(
    '========================================================================================\n',
  );

  const results = [];

  function record(section, check, status, details) {
    results.push({ section, check, status, details });
    const mark = status ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] ${section} -> ${check}: ${details}`);
  }

  // --- 0. ProtocolDirectory Registrations for 15 Modules ---
  console.log('--- 0. PROTOCOL DIRECTORY MODULE REGISTRATIONS ---');
  const directoryAbi = [
    {
      name: 'getAddress',
      type: 'function',
      inputs: [{ type: 'bytes32' }],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
  ];

  const expectedDirMap = {
    ORACLE: { key: 'OracleManager', addr: contracts.OracleManager },
    VAULT: { key: 'CustodyVault', addr: contracts.CustodyVault },
    TREASURY: { key: 'Treasury', addr: contracts.Treasury },
    TOKEN: { key: 'UVBEV2', addr: contracts.UVBEV2 },
    DEPOSIT_MANAGER: { key: 'UnifyVaultController', addr: contracts.UnifyVaultController },
    STRATEGY_MANAGER: { key: 'StrategyManager', addr: contracts.StrategyManager },
    PORTFOLIO_MANAGER: { key: 'PortfolioManager', addr: contracts.PortfolioManager },
    SWAP_ADAPTER: { key: 'SwapAdapter', addr: contracts.SwapAdapter },
    LIQUIDITY_MANAGER: { key: 'LiquidityManager', addr: contracts.LiquidityManager },
    FEE_MANAGER: { key: 'FeeManager', addr: contracts.FeeManager },
    COST_BASIS_MANAGER: { key: 'CostBasisManagerV2', addr: contracts.CostBasisManagerV2 },
    PERFORMANCE_MANAGER: { key: 'PerformanceManager', addr: contracts.PerformanceManager },
    P2P_ESCROW: { key: 'P2PEscrowV2', addr: contracts.P2PEscrowV2 },
  };

  for (const [idKey, exp] of Object.entries(expectedDirMap)) {
    try {
      const reg = await client.readContract({
        address: contracts.ProtocolDirectory,
        abi: directoryAbi,
        functionName: 'getAddress',
        args: [MODULE_IDS[idKey]],
      });
      const match = reg.toLowerCase() === exp.addr.toLowerCase();
      record('Directory Registry', `${idKey} (${exp.key})`, match, `${reg} === ${exp.addr}`);
    } catch (e) {
      record(
        'Directory Registry',
        `${idKey} (${exp.key})`,
        false,
        `Error: ${e.shortMessage || e.message}`,
      );
    }
  }

  // --- 1. UVBEV2 Index Token ---
  console.log('\n--- 1. UVBEV2 INDEX TOKEN METADATA & GENESIS SUPPLY ---');
  const erc20Abi = [
    {
      name: 'name',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'string' }],
      stateMutability: 'view',
    },
    {
      name: 'symbol',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'string' }],
      stateMutability: 'view',
    },
    {
      name: 'decimals',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'uint8' }],
      stateMutability: 'view',
    },
    {
      name: 'totalSupply',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      name: 'hasRole',
      type: 'function',
      inputs: [{ type: 'bytes32' }, { type: 'address' }],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view',
    },
    {
      name: 'costBasisManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
  ];

  const tName = await client.readContract({
    address: contracts.UVBEV2,
    abi: erc20Abi,
    functionName: 'name',
  });
  const tSymbol = await client.readContract({
    address: contracts.UVBEV2,
    abi: erc20Abi,
    functionName: 'symbol',
  });
  const tDecimals = await client.readContract({
    address: contracts.UVBEV2,
    abi: erc20Abi,
    functionName: 'decimals',
  });
  const tSupply = await client.readContract({
    address: contracts.UVBEV2,
    abi: erc20Abi,
    functionName: 'totalSupply',
  });

  record('UVBEV2 Token', 'Name', tName === 'UnifyVault BTC-ETH V2', `name = "${tName}"`);
  record('UVBEV2 Token', 'Symbol', tSymbol === 'UVBE', `symbol = "${tSymbol}"`);
  record('UVBEV2 Token', 'Decimals', tDecimals === 18, `decimals = ${tDecimals}`);
  record(
    'UVBEV2 Token',
    'Total Supply (Genesis == 0)',
    tSupply === 0n,
    `totalSupply = ${tSupply.toString()}`,
  );

  // --- 2. Genesis NAV ---
  console.log('\n--- 2. GENESIS NAV & PRICING ---');
  const pmAbi = [
    {
      name: 'calculateUVPrice',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'uint256' }, { type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      name: 'currentUVPrice',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      name: 'indexToken',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'custodyVault',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'oracleManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'strategyManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
  ];

  const [totalBacking, tokenPrice] = await client.readContract({
    address: contracts.PortfolioManager,
    abi: pmAbi,
    functionName: 'calculateUVPrice',
  });
  const currPrice = await client.readContract({
    address: contracts.PortfolioManager,
    abi: pmAbi,
    functionName: 'currentUVPrice',
  });

  record(
    'Genesis Pricing',
    'Total Backing USD',
    totalBacking === 0n,
    `$${formatEther(totalBacking)} USD`,
  );
  record(
    'Genesis Pricing',
    'calculateUVPrice() == $1.00',
    tokenPrice === 1000000000000000000n,
    `$${formatEther(tokenPrice)} USD`,
  );
  record(
    'Genesis Pricing',
    'currentUVPrice() == $1.00',
    currPrice === 1000000000000000000n,
    `$${formatEther(currPrice)} USD`,
  );

  // --- 3. Oracle Configuration & Live Prices ---
  console.log('\n--- 3. ORACLE FEEDS & LIVE PRICING ---');
  const omAbi = [
    {
      name: 'isPriceFresh',
      type: 'function',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view',
    },
    {
      name: 'getAssetPrice',
      type: 'function',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
  ];

  for (const [sym, addr] of Object.entries(assets)) {
    const isFresh = await client.readContract({
      address: contracts.OracleManager,
      abi: omAbi,
      functionName: 'isPriceFresh',
      args: [addr],
    });
    const price = await client.readContract({
      address: contracts.OracleManager,
      abi: omAbi,
      functionName: 'getAssetPrice',
      args: [addr],
    });
    record('Oracle Feeds', `${sym} Freshness`, isFresh, `isPriceFresh = ${isFresh}`);
    record(
      'Oracle Feeds',
      `${sym} Live Valuation`,
      price > 0n,
      `$${Number(formatEther(price)).toFixed(4)} USD`,
    );
  }

  // --- 4. Required Controller Roles ---
  console.log('\n--- 4. CONTROLLER ROLE DELEGATION ---');
  const roleTargets = [
    { name: 'CustodyVault', addr: contracts.CustodyVault },
    { name: 'Treasury', addr: contracts.Treasury },
    { name: 'LiquidityManager', addr: contracts.LiquidityManager },
    { name: 'UVBEV2', addr: contracts.UVBEV2 },
    { name: 'CostBasisManagerV2', addr: contracts.CostBasisManagerV2 },
  ];

  for (const target of roleTargets) {
    const has = await client.readContract({
      address: target.addr,
      abi: erc20Abi,
      functionName: 'hasRole',
      args: [CONTROLLER_ROLE, contracts.UnifyVaultController],
    });
    record(
      'Role Delegation',
      `${target.name} has CONTROLLER_ROLE`,
      has,
      `Controller = ${contracts.UnifyVaultController}`,
    );
  }

  // --- 5. Deployer Mint/Controller Revocation ---
  console.log('\n--- 5. DEPLOYER MINT REVOCATION ---');
  const deployerHasRole = await client.readContract({
    address: contracts.UVBEV2,
    abi: erc20Abi,
    functionName: 'hasRole',
    args: [CONTROLLER_ROLE, deployer],
  });
  record(
    'Security Revocation',
    'Deployer Mint Authority Revoked',
    !deployerHasRole,
    `Deployer has CONTROLLER_ROLE = ${deployerHasRole} (Expected: false)`,
  );

  // --- 6. PortfolioManager Module Synchronization ---
  console.log('\n--- 6. PORTFOLIO MANAGER MODULE SYNCHRONIZATION ---');
  const pmToken = await client.readContract({
    address: contracts.PortfolioManager,
    abi: pmAbi,
    functionName: 'indexToken',
  });
  const pmVault = await client.readContract({
    address: contracts.PortfolioManager,
    abi: pmAbi,
    functionName: 'custodyVault',
  });
  const pmOracle = await client.readContract({
    address: contracts.PortfolioManager,
    abi: pmAbi,
    functionName: 'oracleManager',
  });
  const pmStrategy = await client.readContract({
    address: contracts.PortfolioManager,
    abi: pmAbi,
    functionName: 'strategyManager',
  });

  record(
    'PortfolioManager Sync',
    'indexToken',
    pmToken.toLowerCase() === contracts.UVBEV2.toLowerCase(),
    `${pmToken} === ${contracts.UVBEV2}`,
  );
  record(
    'PortfolioManager Sync',
    'custodyVault',
    pmVault.toLowerCase() === contracts.CustodyVault.toLowerCase(),
    `${pmVault} === ${contracts.CustodyVault}`,
  );
  record(
    'PortfolioManager Sync',
    'oracleManager',
    pmOracle.toLowerCase() === contracts.OracleManager.toLowerCase(),
    `${pmOracle} === ${contracts.OracleManager}`,
  );
  record(
    'PortfolioManager Sync',
    'strategyManager',
    pmStrategy.toLowerCase() === contracts.StrategyManager.toLowerCase(),
    `${pmStrategy} === ${contracts.StrategyManager}`,
  );

  // --- 7. CustodyVault Asset Registrations ---
  console.log('\n--- 7. CUSTODY VAULT ASSET REGISTRATIONS ---');
  const vaultAbi = [
    {
      name: 'isSupported',
      type: 'function',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view',
    },
  ];
  for (const [sym, addr] of Object.entries(assets)) {
    const supported = await client.readContract({
      address: contracts.CustodyVault,
      abi: vaultAbi,
      functionName: 'isSupported',
      args: [addr],
    });
    record('CustodyVault Assets', `${sym} Supported`, supported, `isSupported = ${supported}`);
  }

  // --- 8. Treasury Asset Registrations ---
  console.log('\n--- 8. TREASURY ASSET REGISTRATIONS ---');
  const treasuryAbi = [
    {
      name: 'isSupported',
      type: 'function',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view',
    },
  ];
  for (const [sym, addr] of Object.entries(assets)) {
    const supported = await client.readContract({
      address: contracts.Treasury,
      abi: treasuryAbi,
      functionName: 'isSupported',
      args: [addr],
    });
    record('Treasury Assets', `${sym} Supported`, supported, `isSupported = ${supported}`);
  }

  // --- 9. SwapAdapter & StrategyManager ---
  console.log('\n--- 9. STRATEGY MANAGER ASSET WEIGHTS ---');
  const smAbi = [
    {
      name: 'getAssetWeight',
      type: 'function',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      name: 'getTargetWeights',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address[]' }, { type: 'uint256[]' }],
      stateMutability: 'view',
    },
  ];
  const cbbtcWeight = await client.readContract({
    address: contracts.StrategyManager,
    abi: smAbi,
    functionName: 'getAssetWeight',
    args: [assets.cbBTC],
  });
  const wethWeight = await client.readContract({
    address: contracts.StrategyManager,
    abi: smAbi,
    functionName: 'getAssetWeight',
    args: [assets.WETH],
  });

  record(
    'StrategyManager Weights',
    'cbBTC Weight BPS',
    cbbtcWeight === 6000n,
    `${cbbtcWeight} BPS (60.0%)`,
  );
  record(
    'StrategyManager Weights',
    'WETH Weight BPS',
    wethWeight === 4000n,
    `${wethWeight} BPS (40.0%)`,
  );

  // --- 10. P2PEscrowV2 Linkage ---
  console.log('\n--- 10. P2P ESCROW V2 LINKAGE ---');
  const cbmAbi = [
    {
      name: 'isEscrow',
      type: 'function',
      inputs: [{ type: 'address' }],
      outputs: [{ type: 'bool' }],
      stateMutability: 'view',
    },
    {
      name: 'indexToken',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'portfolioManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
  ];
  const isEscrowStatus = await client.readContract({
    address: contracts.CostBasisManagerV2,
    abi: cbmAbi,
    functionName: 'isEscrow',
    args: [contracts.P2PEscrowV2],
  });
  record(
    'P2PEscrowV2 Linkage',
    'Registered in CostBasisManagerV2',
    isEscrowStatus,
    `isEscrow = ${isEscrowStatus}`,
  );

  // --- 11. CostBasisManagerV2 Linkage ---
  console.log('\n--- 11. COST BASIS MANAGER V2 LINKAGE ---');
  const tokenCbm = await client.readContract({
    address: contracts.UVBEV2,
    abi: erc20Abi,
    functionName: 'costBasisManager',
  });
  const cbmToken = await client.readContract({
    address: contracts.CostBasisManagerV2,
    abi: cbmAbi,
    functionName: 'indexToken',
  });
  const cbmPm = await client.readContract({
    address: contracts.CostBasisManagerV2,
    abi: cbmAbi,
    functionName: 'portfolioManager',
  });

  record(
    'CostBasisManagerV2 Linkage',
    'UVBEV2 costBasisManager()',
    tokenCbm.toLowerCase() === contracts.CostBasisManagerV2.toLowerCase(),
    `${tokenCbm} === ${contracts.CostBasisManagerV2}`,
  );
  record(
    'CostBasisManagerV2 Linkage',
    'CBM indexToken()',
    cbmToken.toLowerCase() === contracts.UVBEV2.toLowerCase(),
    `${cbmToken} === ${contracts.UVBEV2}`,
  );
  record(
    'CostBasisManagerV2 Linkage',
    'CBM portfolioManager()',
    cbmPm.toLowerCase() === contracts.PortfolioManager.toLowerCase(),
    `${cbmPm} === ${contracts.PortfolioManager}`,
  );

  // --- 12. PerformanceManager Linkage ---
  console.log('\n--- 12. PERFORMANCE MANAGER LINKAGE ---');
  const perfAbi = [
    {
      name: 'indexToken',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'costBasisManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'portfolioManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
    {
      name: 'oracleManager',
      type: 'function',
      inputs: [],
      outputs: [{ type: 'address' }],
      stateMutability: 'view',
    },
  ];

  const perfToken = await client.readContract({
    address: contracts.PerformanceManager,
    abi: perfAbi,
    functionName: 'indexToken',
  });
  const perfCbm = await client.readContract({
    address: contracts.PerformanceManager,
    abi: perfAbi,
    functionName: 'costBasisManager',
  });
  const perfPm = await client.readContract({
    address: contracts.PerformanceManager,
    abi: perfAbi,
    functionName: 'portfolioManager',
  });
  const perfOm = await client.readContract({
    address: contracts.PerformanceManager,
    abi: perfAbi,
    functionName: 'oracleManager',
  });

  record(
    'PerformanceManager Linkage',
    'indexToken',
    perfToken.toLowerCase() === contracts.UVBEV2.toLowerCase(),
    `${perfToken} === ${contracts.UVBEV2}`,
  );
  record(
    'PerformanceManager Linkage',
    'costBasisManager',
    perfCbm.toLowerCase() === contracts.CostBasisManagerV2.toLowerCase(),
    `${perfCbm} === ${contracts.CostBasisManagerV2}`,
  );
  record(
    'PerformanceManager Linkage',
    'portfolioManager',
    perfPm.toLowerCase() === contracts.PortfolioManager.toLowerCase(),
    `${perfPm} === ${contracts.PortfolioManager}`,
  );
  record(
    'PerformanceManager Linkage',
    'oracleManager',
    perfOm.toLowerCase() === contracts.OracleManager.toLowerCase(),
    `${perfOm} === ${contracts.OracleManager}`,
  );

  console.log(
    '\n========================================================================================',
  );
  const passCount = results.filter((r) => r.status).length;
  const totalCount = results.length;
  console.log(
    `VALIDATION SUMMARY: ${passCount} / ${totalCount} CHECKS PASSED (${((passCount / totalCount) * 100).toFixed(1)}%)`,
  );
  console.log(
    '========================================================================================\n',
  );
}

main().catch(console.error);
