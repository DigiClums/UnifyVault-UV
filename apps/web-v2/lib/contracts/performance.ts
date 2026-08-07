export const PERFORMANCE_MANAGER_ABI = [
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
] as const;
