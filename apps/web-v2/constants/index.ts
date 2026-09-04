import { base, baseSepolia } from 'viem/chains';

/**
 * Base Chain Configuration for Mainnet
 */
export const ACTIVE_CHAIN_NAME = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'base';

export const CHAIN_CONFIG = base;

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://app.unifyvault.xyz';

/**
 * Authoritative Fiat Settlement Currency for P2P UPI Payment Architecture
 */
export const DEFAULT_P2P_FIAT_CURRENCY = 'INR';

export function getDefaultChainId(): number {
  return base.id;
}

export const RPC_URL = getRpcUrl();

export function getRpcUrl(chainId?: number): string {
  return (
    process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET ||
    process.env.BASE_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    'https://mainnet.base.org'
  );
}

export const DIRECTORY_ADDRESS_MAINNET = (
  isNonZeroAddress(process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET
    : isNonZeroAddress(process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS)
      ? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS
      : '0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5'
) as `0x${string}`;

/**
 * @deprecated Legacy testnet alias, redirected to Mainnet directory
 */
export const DIRECTORY_ADDRESS_SEPOLIA = DIRECTORY_ADDRESS_MAINNET;

export function getProtocolDirectoryAddress(chainId?: number): `0x${string}` {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === base.id) {
    return DIRECTORY_ADDRESS_MAINNET;
  }
  return DIRECTORY_ADDRESS_MAINNET;
}

export const PROTOCOL_DIRECTORY_ADDRESS = getProtocolDirectoryAddress();

export function isNonZeroAddress(addr?: string): boolean {
  if (!addr) return false;
  const clean = addr.trim().toLowerCase();
  return (
    clean !== '' &&
    clean !== '0x0000000000000000000000000000000000000000' &&
    clean.length === 42 &&
    clean.startsWith('0x')
  );
}

/**
 * Base Mainnet Deployed Contracts (Canonical Verified Architecture)
 */
export const DEPLOYED_CONTRACTS_MAINNET = {
  ProtocolDirectory: '0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5' as `0x${string}`,
  OracleManager: '0xdbab63fe1d8accff6620214a5c616d4151a8fec7' as `0x${string}`,
  ChainlinkOracleProvider: '0x39af66781d16ec8a72d2b1a4a1b7697a577626a2' as `0x${string}`,
  Treasury: '0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9' as `0x${string}`,
  FeeManager: '0x76c8a1ab608403cd974ec7598b01ec88b44320d3' as `0x${string}`,
  CustodyVault: '0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c' as `0x${string}`,
  LiquidityManager: '0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919' as `0x${string}`,
  UVBEV2: '0x051979deb1eb4823672e6274a55c44d7818ff523' as `0x${string}`,
  UVBEToken: '0x051979deb1eb4823672e6274a55c44d7818ff523' as `0x${string}`,
  UVBTCETHToken: '0x051979deb1eb4823672e6274a55c44d7818ff523' as `0x${string}`,
  SwapAdapter: '0x9560361d964ebfeea402e75ad3b74fad4d8057be' as `0x${string}`,
  StrategyManager: '0x8c196a631531ac3a9754016db1d7b873ebbdb6e9' as `0x${string}`,
  PortfolioManager: '0xce97c16a1c544f1df87e46695f86c7cc61ea486a' as `0x${string}`,
  UnifyVaultController: (isNonZeroAddress(process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET
    : '0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c') as `0x${string}`,
  UnifyVaultControllerImplementation: (isNonZeroAddress(
    process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET,
  )
    ? process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET
    : '0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c') as `0x${string}`,
  CostBasisManager: '0x3fcf09b4e1545926c1031d22a302a39e552b3469' as `0x${string}`,
  CostBasisManagerV2: '0x3fcf09b4e1545926c1031d22a302a39e552b3469' as `0x${string}`,
  P2PEscrow: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET
    : '0x400916339033b88cda38b1d8a5fb0f82e4889f38') as `0x${string}`,
  P2PEscrowV2: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET
    : '0x400916339033b88cda38b1d8a5fb0f82e4889f38') as `0x${string}`,
  PerformanceManager: '0x3e13aae6c9befaaec11b2247e2af678ce871f338' as `0x${string}`,
  Marketplace: (isNonZeroAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET
    : '0x6e3be632747e161a0b017cb35243d39eb90d0d8a') as `0x${string}`,
  UnifyVaultTimelock: '0x610c5f66d99993d444561d270fba172db1f7cff1' as `0x${string}`,
  TimelockController: '0x610c5f66d99993d444561d270fba172db1f7cff1' as `0x${string}`,
  StakingVault: '0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee' as `0x${string}`,
  UVBEStakingVault: '0x91744fa47837474c7e9d9d532c7fd8a2fe04c5ee' as `0x${string}`,
  ReferralRegistry: '0x6a94ee7b0a89ad1b9488b0d29bf99294f5e236d9' as `0x${string}`,
  UVBEReferralRegistry: '0x6a94ee7b0a89ad1b9488b0d29bf99294f5e236d9' as `0x${string}`,
  RewardDistributor: '0xd3c7073f5a2d98e1f80590b84dd628fcfd6fdbc3' as `0x${string}`,
  UVBERewardDistributor: '0xd3c7073f5a2d98e1f80590b84dd628fcfd6fdbc3' as `0x${string}`,
  P2PReputation: '0x7a4093316955baa5bcb8189c4522d9db31f42d41' as `0x${string}`,
  Paymaster: '0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9' as `0x${string}`,
  UnifyVaultPaymaster: '0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9' as `0x${string}`,
  GasTreasury: '0x166477b1eb662dd553287d32af958436cad20c17' as `0x${string}`,
  EntryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`,
  Admin: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
  GenesisReferrer: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
  StabilizerVault: '0xc268709ebb4d3f0f473c6c5767f60e540d330c11' as `0x${string}`,
};

export function getDeployedContracts(chainId?: number) {
  return DEPLOYED_CONTRACTS_MAINNET;
}

/**
 * @deprecated Legacy testnet alias, redirected to Mainnet
 */
export const DEPLOYED_CONTRACTS_SEPOLIA = DEPLOYED_CONTRACTS_MAINNET;

// Safety Invariant Check: Base Mainnet Controller must strictly resolve to 0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c
export const CANONICAL_MAINNET_CONTROLLER = '0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c' as const;
if (
  typeof window !== 'undefined' &&
  DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController.toLowerCase() !==
    CANONICAL_MAINNET_CONTROLLER.toLowerCase()
) {
  console.warn(
    `[SAFETY INVARIANT] Base Mainnet Controller address mismatch: expected ${CANONICAL_MAINNET_CONTROLLER}, received ${DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController}`,
  );
}

/**
 * Core ERC20 Tokens by Chain ID
 */
export const TOKENS_BY_CHAIN: Record<
  number,
  {
    USDC: `0x${string}`;
    cbBTC: `0x${string}`;
    WETH: `0x${string}`;
    UVBE?: `0x${string}`;
    UVBTCETH?: `0x${string}`;
  }
> = {
  [base.id]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    WETH: '0x4200000000000000000000000000000000000006',
    UVBE: DEPLOYED_CONTRACTS_MAINNET.UVBEToken,
    UVBTCETH: DEPLOYED_CONTRACTS_MAINNET.UVBEToken,
  },
};

/**
 * Canonical Chainlink Price Feed Proxies by Chain ID
 */
export const CHAINLINK_FEEDS_BY_CHAIN: Record<
  number,
  {
    BTC_USD: `0x${string}`;
    ETH_USD: `0x${string}`;
    USDC_USD: `0x${string}`;
  }
> = {
  [base.id]: {
    BTC_USD: '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F',
    ETH_USD: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
    USDC_USD: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
  },
};

export function getChainTokens(chainId?: number) {
  return TOKENS_BY_CHAIN[base.id];
}

export function getChainFeeds(chainId?: number) {
  return CHAINLINK_FEEDS_BY_CHAIN[base.id];
}

export function getExplorerBaseUrl(chainId?: number): string {
  return 'https://basescan.org';
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
  DEPOSIT_MANAGER:
    '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
  REDEEM_MANAGER:
    '0xe803baf6f12e8c3726dae7c58f60b9acc928d735b12c65a16c742fdabbca8623' as `0x${string}`,
  P2P_ESCROW: '0x4178f90dd1606e324454877b14154a3125c2f92df55a76df76af86093a797663' as `0x${string}`,
};

/**
 * Canonical Role Hashes matching packages/protocol/src/libraries/AccessRoles.sol
 */
export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
export const GOVERNANCE_ROLE =
  '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1' as `0x${string}`;
export const GUARDIAN_ROLE =
  '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041' as `0x${string}`;
export const CONTROLLER_ROLE =
  '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357' as `0x${string}`;
export const ARBITRATOR_ROLE =
  '0x16ceee8289685dd2a02b9c8ae81d2df373176ce53519e6284e2a2950d6546ffa' as `0x${string}`;
export const BOT_ROLE =
  '0x6d5c9827c1f410bbb61d3b2a0a34b6b30492d9a1fd38588edca7ec4562ab9c9b' as `0x${string}`;
export const TIMELOCK_ROLE =
  '0x5543555f54494d454c4f434b5f524f4c45000000000000000000000000000000' as `0x${string}`;
