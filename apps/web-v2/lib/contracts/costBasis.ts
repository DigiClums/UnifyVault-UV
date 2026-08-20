import { parseAbi } from 'viem';

/**
 * Authoritative ABI for CostBasisManagerV2 on Base Sepolia
 * Derived directly from packages/protocol/src/treasury/CostBasisManagerV2.sol and ICostBasisManagerV2.sol
 */
export const COST_BASIS_MANAGER_V2_ABI = [
  // --- View Calculation Functions ---
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'costBasis',
    outputs: [{ name: 'costBasisUSD', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'averageEntryPrice',
    outputs: [{ name: 'entryPriceUSD', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'realizedPnL',
    outputs: [{ name: 'pnlUSD', type: 'int256', internalType: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'unrealizedPnL',
    outputs: [{ name: 'pnlUSD', type: 'int256', internalType: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'firstDepositTimestamp',
    outputs: [{ name: 'timestamp', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'isEscrow',
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'indexToken',
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'portfolioManager',
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'directory',
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'CONTROLLER_ROLE',
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32', internalType: 'bytes32' },
      { name: 'account', type: 'address', internalType: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'role', type: 'bytes32', internalType: 'bytes32' }],
    name: 'getRoleAdmin',
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Backward compatibility alias view (deprecated in V2)
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'portfolioPerformance',
    outputs: [
      { name: 'costBasisUSD', type: 'uint256', internalType: 'uint256' },
      { name: 'currentValueUSD', type: 'uint256', internalType: 'uint256' },
      { name: 'pnlUSD', type: 'int256', internalType: 'int256' },
      { name: 'pnlBps', type: 'int256', internalType: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // --- Mutating Governance & Admin Functions ---
  {
    inputs: [
      { name: 'escrowAddress', type: 'address', internalType: 'address' },
      { name: 'status', type: 'bool', internalType: 'bool' },
    ],
    name: 'setEscrowStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address', internalType: 'address' },
      { name: 'costBasisUSD', type: 'uint256', internalType: 'uint256' },
      { name: 'realizedPnLUSD', type: 'int256', internalType: 'int256' },
      { name: 'initialFirstDepositTimestamp', type: 'uint256', internalType: 'uint256' },
    ],
    name: 'migrateAccounting',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'syncModules',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'pm', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    name: 'setModules',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32', internalType: 'bytes32' },
      { name: 'account', type: 'address', internalType: 'address' },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32', internalType: 'bytes32' },
      { name: 'account', type: 'address', internalType: 'address' },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address', internalType: 'address' },
      { indexed: false, name: 'costBasisUSD', type: 'uint256', internalType: 'uint256' },
      { indexed: false, name: 'sharesBalance', type: 'uint256', internalType: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256', internalType: 'uint256' },
    ],
    name: 'CostBasisUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address', internalType: 'address' },
      { indexed: false, name: 'realizedPnLUSD', type: 'int256', internalType: 'int256' },
      { indexed: false, name: 'sharesBurned', type: 'uint256', internalType: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256', internalType: 'uint256' },
    ],
    name: 'RealizedPnLRecorded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address', internalType: 'address' },
      { indexed: false, name: 'costBasisUSD', type: 'uint256', internalType: 'uint256' },
      { indexed: false, name: 'realizedPnLUSD', type: 'int256', internalType: 'int256' },
      { indexed: false, name: 'firstDepositTimestamp', type: 'uint256', internalType: 'uint256' },
    ],
    name: 'AccountingMigrated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'escrow', type: 'address', internalType: 'address' },
      { indexed: false, name: 'status', type: 'bool', internalType: 'bool' },
    ],
    name: 'EscrowStatusUpdated',
    type: 'event',
  },

  // --- Custom Errors ---
  {
    inputs: [],
    name: 'ZeroAddressDetected',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroAmountDetected',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InsufficientShares',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyDetected',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UnauthorizedCaller',
    type: 'error',
  },
] as const;

export const COST_BASIS_MANAGER_ABI = COST_BASIS_MANAGER_V2_ABI;
export const COST_BASIS_ABI = COST_BASIS_MANAGER_V2_ABI;
