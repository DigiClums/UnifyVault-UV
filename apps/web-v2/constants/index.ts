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
  '0xb5dd6d766867cb4c299ad2711068455c718eddbc') as `0x${string}`;

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
  ProtocolDirectory: '0xb5dd6d766867cb4c299ad2711068455c718eddbc' as `0x${string}`,
  Treasury: '0x0F51D2135cA7b6b5511bFD3B53EBEf50af01513D' as `0x${string}`,
  CustodyVault: '0x54696d5d00b58F27F9d8C358560ff2a7d10d409e' as `0x${string}`,
  OracleManager: '0xB636DD8F0faA46055fB4a0fafB1EEAD33eBa3635' as `0x${string}`,
  ChainlinkOracleProvider: '0xef27d89dcbe99f477f5d5d1bcf20c099be53b09d' as `0x${string}`,
  LiquidityManager: '0xf311e7bd0f5c438a11da188e26433996870d29ba' as `0x${string}`,
  UVBTCETHToken: '0x62c20Aa1e0272312BC100b4e23B4DC1Ed96dD7D1' as `0x${string}`,
  UnifyVaultController: '0x8B71b41D4dBEb2b6821d44692d3fACAAf77480Bb' as `0x${string}`,
  StrategyManager: '0x4C52a6277b1B84121b3072C0c92b6Be0b7CC10F1' as `0x${string}`,
  PortfolioManager: '0x978e3286EB805934215a88694d80b09aDed68D90' as `0x${string}`,
  SwapAdapter: '0xd21060559c9beb54fC07aFd6151aDf6cFCDDCAeB' as `0x${string}`,
  FeeManager: '0xBb2180ebd78ce97360503434eD37fcf4a1Df61c3' as `0x${string}`,
  CostBasisManager: '0xef0637a3d2080749bbcd5d98e6c68d9944c700a6' as `0x${string}`,
  TimelockController: '0xDEb1E9a6Be7Baf84208BB6E10aC9F9bbE1D70809' as `0x${string}`,
  UnifyVaultTimelock: '0xDEb1E9a6Be7Baf84208BB6E10aC9F9bbE1D70809' as `0x${string}`,
  GnosisSafeProposer: '0x1111111111111111111111111111111111111111' as `0x${string}`,
};

/**
 * Core ERC20 Tokens by Chain ID
 */
export const TOKENS_BY_CHAIN: Record<
  number,
  { USDC: `0x${string}`; cbBTC: `0x${string}`; WETH: `0x${string}` }
> = {
  [base.id]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  [baseSepolia.id]: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cbBTC: '0xc83D0A904E1103d8144E9DF93cdb5bC05f7cdee6',
    WETH: '0xEEAa69Db6046f026d88004d0D6946518071bA15c',
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
  CONTROLLER: '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
};

export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
export const GUARDIAN_ROLE =
  '0x5543555f475541524449414e5f524f4c45000000000000000000000000000000' as `0x${string}`;
export const TIMELOCK_ROLE =
  '0x5543555f54494d454c4f434b5f524f4c45000000000000000000000000000000' as `0x${string}`;
