export const COST_BASIS_MANAGER_ABI = [
  {
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    name: 'costBasis',
    outputs: [{ name: 'costBasisUSD', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    name: 'investedAssets',
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
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
] as const;

export const COST_BASIS_ABI = COST_BASIS_MANAGER_ABI;
