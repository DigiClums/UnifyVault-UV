export const LIQUIDITY_MANAGER_ABI = [
  // --- View Functions ---
  {
    type: 'function',
    name: 'BPS_DENOMINATOR',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DEFAULT_OPERATIONAL_TARGET_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DEFAULT_REFILL_THRESHOLD_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DEFAULT_EXCESS_THRESHOLD_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'directory',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'custodyVault',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLiquidityBalances',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'operationalBalance', type: 'uint256' },
      { name: 'reserveBalance', type: 'uint256' },
      { name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getThresholds',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'operationalTargetBps', type: 'uint256' },
      { name: 'refillThresholdBps', type: 'uint256' },
      { name: 'excessThresholdBps', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'assessLiquidity',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'needsRefill', type: 'bool' },
      { name: 'needsSweep', type: 'bool' },
      { name: 'amount', type: 'uint256' },
      { name: 'targetOperationalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },

  // --- Mutating Functions ---
  {
    type: 'function',
    name: 'syncModules',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setThresholds',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'operationalTargetBps', type: 'uint256' },
      { name: 'refillThresholdBps', type: 'uint256' },
      { name: 'excessThresholdBps', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resetThresholds',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setLiquidityBalances',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'opBalance', type: 'uint256' },
      { name: 'resBalance', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'refillOperationalLiquidity',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'sweepReserveLiquidity',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordDeposit',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordWithdrawal',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'checkLiquidity',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'needsRefill', type: 'bool' },
      { name: 'needsSweep', type: 'bool' },
      { name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },

  // --- Events ---
  {
    type: 'event',
    name: 'RefillRequired',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'currentOperationalBalance', type: 'uint256' },
      { indexed: false, name: 'targetOperationalBalance', type: 'uint256' },
      { indexed: false, name: 'requiredRefillAmount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ReserveSweepRequired',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'currentOperationalBalance', type: 'uint256' },
      { indexed: false, name: 'targetOperationalBalance', type: 'uint256' },
      { indexed: false, name: 'excessSweepAmount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OperationalLiquidityRefilled',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newOperationalBalance', type: 'uint256' },
      { indexed: false, name: 'newReserveBalance', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'ReserveLiquiditySwept',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newOperationalBalance', type: 'uint256' },
      { indexed: false, name: 'newReserveBalance', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'ThresholdsConfigured',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'operationalTargetBps', type: 'uint256' },
      { indexed: false, name: 'refillThresholdBps', type: 'uint256' },
      { indexed: false, name: 'excessThresholdBps', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityBalancesSynced',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'operationalBalance', type: 'uint256' },
      { indexed: false, name: 'reserveBalance', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'VaultSynchronized',
    inputs: [{ indexed: true, name: 'vault', type: 'address' }],
  },

  // --- Custom Errors ---
  {
    type: 'error',
    name: 'ZeroAddressDetected',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAmountDetected',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidThresholdConfiguration',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientReserveBalance',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'requested', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientOperationalBalance',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'requested', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
  },
] as const;
