export const PROTOCOL_DIRECTORY_ABI = [
  {
    inputs: [{ name: 'moduleId', type: 'bytes32' }],
    name: 'getModuleAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const FEE_MANAGER_ABI = [
  {
    inputs: [],
    name: 'depositFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'redeemFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'newFeeBps', type: 'uint256' }],
    name: 'setDepositFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newFeeBps', type: 'uint256' }],
    name: 'setRedeemFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
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
  {
    inputs: [{ name: 'asset', type: 'address' }],
    name: 'getAssetWeight',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assets', type: 'address[]' },
      { name: 'weightsBps', type: 'uint256[]' },
    ],
    name: 'updateWeights',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
