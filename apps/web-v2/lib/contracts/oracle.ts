export const ORACLE_MANAGER_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'getAssetPrice',
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'isPriceFresh',
    outputs: [{ name: 'isFresh', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    name: 'isHealthy',
    outputs: [{ name: 'healthy', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
