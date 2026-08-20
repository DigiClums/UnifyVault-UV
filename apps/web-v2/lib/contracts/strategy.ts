export const STRATEGY_MANAGER_ABI = [
  // --- View Functions ---
  {
    type: 'function',
    name: 'TOTAL_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSupportedAssets',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAssetWeight',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTargetWeights',
    inputs: [],
    outputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'weightsBps', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalAllocationBps',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isSupportedAsset',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAssetCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
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
    name: 'setStrategy',
    inputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'weightsBps', type: 'uint256[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'addAsset',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'weightBps', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeAsset',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateWeights',
    inputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'weightsBps', type: 'uint256[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // --- Events ---
  {
    type: 'event',
    name: 'StrategyRebalanced',
    inputs: [
      { indexed: true, name: 'caller', type: 'address' },
      { indexed: false, name: 'assets', type: 'address[]' },
      { indexed: false, name: 'newWeights', type: 'uint256[]' },
    ],
  },
  {
    type: 'event',
    name: 'StrategyUpdated',
    inputs: [
      { indexed: false, name: 'assets', type: 'address[]' },
      { indexed: false, name: 'weightsBps', type: 'uint256[]' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'AssetAdded',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'weightBps', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'AssetRemoved',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'WeightUpdated',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'oldWeight', type: 'uint256' },
      { indexed: false, name: 'newWeight', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },

  // --- Custom Errors ---
  {
    type: 'error',
    name: 'ZeroAddressDetected',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroWeightNotAllowed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AssetAlreadySupported',
    inputs: [{ name: 'asset', type: 'address' }],
  },
  {
    type: 'error',
    name: 'AssetNotSupportedByStrategy',
    inputs: [{ name: 'asset', type: 'address' }],
  },
  {
    type: 'error',
    name: 'EmptyStrategyNotAllowed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidTotalAllocation',
    inputs: [
      { name: 'total', type: 'uint256' },
      { name: 'expected', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'ArrayLengthMismatch',
    inputs: [],
  },
] as const;
