/**
 * Authoritative ABI for PerformanceManager on Base Sepolia
 * Derived directly from packages/protocol/src/treasury/PerformanceManager.sol and IPerformanceManager.sol
 */
export const PERFORMANCE_MANAGER_ABI = [
  // --- View Calculation Functions ---
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'currentValue',
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'investedCapital',
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'netProfit',
    outputs: [{ name: '', type: 'int256', internalType: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'roi',
    outputs: [{ name: '', type: 'int256', internalType: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'performance',
    outputs: [
      {
        name: 'perf',
        type: 'tuple',
        internalType: 'struct IPerformanceManager.Performance',
        components: [
          { name: 'currentValueUSD', type: 'uint256', internalType: 'uint256' },
          { name: 'investedCapitalUSD', type: 'uint256', internalType: 'uint256' },
          { name: 'realizedPnL', type: 'int256', internalType: 'int256' },
          { name: 'unrealizedPnL', type: 'int256', internalType: 'int256' },
          { name: 'netPnL', type: 'int256', internalType: 'int256' },
          { name: 'roiBps', type: 'int256', internalType: 'int256' },
          { name: 'holdingPeriod', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'costBasisManager',
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
    name: 'oracleManager',
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
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
    name: 'directory',
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
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

  // --- Mutating Governance Functions ---
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
      { name: 'cbm', type: 'address', internalType: 'address' },
      { name: 'om', type: 'address', internalType: 'address' },
      { name: 'token', type: 'address', internalType: 'address' },
    ],
    name: 'setModules',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'portfolioManager', type: 'address', internalType: 'address' },
      { indexed: true, name: 'costBasisManager', type: 'address', internalType: 'address' },
      { indexed: true, name: 'oracleManager', type: 'address', internalType: 'address' },
      { indexed: false, name: 'indexToken', type: 'address', internalType: 'address' },
    ],
    name: 'ModulesSynchronized',
    type: 'event',
  },

  // --- Custom Errors ---
  {
    inputs: [],
    name: 'ZeroAddressDetected',
    type: 'error',
  },
] as const;
