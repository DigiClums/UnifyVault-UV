export const COST_BASIS_MANAGER_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'costBasis',
    outputs: [
      { name: 'investedAssets', type: 'uint256' },
      { name: 'sharesOwned', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'investedAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'sharesOwned',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const COST_BASIS_ABI = COST_BASIS_MANAGER_ABI;
