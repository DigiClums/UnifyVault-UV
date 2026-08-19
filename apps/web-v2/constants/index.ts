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

export const DIRECTORY_ADDRESS_MAINNET = (process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET ||
  process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS ||
  '0x7EF5D93f83995228efFc63dbe513367a719f0633') as `0x${string}`;

export const DIRECTORY_ADDRESS_SEPOLIA = (process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_SEPOLIA ||
  '0x8040006d6907a84911aaC0a9aC08278311B156e2') as `0x${string}`;

export function getProtocolDirectoryAddress(chainId?: number): `0x${string}` {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === baseSepolia.id) {
    return DIRECTORY_ADDRESS_SEPOLIA;
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
    clean !== '0x0' &&
    clean.startsWith('0x') &&
    clean.length === 42
  );
}

/**
 * Base Sepolia Deployed Contracts (Fresh V2 Protocol Deployment)
 */
export const DEPLOYED_CONTRACTS_SEPOLIA = {
  ProtocolDirectory: '0x8040006d6907a84911aaC0a9aC08278311B156e2' as `0x${string}`,
  Treasury: '0xB8c8113a042f39936dD966A5983fAaE2bF7b7290' as `0x${string}`,
  CustodyVault: '0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0' as `0x${string}`,
  OracleManager: '0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF' as `0x${string}`,
  ChainlinkOracleProvider: '0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B' as `0x${string}`,
  LiquidityManager: '0xd1DCd311ACD1176E35823360652FCb356a7F227F' as `0x${string}`,
  UVBEToken: '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as `0x${string}`,
  UVBTCETHToken: '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as `0x${string}`,
  UnifyVaultController: '0x7DC190a0bFa08c9596DfdC20E602821619E776ea' as `0x${string}`,
  UnifyVaultControllerImplementation: '0x717e39A34e81A81b75B78Ff7abFfaE4822f42415' as `0x${string}`,
  StrategyManager: '0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb' as `0x${string}`,
  PortfolioManager: '0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b' as `0x${string}`,
  SwapAdapter: '0xbc97337dE85654aCD96182C93841f21168da65B4' as `0x${string}`,
  FeeManager: '0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1' as `0x${string}`,
  CostBasisManager: '0x57869372AFbd7b61752f2f8d3e7F37701e28517B' as `0x${string}`,
  PerformanceManager: '0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6' as `0x${string}`,
  TimelockController: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  UnifyVaultTimelock: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  GnosisSafeProposer: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  P2PEscrow: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA
    : isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS)
      ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS
      : '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb') as `0x${string}`,
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
    : '0xd905920c91853039060246Ed5724AA72B91a96DA') as `0x${string}`,
  StakingVault: '0x59F60d3D9EE0e253fEDACa2A2435A0F6aCBEBE4E' as `0x${string}`,
  ReferralRegistry: '0x183dBEe157fD7f275e95634A3B3781B50d95cdf7' as `0x${string}`,
  RewardDistributor: '0xF902dC96D6aB062f2cE529dFD6501ae79CFDBF56' as `0x${string}`,
  RewardReserve: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Deprecated / removed in dynamic architecture
  GenesisReferrer: '0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1' as `0x${string}`,
};

/**
 * Base Mainnet Deployed Contracts
 */
export const DEPLOYED_CONTRACTS_MAINNET = {
  P2PEscrow: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET
    : isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS)
      ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS
      : '0x0000000000000000000000000000000000000000') as `0x${string}`,
  Marketplace: (isNonZeroAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET)
    ? process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET
    : isNonZeroAddress(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS)
      ? process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS
      : '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

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
  },
  [baseSepolia.id]: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cbBTC: '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29',
    WETH: '0xd116ab1c943cf15904eC4c8dd701086f175FA323',
    UVBE: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
    UVBTCETH: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
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
  DEPOSIT_MANAGER:
    '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af' as `0x${string}`,
  REDEEM_MANAGER:
    '0xe803baf6f12e8c3726dae7c58f60b9acc928d735b12c65a16c742fdabbca8623' as `0x${string}`,
  P2P_ESCROW: '0x4d5e9ec2ddae603ed61a153eeaa5905d914ec7a7a505e83ea647904cf72d8a57' as `0x${string}`,
};

export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
export const GUARDIAN_ROLE =
  '0x5543555f475541524449414e5f524f4c45000000000000000000000000000000' as `0x${string}`;
export const TIMELOCK_ROLE =
  '0x5543555f54494d454c4f434b5f524f4c45000000000000000000000000000000' as `0x${string}`;
