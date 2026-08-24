import { base, baseSepolia } from 'viem/chains';

/**
 * Base Chain Configuration for Mainnet and Testnet
 */
export const ACTIVE_CHAIN_NAME = process.env.NEXT_PUBLIC_ACTIVE_CHAIN || 'base-sepolia';

export const CHAIN_CONFIG = getDefaultChainId() === base.id ? base : baseSepolia;

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://app.unifyvault.xyz';

/**
 * Authoritative Fiat Settlement Currency for P2P UPI Payment Architecture
 */
export const DEFAULT_P2P_FIAT_CURRENCY = 'INR';

export function getDefaultChainId(): number {
  if (
    process.env.NEXT_PUBLIC_ACTIVE_CHAIN === 'base-sepolia' ||
    process.env.NEXT_PUBLIC_ACTIVE_CHAIN === '84532'
  ) {
    return baseSepolia.id;
  }
  return base.id;
}

export const RPC_URL = getRpcUrl();

export function getRpcUrl(chainId?: number): string {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === base.id) {
    return (
      process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET ||
      process.env.BASE_MAINNET_RPC_URL ||
      'https://mainnet.base.org'
    );
  }
  return (
    process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.BASE_SEPOLIA_RPC_URL ||
    'https://sepolia.base.org'
  );
}

export const DIRECTORY_ADDRESS_MAINNET = (
  isNonZeroAddress(process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET
    : isNonZeroAddress(process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS)
      ? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS
      : '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e'
) as `0x${string}`;

export const DIRECTORY_ADDRESS_SEPOLIA = (
  isNonZeroAddress(process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA
    : '0xd2715141a0f5998b707baa963990bfc2e94cf145'
) as `0x${string}`;

export function getProtocolDirectoryAddress(chainId?: number): `0x${string}` {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === baseSepolia.id) {
    return DIRECTORY_ADDRESS_SEPOLIA;
  }
  if (targetChain === base.id) {
    return DIRECTORY_ADDRESS_MAINNET;
  }
  return '0x0000000000000000000000000000000000000000';
}

export const PROTOCOL_DIRECTORY_ADDRESS = getProtocolDirectoryAddress();

export function isNonZeroAddress(addr?: string): boolean {
  if (!addr) return false;
  const clean = addr.trim().toLowerCase();
  return (
    clean !== '' &&
    clean !== '0x0000000000000000000000000000000000000000' &&
    clean !== '0x0' &&
    clean.startsWith('0x') &&
    clean.length === 42
  );
}

/**
 * Base Sepolia Deployed Contracts (Canonical V2 Protocol Deployment)
 */
export const DEPLOYED_CONTRACTS_SEPOLIA = {
  ProtocolDirectory: '0xe293143a52dc2555bf4f92ac9cbf11668bbfc01f' as `0x${string}`,
  Treasury: '0xe0764477914f8eb0fe90c7f27bca0ade1ee95316' as `0x${string}`,
  CustodyVault: '0x63856ae48d9b3e74b538a0d720b8d8a5e5f7eb64' as `0x${string}`,
  OracleManager: '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6' as `0x${string}`,
  ChainlinkOracleProvider: '0x80a1ea978e069b5af96398f97b125e502cf854ac' as `0x${string}`,
  LiquidityManager: (isNonZeroAddress(process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_LIQUIDITY_MANAGER_ADDRESS_SEPOLIA
    : '0xd225bffe0e4d905df0767c6271686497fea968a6') as `0x${string}`,
  UVBEToken: (isNonZeroAddress(process.env.NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA
    : '0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde') as `0x${string}`,
  UVBTCETHToken: (isNonZeroAddress(process.env.NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA
    : '0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde') as `0x${string}`,
  UnifyVaultController: (isNonZeroAddress(process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_SEPOLIA
    : '0x07f3d3432b64dbf67c5b061af2bc8aef70221cea') as `0x${string}`,
  UnifyVaultControllerImplementation: (isNonZeroAddress(
    process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_SEPOLIA,
  )
    ? process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_SEPOLIA
    : '0x07f3d3432b64dbf67c5b061af2bc8aef70221cea') as `0x${string}`,
  StrategyManager: (isNonZeroAddress(process.env.NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_STRATEGY_MANAGER_ADDRESS_SEPOLIA
    : '0x14058459198a2cffc8ce89c364334a80da82d6a3') as `0x${string}`,
  PortfolioManager: (isNonZeroAddress(process.env.NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS_SEPOLIA
    : '0x1c65b1667c8cc03138b8e57cdd40b0bf28a4cdc4') as `0x${string}`,
  SwapAdapter: '0x8deca9efb0bdc300aae96111bdf0dcd32651db90' as `0x${string}`,
  FeeManager: '0x48e2647d4f884c22def4cfd60b6bf95205cf2997' as `0x${string}`,
  CostBasisManager: '0xcc405c38ed50efc715afcebadc37c01da6838ddd' as `0x${string}`,
  PerformanceManager: '0x6f5fc63a6e404009beb02f722f5786739ea34535' as `0x${string}`,
  TimelockController: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  UnifyVaultTimelock: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  GnosisSafeProposer: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  P2PEscrow: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA
    : isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS)
      ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS
      : '0xcba65af8a993061cf1acc47d9b02d7ebacbcf655') as `0x${string}`,
  P2PReputation: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_REPUTATION_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_P2P_REPUTATION_ADDRESS_SEPOLIA
    : isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_REPUTATION_ADDRESS)
      ? process.env.NEXT_PUBLIC_P2P_REPUTATION_ADDRESS
      : '0x49460e2fF8c20ba96121C18e7D36Fd4aE293C70c') as `0x${string}`,
  Marketplace: (isNonZeroAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA
    : isNonZeroAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS)
      ? process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS
      : '0xe908377f96F313a6b7771570ff6Fb414D38F451A') as `0x${string}`,
  Paymaster: (isNonZeroAddress(process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS_SEPOLIA
    : isNonZeroAddress(process.env.PAYMASTER_ADDRESS)
      ? process.env.PAYMASTER_ADDRESS
      : '0x42c6342516714CFd64474bd41Ce360605b9fEA88') as `0x${string}`,
  GasTreasury: '0xd4b19a48c270b720feeed57ccab5aa4ecfcc1fd9' as `0x${string}`,
  EntryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`,
  Admin: (isNonZeroAddress(process.env.NEXT_PUBLIC_ADMIN_ADDRESS)
    ? process.env.NEXT_PUBLIC_ADMIN_ADDRESS
    : '0x441dbf8076d0b143EC17199baE94Daa884161454') as `0x${string}`,
  StakingVault: '0x91205D342D36d9b6F5A1AB38f2a2a3D03BFd74A1' as `0x${string}`,
  ReferralRegistry: '0xb409064857792a2AEF676f9cB69713685775f0D0' as `0x${string}`,
  RewardDistributor: '0xAe202A0627a194fa2D02cD861e19302d01F8ca81' as `0x${string}`,
  /** @deprecated Removed in dynamic staking architecture; retained for interface backward-compatibility */
  RewardReserve: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  GenesisReferrer: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
};

/**
 * Base Mainnet Deployed Contracts (Canonical Verified Architecture)
 */
export const DEPLOYED_CONTRACTS_MAINNET = {
  ProtocolDirectory: '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e' as `0x${string}`,
  Treasury: '0x57561F781b2f558A7445D2E93a365C03BA2c9B53' as `0x${string}`,
  CustodyVault: '0xbb35a3434c689942e0b7d58909eae0d2cc0769ca' as `0x${string}`,
  OracleManager: '0x91b488cde0f2ef28141fe4ffd8531c4179b48ea7' as `0x${string}`,
  UVBEToken: '0xd2715141a0f5998b707baa963990bfc2e94cf145' as `0x${string}`,
  UVBTCETHToken: '0xd2715141a0f5998b707baa963990bfc2e94cf145' as `0x${string}`,
  UnifyVaultController: (isNonZeroAddress(process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET
    : '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366') as `0x${string}`,
  UnifyVaultControllerImplementation: (isNonZeroAddress(
    process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET,
  )
    ? process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS_MAINNET
    : '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366') as `0x${string}`,
  CostBasisManager: '0x27b5c6dea90678b78856b0b10dba37a789fde97e' as `0x${string}`,
  LiquidityManager: '0x9af86a9ac1563b7fdbf43b19335348240a8c16d3' as `0x${string}`,
  StrategyManager: '0x4f7f99653d9d7acd462429fffc0c4b6c8cf4354a' as `0x${string}`,
  SwapAdapter: '0xaae7104a120e7c6e518a936fcbc102bcd0454b67' as `0x${string}`,
  PortfolioManager: '0x66182f56bd5e523c655f6890290ab519f528e83f' as `0x${string}`,
  PerformanceManager: '0x19ec1b685c2ced1400b4f249da6be89662e59473' as `0x${string}`,
  FeeManager: '0xa5b0a1c71f4ffa357ddf5f50cc5003ff69c87881' as `0x${string}`,
  ChainlinkOracleProvider: '0x5f75d0Fc1c45c0994dAb01BaAaD0Bdb64333d85E' as `0x${string}`,
  P2PEscrow: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET
    : '0xa938aacea64be8f41c90960aff232da4df7fc329') as `0x${string}`,
  Marketplace: (isNonZeroAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET
    : '0xabfe3034db275e32de396c7bdd1649a62ac9e5a6') as `0x${string}`,
  UnifyVaultTimelock: '0x610c5f66d99993d444561d270fba172db1f7cff1' as `0x${string}`,
  TimelockController: '0x610c5f66d99993d444561d270fba172db1f7cff1' as `0x${string}`,
  StakingVault: '0xd6d6b6297aa98126e9a2b7eaf64f6db19c86f571' as `0x${string}`,
  UVBEStakingVault: '0xd6d6b6297aa98126e9a2b7eaf64f6db19c86f571' as `0x${string}`,
  ReferralRegistry: '0x95618e4347a923a80565dcc7ab23b89ce9ec0b1e' as `0x${string}`,
  UVBEReferralRegistry: '0x95618e4347a923a80565dcc7ab23b89ce9ec0b1e' as `0x${string}`,
  RewardDistributor: '0xb911a7655d1edef73b45e29f9a0d4dfdd9ba60aa' as `0x${string}`,
  UVBERewardDistributor: '0xb911a7655d1edef73b45e29f9a0d4dfdd9ba60aa' as `0x${string}`,
  P2PReputation: '0xdab9e0b8caac7ba5dba9fd49ae782d049b5964c8' as `0x${string}`,
  Paymaster: '0xdf96b619934d17ae85142dcef1655a8d3b19040a' as `0x${string}`,
  UnifyVaultPaymaster: '0xdf96b619934d17ae85142dcef1655a8d3b19040a' as `0x${string}`,
  GasTreasury: '0x136a146af0f3c5f1d62caaea31a3bddaaf4e6424' as `0x${string}`,
  EntryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`,
  Admin: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
  GenesisReferrer: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
  StabilizerVault: '0xc268709ebb4d3f0f473c6c5767f60e540d330c11' as `0x${string}`,
};

export function getDeployedContracts(chainId?: number) {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === base.id) {
    return DEPLOYED_CONTRACTS_MAINNET;
  }
  return DEPLOYED_CONTRACTS_SEPOLIA;
}

// Safety Invariant Check: Base Mainnet Controller must strictly resolve to 0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366
export const CANONICAL_MAINNET_CONTROLLER = '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366' as const;
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
  [baseSepolia.id]: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cbBTC: '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29',
    WETH: '0xd116ab1c943cf15904eC4c8dd701086f175FA323',
    UVBE: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
    UVBTCETH: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
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
  [baseSepolia.id]: {
    BTC_USD: '0x5399D3574e0E7944F5b11d266dC2F6e4cC53C01F',
    ETH_USD: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
    USDC_USD: '0x598D6E603Ed84b46Ac310209960b9810583133Af',
  },
};

export function getChainTokens(chainId?: number) {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === base.id) {
    return TOKENS_BY_CHAIN[base.id];
  }
  if (targetChain === baseSepolia.id) {
    return TOKENS_BY_CHAIN[baseSepolia.id];
  }
  return {
    USDC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    cbBTC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    WETH: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  };
}

export function getChainFeeds(chainId?: number) {
  const targetChain = chainId || getDefaultChainId();
  return CHAINLINK_FEEDS_BY_CHAIN[targetChain] || CHAINLINK_FEEDS_BY_CHAIN[base.id];
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
