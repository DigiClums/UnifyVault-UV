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
  '0xd2715141a0f5998b707baa963990bfc2e94cf145') as `0x${string}`;

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
 * Base Sepolia Deployed Contracts (Canonical V2 Protocol Deployment)
 */
export const DEPLOYED_CONTRACTS_SEPOLIA = {
  ProtocolDirectory: '0xD2715141a0F5998B707BaA963990bFC2E94cF145' as `0x${string}`,
  Treasury: '0x66182F56BD5E523c655f6890290aB519f528e83f' as `0x${string}`,
  CustodyVault: '0x27B5C6DEA90678B78856b0B10DBA37A789fDe97e' as `0x${string}`,
  OracleManager: '0x5B6067982C6ccE2DC760EB4731c1b40136776D4A' as `0x${string}`,
  ChainlinkOracleProvider: '0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a' as `0x${string}`,
  LiquidityManager: '0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329' as `0x${string}`,
  UVBEToken: '0xA3Db7c3DeE9A50D966A06e19b5DF4FCDee615BdE' as `0x${string}`,
  UVBTCETHToken: '0xA3Db7c3DeE9A50D966A06e19b5DF4FCDee615BdE' as `0x${string}`,
  UnifyVaultController: '0x07f3D3432B64DBF67c5b061AF2bC8Aef70221Cea' as `0x${string}`,
  UnifyVaultControllerImplementation: '0x07f3D3432B64DBF67c5b061AF2bC8Aef70221Cea' as `0x${string}`,
  StrategyManager: '0x14058459198a2CfFc8cE89C364334a80Da82D6a3' as `0x${string}`,
  PortfolioManager: '0x1C65B1667c8cC03138b8e57cDd40b0Bf28a4cDc4' as `0x${string}`,
  SwapAdapter: '0xCb1a434c5ebe2F2F8672Ca507Ee819C6888ae634' as `0x${string}`,
  FeeManager: '0x0721465B01b586B7AAdF957A4a884acE46CfbEc9' as `0x${string}`,
  CostBasisManager: '0xF71706A2Fd8692e3C739855B2A33C0E679b4c382' as `0x${string}`,
  PerformanceManager: '0x133fD024EA635694A223e66B936c2afAB4F2DB78' as `0x${string}`,
  TimelockController: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  UnifyVaultTimelock: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02' as `0x${string}`,
  GnosisSafeProposer: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  P2PEscrow: (isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA)
    ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA
    : isNonZeroAddress(process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS)
      ? process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS
      : '0xbAc9C1b440adf74688abBD5be950ABd2766E5B7b') as `0x${string}`,
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
  StakingVault: '0x59F60d3D9EE0e253fEDACa2A2435A0F6aCBEBE4E' as `0x${string}`,
  ReferralRegistry: '0x183dBEe157fD7f275e95634A3B3781B50d95cdf7' as `0x${string}`,
  RewardDistributor: '0xF902dC96D6aB062f2cE529dFD6501ae79CFDBF56' as `0x${string}`,
  /** @deprecated Removed in dynamic staking architecture; retained for interface backward-compatibility */
  RewardReserve: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  GenesisReferrer: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
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
