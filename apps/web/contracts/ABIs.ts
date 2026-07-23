// SPDX-License-Identifier: MIT

export const PROTOCOL_DIRECTORY_ABI = [
  {
    inputs: [{ name: 'id', type: 'bytes32' }],
    name: 'getAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const CONTROLLER_ABI = [
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    name: 'deposit',
    outputs: [
      {
        components: [
          { name: 'grossDeposit', type: 'uint256' },
          { name: 'protocolFee', type: 'uint256' },
          { name: 'netDeposit', type: 'uint256' },
          { name: 'sharesPreview', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'shares', type: 'uint256' },
      { name: 'minAssetsOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'redeem',
    outputs: [{ name: 'netAssets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    name: 'getDepositQuote',
    outputs: [
      {
        components: [
          { name: 'grossDeposit', type: 'uint256' },
          { name: 'protocolFee', type: 'uint256' },
          { name: 'netDeposit', type: 'uint256' },
          { name: 'sharesPreview', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'shares', type: 'uint256' },
    ],
    name: 'previewRedeem',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const PORTFOLIO_MANAGER_ABI = [
  {
    inputs: [],
    name: 'calculateNAV',
    outputs: [
      { name: 'totalPortfolioValueUSD', type: 'uint256' },
      { name: 'navPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'calculatePortfolioValue',
    outputs: [{ name: 'totalPortfolioValueUSD', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const STRATEGY_MANAGER_ABI = [
  {
    inputs: [],
    name: 'getTargetWeights',
    outputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'weightsBps', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const CUSTODY_VAULT_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'totalAssets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const LIQUIDITY_MANAGER_ABI = [
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'checkLiquidity',
    outputs: [
      { name: 'needsRefill', type: 'bool' },
      { name: 'needsSweep', type: 'bool' },
      { name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'getLiquidityBalances',
    outputs: [
      { name: 'operationalBalance', type: 'uint256' },
      { name: 'reserveBalance', type: 'uint256' },
      { name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
