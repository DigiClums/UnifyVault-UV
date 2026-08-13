export const PORTFOLIO_MANAGER_ABI = [
  {
    type: 'function',
    name: 'calculatePortfolioValue',
    inputs: [],
    outputs: [{ name: 'totalPortfolioValueUSD', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalPortfolioValueUSD',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateUVPrice',
    inputs: [],
    outputs: [
      { name: 'totalPortfolioValueUSD', type: 'uint256', internalType: 'uint256' },
      { name: 'currentUVPrice', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateNAV',
    inputs: [],
    outputs: [
      { name: 'totalPortfolioValueUSD', type: 'uint256', internalType: 'uint256' },
      { name: 'navPerShare', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nav',
    inputs: [],
    outputs: [
      { name: 'totalValueUSD', type: 'uint256', internalType: 'uint256' },
      { name: 'navPerShare', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sharePrice',
    inputs: [],
    outputs: [{ name: 'pricePerShare', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'assetValueUSD',
    inputs: [{ name: 'asset', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'valueUSD', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allocation',
    inputs: [],
    outputs: [
      { name: 'targetAssets', type: 'address[]', internalType: 'address[]' },
      { name: 'weightsBps', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewDeposit',
    inputs: [
      { name: 'depositAsset', type: 'address', internalType: 'address' },
      { name: 'depositAmount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: 'preview',
        type: 'tuple',
        internalType: 'struct IPortfolioManager.DepositPreview',
        components: [
          { name: 'sharesToMint', type: 'uint256', internalType: 'uint256' },
          { name: 'depositValueUSD', type: 'uint256', internalType: 'uint256' },
          { name: 'targetAssets', type: 'address[]', internalType: 'address[]' },
          { name: 'allocationAmounts', type: 'uint256[]', internalType: 'uint256[]' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'previewRedeem',
    inputs: [
      { name: 'sharesToBurn', type: 'uint256', internalType: 'uint256' },
      { name: 'payoutAsset', type: 'address', internalType: 'address' },
    ],
    outputs: [
      {
        name: 'preview',
        type: 'tuple',
        internalType: 'struct IPortfolioManager.RedeemPreview',
        components: [
          { name: 'payoutAmount', type: 'uint256', internalType: 'uint256' },
          { name: 'userShareUSDValue', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;
