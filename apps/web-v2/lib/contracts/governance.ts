import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { DEPLOYED_CONTRACTS_SEPOLIA, MODULE_IDS } from '../../constants';

/**
 * Generates a collision-resistant deterministic salt with unique entropy
 * to ensure identical proposals can be independently scheduled without salt collision.
 * Uses cryptographically secure random values via globalThis.crypto.getRandomValues().
 */
export function generateTimelockSalt(entropyContext?: string): `0x${string}` {
  const timestamp = BigInt(Date.now());
  let randomEntropy: bigint;
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const buffer = new Uint8Array(8);
    globalThis.crypto.getRandomValues(buffer);
    const view = new DataView(buffer.buffer);
    randomEntropy = view.getBigUint64(0);
  } else {
    randomEntropy = BigInt(Math.floor(Math.random() * 1_000_000_000_000));
  }
  const context = entropyContext || 'UnifyVault-Timelock-Op';
  return keccak256(
    encodeAbiParameters(parseAbiParameters('string, uint256, uint256'), [
      context,
      timestamp,
      randomEntropy,
    ]),
  );
}

/**
 * Canonical Role Hashes matching packages/protocol/src/libraries/AccessRoles.sol
 * and OpenZeppelin TimelockController / AccessControl.
 */
export const DEFAULT_ADMIN_ROLE_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
export const GOVERNANCE_ROLE_HASH =
  '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1' as const;
export const GUARDIAN_ROLE_HASH =
  '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041' as const;
export const CONTROLLER_ROLE_HASH =
  '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357' as const;
export const BOT_ROLE_HASH =
  '0x6d5c9827c1f410bbb61d3b2a0a34b6b30492d9a1fd38588edca7ec4562ab9c9b' as const;
export const ARBITRATOR_ROLE_HASH =
  '0x16ceee8289685dd2a02b9c8ae81d2df373176ce53519e6284e2a2950d6546ffa' as const;
export const ORACLE_OPERATOR_ROLE_HASH =
  '0xf9b712ed3cd0e90cdc9d1abac8fb677bf018af115fb294c768a96b48bd6922c5' as const;

// OpenZeppelin TimelockController Roles
export const PROPOSER_ROLE_HASH =
  '0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1' as const;
export const EXECUTOR_ROLE_HASH =
  '0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63' as const;
export const CANCELLER_ROLE_HASH =
  '0xfd643c72710c63c0180259aba6b2d05451e3591a24e58b62239378085726f783' as const;

export interface RoleDefinition {
  id: `0x${string}`;
  name: string;
  description: string;
}

export const PROTOCOL_ROLES: RoleDefinition[] = [
  {
    id: DEFAULT_ADMIN_ROLE_HASH,
    name: 'DEFAULT_ADMIN_ROLE',
    description: 'Root administrative role with permission to grant/revoke administering roles.',
  },
  {
    id: GOVERNANCE_ROLE_HASH,
    name: 'GOVERNANCE_ROLE',
    description: 'Governance authority for directory mutation, protocol upgrades, and unpausing.',
  },
  {
    id: GUARDIAN_ROLE_HASH,
    name: 'GUARDIAN_ROLE',
    description: 'Emergency security role authorized to immediately pause protocol modules.',
  },
  {
    id: ARBITRATOR_ROLE_HASH,
    name: 'ARBITRATOR_ROLE',
    description: 'P2P escrow dispute resolution and adjudication authority.',
  },
  {
    id: BOT_ROLE_HASH,
    name: 'BOT_ROLE',
    description: 'Automated rebalancer / keeper execution permissions.',
  },
  {
    id: CONTROLLER_ROLE_HASH,
    name: 'CONTROLLER_ROLE',
    description:
      'UnifyVaultController internal authorization for minting, burning, and custody access.',
  },
  {
    id: PROPOSER_ROLE_HASH,
    name: 'PROPOSER_ROLE',
    description: 'Timelock proposer authority permitted to schedule delayed governance calls.',
  },
  {
    id: EXECUTOR_ROLE_HASH,
    name: 'EXECUTOR_ROLE',
    description: 'Timelock executor authority permitted to execute queued operations after delay.',
  },
  {
    id: CANCELLER_ROLE_HASH,
    name: 'CANCELLER_ROLE',
    description:
      'Timelock emergency cancellation authority permitted to cancel pending operations.',
  },
];

export interface ContractRoleCatalogEntry {
  name: string;
  address: `0x${string}`;
  category: 'Core' | 'Treasury' | 'Escrow' | 'Governance' | 'Staking' | 'Oracle';
  supportedRoles: {
    roleHash: `0x${string}`;
    name: string;
  }[];
  pausable: boolean;
  pauseFunction?: 'pause' | 'emergencyPause';
  unpauseFunction?: 'unpause' | 'resume';
}

export const DEPLOYED_ACCESS_CONTROL_CONTRACTS: ContractRoleCatalogEntry[] = [
  {
    name: 'ProtocolDirectory',
    address: DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory,
    category: 'Core',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
    ],
    pausable: false,
  },
  {
    name: 'UnifyVaultController',
    address: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController,
    category: 'Core',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
      { roleHash: BOT_ROLE_HASH, name: 'BOT_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'emergencyPause',
    unpauseFunction: 'resume',
  },
  {
    name: 'CustodyVault',
    address: DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault,
    category: 'Core',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
      { roleHash: CONTROLLER_ROLE_HASH, name: 'CONTROLLER_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'Treasury',
    address: DEPLOYED_CONTRACTS_SEPOLIA.Treasury,
    category: 'Treasury',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
      { roleHash: CONTROLLER_ROLE_HASH, name: 'CONTROLLER_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'UVBEToken',
    address: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
    category: 'Core',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
      { roleHash: CONTROLLER_ROLE_HASH, name: 'CONTROLLER_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'UnifyVaultTimelock',
    address: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultTimelock,
    category: 'Governance',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: PROPOSER_ROLE_HASH, name: 'PROPOSER_ROLE' },
      { roleHash: EXECUTOR_ROLE_HASH, name: 'EXECUTOR_ROLE' },
      { roleHash: CANCELLER_ROLE_HASH, name: 'CANCELLER_ROLE' },
    ],
    pausable: false,
  },
  {
    name: 'P2PEscrow',
    address: DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow,
    category: 'Escrow',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
      { roleHash: ARBITRATOR_ROLE_HASH, name: 'ARBITRATOR_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'Marketplace',
    address: DEPLOYED_CONTRACTS_SEPOLIA.Marketplace,
    category: 'Escrow',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'StakingVault',
    address: DEPLOYED_CONTRACTS_SEPOLIA.StakingVault,
    category: 'Staking',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'RewardDistributor',
    address: DEPLOYED_CONTRACTS_SEPOLIA.RewardDistributor,
    category: 'Staking',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: GOVERNANCE_ROLE_HASH, name: 'GOVERNANCE_ROLE' },
      { roleHash: GUARDIAN_ROLE_HASH, name: 'GUARDIAN_ROLE' },
    ],
    pausable: true,
    pauseFunction: 'pause',
    unpauseFunction: 'unpause',
  },
  {
    name: 'ReferralRegistry',
    address: DEPLOYED_CONTRACTS_SEPOLIA.ReferralRegistry,
    category: 'Staking',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'OracleManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.OracleManager,
    category: 'Oracle',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'ChainlinkOracleProvider',
    address: DEPLOYED_CONTRACTS_SEPOLIA.ChainlinkOracleProvider,
    category: 'Oracle',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'LiquidityManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager,
    category: 'Core',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'StrategyManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager,
    category: 'Core',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'PortfolioManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager,
    category: 'Core',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'SwapAdapter',
    address: DEPLOYED_CONTRACTS_SEPOLIA.SwapAdapter,
    category: 'Core',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'FeeManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.FeeManager,
    category: 'Treasury',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
  {
    name: 'CostBasisManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager,
    category: 'Treasury',
    supportedRoles: [
      { roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' },
      { roleHash: CONTROLLER_ROLE_HASH, name: 'CONTROLLER_ROLE' },
    ],
    pausable: false,
  },
  {
    name: 'PerformanceManager',
    address: DEPLOYED_CONTRACTS_SEPOLIA.PerformanceManager,
    category: 'Treasury',
    supportedRoles: [{ roleHash: DEFAULT_ADMIN_ROLE_HASH, name: 'DEFAULT_ADMIN_ROLE' }],
    pausable: false,
  },
];

export const DIRECTORY_MODULE_DEFINITIONS: {
  id: `0x${string}`;
  name: string;
  canonicalKey: keyof typeof MODULE_IDS;
  description: string;
  defaultAddress?: `0x${string}`;
}[] = [
  {
    id: MODULE_IDS.CONTROLLER,
    name: 'UnifyVaultController',
    canonicalKey: 'CONTROLLER',
    description: 'Core protocol coordinator for deposits, redemptions, and system accounting.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController,
  },
  {
    id: MODULE_IDS.VAULT,
    name: 'CustodyVault',
    canonicalKey: 'VAULT',
    description: 'Secured on-chain asset custody vault holding backing reserve tokens.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault,
  },
  {
    id: MODULE_IDS.TREASURY,
    name: 'Treasury',
    canonicalKey: 'TREASURY',
    description: 'Protocol treasury collecting fee yields and collateral reserves.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.Treasury,
  },
  {
    id: MODULE_IDS.TOKEN,
    name: 'IndexToken (UVBE)',
    canonicalKey: 'TOKEN',
    description: 'Canonical ERC20 vault share index token contract.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
  },
  {
    id: MODULE_IDS.ORACLE,
    name: 'OracleManager',
    canonicalKey: 'ORACLE',
    description: 'Primary price feed provider and oracle aggregation engine.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.OracleManager,
  },
  {
    id: MODULE_IDS.STRATEGY_MANAGER,
    name: 'StrategyManager',
    canonicalKey: 'STRATEGY_MANAGER',
    description: 'Asset weighting, portfolio strategy, and rebalance allocation manager.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager,
  },
  {
    id: MODULE_IDS.PORTFOLIO_MANAGER,
    name: 'PortfolioManager',
    canonicalKey: 'PORTFOLIO_MANAGER',
    description: 'Multi-asset valuation, NAV computation, and index pricing engine.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager,
  },
  {
    id: MODULE_IDS.SWAP_ADAPTER,
    name: 'SwapAdapter',
    canonicalKey: 'SWAP_ADAPTER',
    description: 'DEX routing and Uniswap V3 swap integration contract.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.SwapAdapter,
  },
  {
    id: MODULE_IDS.LIQUIDITY_MANAGER,
    name: 'LiquidityManager',
    canonicalKey: 'LIQUIDITY_MANAGER',
    description: 'Liquidity threshold and operational buffer management.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager,
  },
  {
    id: MODULE_IDS.FEE_MANAGER,
    name: 'FeeManager',
    canonicalKey: 'FEE_MANAGER',
    description: 'Deposit and redemption protocol fee calculation and configuration.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.FeeManager,
  },
  {
    id: MODULE_IDS.COST_BASIS_MANAGER,
    name: 'CostBasisManager',
    canonicalKey: 'COST_BASIS_MANAGER',
    description: 'User cost basis, FIFO tax-lot tracking, and performance metrics.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager,
  },
  {
    id: MODULE_IDS.PERFORMANCE_MANAGER,
    name: 'PerformanceManager',
    canonicalKey: 'PERFORMANCE_MANAGER',
    description: 'Historical performance calculations and index return accounting.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.PerformanceManager,
  },
  {
    id: MODULE_IDS.P2P_ESCROW,
    name: 'P2PEscrow',
    canonicalKey: 'P2P_ESCROW',
    description: 'Peer-to-peer fiat-to-crypto escrow settlement engine.',
    defaultAddress: DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow,
  },
];

/**
 * Full Protocol Directory ABI matching packages/protocol/src/ProtocolDirectory.sol
 */
export const FULL_PROTOCOL_DIRECTORY_ABI = [
  {
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'target', type: 'address' },
    ],
    name: 'registerAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'target', type: 'address' },
    ],
    name: 'updateAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'removeAddress',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'freeze',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'name', type: 'bytes32' }],
    name: 'getAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'name', type: 'bytes32' }],
    name: 'exists',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isFrozen',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'role', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'callerConfirmation', type: 'address' },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Custom Errors
  {
    type: 'error',
    name: 'RegistryIsFrozen',
    inputs: [],
  },
  {
    type: 'error',
    name: 'EntryAlreadyExists',
    inputs: [{ name: 'id', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'EntryDoesNotExist',
    inputs: [{ name: 'id', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'IdenticalAddressSubmitted',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AccessControlUnauthorizedAccount',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'neededRole', type: 'bytes32' },
    ],
  },
  {
    type: 'error',
    name: 'AccessControlBadConfirmation',
    inputs: [],
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'id', type: 'bytes32' },
      { indexed: true, name: 'target', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'AddressRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'id', type: 'bytes32' },
      { indexed: true, name: 'oldTarget', type: 'address' },
      { indexed: true, name: 'newTarget', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'AddressUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'id', type: 'bytes32' },
      { indexed: true, name: 'oldTarget', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'AddressRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'caller', type: 'address' }],
    name: 'RegistryFrozen',
    type: 'event',
  },
] as const;

/**
 * Full Timelock Controller ABI matching packages/protocol/src/governance/UnifyVaultTimelock.sol
 */
export const UNIFY_VAULT_TIMELOCK_ABI = [
  {
    inputs: [],
    name: 'getMinDelay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'TIMELOCK_DELAY',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PROPOSER_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'EXECUTOR_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'CANCELLER_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'predecessor', type: 'bytes32' },
      { name: 'salt', type: 'bytes32' },
      { name: 'delay', type: 'uint256' },
    ],
    name: 'schedule',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'payload', type: 'bytes' },
      { name: 'predecessor', type: 'bytes32' },
      { name: 'salt', type: 'bytes32' },
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'predecessor', type: 'bytes32' },
      { name: 'salt', type: 'bytes32' },
    ],
    name: 'hashOperation',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'isOperation',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'isOperationPending',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'isOperationReady',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'isOperationDone',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'getTimestamp',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'getOperationState',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'role', type: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Custom errors
  {
    type: 'error',
    name: 'TimelockInsufficientDelay',
    inputs: [
      { name: 'delay', type: 'uint256' },
      { name: 'minDelay', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'TimelockInvalidOperationLength',
    inputs: [
      { name: 'targets', type: 'uint256' },
      { name: 'payloads', type: 'uint256' },
      { name: 'values', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'TimelockUnauthorizedCaller',
    inputs: [{ name: 'caller', type: 'address' }],
  },
  {
    type: 'error',
    name: 'TimelockUnexecutedPredecessor',
    inputs: [{ name: 'predecessorId', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'TimelockUnexpectedOperationState',
    inputs: [
      { name: 'operationId', type: 'bytes32' },
      { name: 'expectedStates', type: 'bytes32' },
    ],
  },
  {
    type: 'error',
    name: 'AccessControlUnauthorizedAccount',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'neededRole', type: 'bytes32' },
    ],
  },
  {
    type: 'error',
    name: 'AccessControlBadConfirmation',
    inputs: [],
  },
] as const;

/**
 * Common Pausable Protocol Module ABI
 */
export const EMERGENCY_PAUSABLE_ABI = [
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'emergencyPause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'resume',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
