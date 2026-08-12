import { base, baseSepolia } from 'viem/chains';

/**
 * Base Chain Configuration for Mainnet and Testnet
 */
export const ACTIVE_CHAIN_NAME = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'base-sepolia';

export const CHAIN_CONFIG = getDefaultChainId() === base.id ? base : baseSepolia;

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://app.unifyvault.xyz';

export function getDefaultChainId(): number {
  if (
    process.env.NEXT_PUBLIC_ACTIVE_CHAIN === 'base' ||
    process.env.NEXT_PUBLIC_ACTIVE_CHAIN === '8453'
  ) {
    return base.id;
  }
  return baseSepolia.id;
}

export const RPC_URL = getRpcUrl();

export function getRpcUrl(chainId?: number): string {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === base.id) {
    return process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET || 'https://mainnet.base.org';
  }
  return (
    process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    'https://sepolia.base.org'
  );
}

export const DIRECTORY_ADDRESS_MAINNET = (process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET ||
  process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS ||
  '0x7EF5D93f83995228efFc63dbe513367a719f0633') as `0x${string}`;

export const DIRECTORY_ADDRESS_SEPOLIA = (process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA ||
  '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D') as `0x${string}`;

export function getProtocolDirectoryAddress(chainId?: number): `0x${string}` {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === baseSepolia.id) {
    return DIRECTORY_ADDRESS_SEPOLIA;
  }
  return DIRECTORY_ADDRESS_MAINNET;
}

export const PROTOCOL_DIRECTORY_ADDRESS = getProtocolDirectoryAddress();

/**
 * Base Sepolia Deployed Contracts (V2 Protocol Deployment)
 */
export const DEPLOYED_CONTRACTS_SEPOLIA = {
  ProtocolDirectory: '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D' as `0x${string}`,
  Treasury: '0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6' as `0x${string}`,
  CustodyVault: '0xa9284887B8670890F675386dA85877c34b40EE44' as `0x${string}`,
  OracleManager: '0x375e023eBDc2866c6c8AF6Ac6394Ed16197d266F' as `0x${string}`,
  ChainlinkOracleProvider: '0x8e4b6759fF62Bd6C819803aABF056Cef64Bc0F89' as `0x${string}`,
  LiquidityManager: '0xd0542D47176f2869F034e43Efca2C2d540d1fFD3' as `0x${string}`,
  UVBTCETHToken: '0x4A33d001D7F81C12c0C9262256Af83000e64457D' as `0x${string}`,
  UnifyVaultController: '0x9499Ad93fa257D4d20925FDc4B6D6F6b2b565Bc2' as `0x${string}`,
  StrategyManager: '0x50DA43Ebf007d7580140871ACF81e5FBAEF5E958' as `0x${string}`,
  PortfolioManager: '0x68c969b758e682B67e99a1ed2CC5753Ff1B2635E' as `0x${string}`,
  SwapAdapter: '0xa0164433c94b68522201e3DcbFDDC391B36c45f3' as `0x${string}`,
  FeeManager: '0xea8e047Fa4981935419B2065095e031b6224AC76' as `0x${string}`,
  CostBasisManager: '0x15dd90413BF9379E6B1D50eED34771094f067765' as `0x${string}`,
  PerformanceManager: '0x83984555065c95E160a1d6e8e35C43C0BBc3d58F' as `0x${string}`,
  TimelockController: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  UnifyVaultTimelock: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  GnosisSafeProposer: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  P2PEscrow: (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS ||
    '0x6B0F46E4dF7Db5a09B98673fcd7af7E708332A44') as `0x${string}`,
  Marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
    '0x62C6d71C79244036647970dEEA8D76e6900fB975') as `0x${string}`,
};

/**
 * Core ERC20 Tokens by Chain ID
 */
export const TOKENS_BY_CHAIN: Record<
  number,
  { USDC: `0x${string}`; cbBTC: `0x${string}`; WETH: `0x${string}`; UVBTCETH?: `0x${string}` }
> = {
  [base.id]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  [baseSepolia.id]: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cbBTC: '0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29',
    WETH: '0xd116ab1c943cf15904ec4c8dd701086f175fa323',
    UVBTCETH: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
  },
};

export function getChainTokens(chainId?: number) {
  const targetChain = chainId || getDefaultChainId();
  if (TOKENS_BY_CHAIN[targetChain]) {
    return TOKENS_BY_CHAIN[targetChain];
  }
  return TOKENS_BY_CHAIN[baseSepolia.id];
}

export function getExplorerBaseUrl(chainId?: number): string {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === base.id) return 'https://basescan.org';
  return 'https://sepolia.basescan.org';
}

/**
 * Standard Protocol Module Keys (bytes32 keccak256 identifiers)
 */
export const MODULE_IDS = {
  ORACLE: '0x2e30c16253629c211949dfd3fde5e2a3de47827f45371d8ef81f41a881d12a04' as `0x${string}`,
  VAULT: '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640' as `0x${string}`,
  TREASURY: '0x6efca2866b731ee4984990bacad4cde10f1ef764fb54a5206bdfd291695b1a9b' as `0x${string}`,
  TOKEN: '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8' as `0x${string}`,
  STRATEGY_MANAGER:
    '0x58b399e3748bdc2a6973276bd201243421cffba73d1ebdad6acf1b65eb6935e5' as `0x${string}`,
  PORTFOLIO_MANAGER:
    '0x3c40c670348eca8b03e7650189aa991cc9d77fcbee961381c2354fae1a3e2188' as `0x${string}`,
  SWAP_ADAPTER:
    '0xb38cc8783565eb75ee1b8d4c76a41d2179385de2efafcf6315528396e14ed8f2' as `0x${string}`,
  LIQUIDITY_MANAGER:
    '0x6878742ff510854cb02c186504af5267007c4a6d33f490fc28ec83e83e1458e1' as `0x${string}`,
  FEE_MANAGER:
    '0x42e3570c507db8e472a4592e53f4b6df78eb7c8a8d593e718bb47b707f2c6a90' as `0x${string}`,
  COST_BASIS_MANAGER:
    '0xd4741fb770f259864462ac1e0f0c516cde3c7a9a37aa2882da996c82ffff9796' as `0x${string}`,
  PERFORMANCE_MANAGER:
    '0x3cc6e30a00fc20cd55b209638eb88a197234ab24baed9e238b01e2c52159a815' as `0x${string}`,
  CONTROLLER: '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
  P2P_ESCROW: '0x4d5e9ec2ddae603ed61a153eeaa5905d914ec7a7a505e83ea647904cf72d8a57' as `0x${string}`,
};

export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
export const GUARDIAN_ROLE =
  '0x5543555f475541524449414e5f524f4c45000000000000000000000000000000' as `0x${string}`;
export const TIMELOCK_ROLE =
  '0x5543555f54494d454c4f434b5f524f4c45000000000000000000000000000000' as `0x${string}`;
