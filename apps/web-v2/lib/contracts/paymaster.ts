import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

/**
 * Full ABI for UnifyVaultPaymaster matching packages/protocol/src/aa/UnifyVaultPaymaster.sol
 */
export const UNIFY_VAULT_PAYMASTER_ABI = [
  // --- View & State Functions ---
  {
    inputs: [],
    name: 'entryPoint',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'EXECUTE_SELECTOR',
    outputs: [{ name: '', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'EXECUTE_BATCH_SELECTOR',
    outputs: [{ name: '', type: 'bytes4' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'verifyingSigner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxCostPerUserOp',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxFeePerGasCap',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'userOpCooldown',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'requireSigner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPaused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'target', type: 'address' }],
    name: 'approvedTargets',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'selector', type: 'bytes4' },
    ],
    name: 'approvedSelectors',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'sender', type: 'address' }],
    name: 'lastSponsoredTimestamp',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDeposit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'accountGasLimits', type: 'bytes32' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'gasFees', type: 'bytes32' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' },
        ],
        name: 'userOp',
        type: 'tuple',
      },
      { name: 'validUntil', type: 'uint48' },
      { name: 'validAfter', type: 'uint48' },
    ],
    name: 'getHash',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },

  // --- Configuration & Policy Admin (onlyOwner) ---
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovedTarget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'selector', type: 'bytes4' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovedSelector',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newSigner', type: 'address' }],
    name: 'setVerifyingSigner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_maxCostPerUserOp', type: 'uint256' },
      { name: '_maxFeePerGasCap', type: 'uint256' },
      { name: '_userOpCooldown', type: 'uint256' },
      { name: '_requireSigner', type: 'bool' },
    ],
    name: 'setPolicyConfig',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'paused', type: 'bool' }],
    name: 'setPaused',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- Gas Deposit & Stake Management ---
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'destination', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'withdrawTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'unstakeDelaySec', type: 'uint32' }],
    name: 'addStake',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unlockStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'destination', type: 'address' }],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'target', type: 'address' },
      { indexed: false, name: 'approved', type: 'bool' },
    ],
    name: 'TargetApprovalUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'target', type: 'address' },
      { indexed: true, name: 'selector', type: 'bytes4' },
      { indexed: false, name: 'approved', type: 'bool' },
    ],
    name: 'SelectorApprovalUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'oldSigner', type: 'address' },
      { indexed: true, name: 'newSigner', type: 'address' },
    ],
    name: 'SignerUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'maxCost', type: 'uint256' },
      { indexed: false, name: 'maxFeeCap', type: 'uint256' },
      { indexed: false, name: 'cooldown', type: 'uint256' },
      { indexed: false, name: 'requireSigner', type: 'bool' },
    ],
    name: 'PolicyConfigUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'userOpHash', type: 'bytes32' },
      { indexed: false, name: 'actualGasCost', type: 'uint256' },
      { indexed: false, name: 'success', type: 'bool' },
    ],
    name: 'UserOperationSponsored',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'GasWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: 'paused', type: 'bool' }],
    name: 'EmergencyPaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'previousOwner', type: 'address' },
      { indexed: true, name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },

  // --- Custom Errors ---
  {
    type: 'error',
    name: 'OnlyEntryPoint',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PaymasterPaused',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MaxCostExceeded',
    inputs: [
      { name: 'requested', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'GasFeeCapExceeded',
    inputs: [
      { name: 'requested', type: 'uint256' },
      { name: 'cap', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'SenderCooldownActive',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'retryAfter', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidTarget',
    inputs: [{ name: 'target', type: 'address' }],
  },
  {
    type: 'error',
    name: 'InvalidSelector',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'selector', type: 'bytes4' },
    ],
  },
  {
    type: 'error',
    name: 'NativeValueForbidden',
    inputs: [{ name: 'value', type: 'uint256' }],
  },
  {
    type: 'error',
    name: 'InvalidBatchLengths',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ExactApprovalViolation',
    inputs: [
      { name: 'approved', type: 'uint256' },
      { name: 'deposited', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidSigner',
    inputs: [
      { name: 'recovered', type: 'address' },
      { name: 'expected', type: 'address' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidSignatureLength',
    inputs: [{ name: 'length', type: 'uint256' }],
  },
  {
    type: 'error',
    name: 'SignatureExpired',
    inputs: [
      { name: 'validUntil', type: 'uint48' },
      { name: 'currentTimestamp', type: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'SignatureNotYetValid',
    inputs: [
      { name: 'validAfter', type: 'uint48' },
      { name: 'currentTimestamp', type: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'VerifyingSignerRequired',
    inputs: [],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address' }],
  },
] as const;

/**
 * Full ABI for GasTreasury matching packages/protocol/src/aa/GasTreasury.sol
 */
export const GAS_TREASURY_ABI = [
  // --- View & State Functions ---
  {
    inputs: [],
    name: 'refillOperator',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paymaster',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxRefillPerTx',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'dailyRefillLimit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currentDayRefillTotal',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'currentDayWindowStart',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isPaused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'minThreshold', type: 'uint256' }],
    name: 'checkPaymasterNeedsRefill',
    outputs: [
      { name: '', type: 'bool' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // --- Operations (onlyOperatorOrOwner) ---
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'refillPaymaster',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- Admin Configuration (onlyOwner) ---
  {
    inputs: [{ name: '_newOperator', type: 'address' }],
    name: 'setRefillOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_newPaymaster', type: 'address' }],
    name: 'setPaymaster',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_maxRefillPerTx', type: 'uint256' },
      { name: '_dailyRefillLimit', type: 'uint256' },
    ],
    name: 'setLimits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_paused', type: 'bool' }],
    name: 'setPaused',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    name: 'withdrawEmergency',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'paymaster', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newDailyTotal', type: 'uint256' },
    ],
    name: 'PaymasterRefilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'oldOperator', type: 'address' },
      { indexed: true, name: 'newOperator', type: 'address' },
    ],
    name: 'RefillOperatorUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'oldPaymaster', type: 'address' },
      { indexed: true, name: 'newPaymaster', type: 'address' },
    ],
    name: 'PaymasterAddressUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'maxPerTx', type: 'uint256' },
      { indexed: false, name: 'dailyLimit', type: 'uint256' },
    ],
    name: 'LimitsUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'EmergencyFundsWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: 'paused', type: 'bool' }],
    name: 'EmergencyPaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'previousOwner', type: 'address' },
      { indexed: true, name: 'newOwner', type: 'address' },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },

  // --- Custom Errors ---
  {
    type: 'error',
    name: 'OnlyOperatorOrOwner',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TreasuryPaused',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidPaymaster',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ExceedsMaxRefillPerTx',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'ExceedsDailyRefillLimit',
    inputs: [
      { name: 'requested', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InsufficientTreasuryBalance',
    inputs: [
      { name: 'requested', type: 'uint256' },
      { name: 'available', type: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [{ name: 'account', type: 'address' }],
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [{ name: 'owner', type: 'address' }],
  },
] as const;

/**
 * Minimal ABI for EntryPoint v0.7 gas deposit and balance inspection
 */
export const ENTRYPOINT_V07_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'getDepositInfo',
    outputs: [
      {
        components: [
          { name: 'deposit', type: 'uint256' },
          { name: 'staked', type: 'bool' },
          { name: 'stake', type: 'uint112' },
          { name: 'unstakeDelaySec', type: 'uint32' },
          { name: 'withdrawTime', type: 'uint48' },
        ],
        name: 'info',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'depositTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'withdrawAddress', type: 'address' },
      { name: 'withdrawAmount', type: 'uint256' },
    ],
    name: 'withdrawTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Standard Known Targets and Selectors for UnifyVault Paymaster Sponsorship Policy
 */
export interface KnownTargetDefinition {
  name: string;
  address: `0x${string}`;
  category: 'Token' | 'Core' | 'Escrow' | 'Staking' | 'Treasury';
  knownSelectors: {
    name: string;
    selector: `0x${string}`;
    signature: string;
  }[];
}

export const KNOWN_SPONSORSHIP_TARGETS: KnownTargetDefinition[] = [
  {
    name: 'USDC (Base Sepolia)',
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    category: 'Token',
    knownSelectors: [
      {
        name: 'approve',
        selector: '0x095ea7b3',
        signature: 'approve(address,uint256)',
      },
      {
        name: 'transfer',
        selector: '0xa9059cbb',
        signature: 'transfer(address,uint256)',
      },
    ],
  },
  {
    name: 'UnifyVaultController',
    address: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController,
    category: 'Core',
    knownSelectors: [
      {
        name: 'deposit',
        selector: '0x8b6099db',
        signature: 'deposit(address,uint256,uint256,address)',
      },
      {
        name: 'redeem',
        selector: '0xba8c738e',
        signature: 'redeem(address,uint256,uint256,address,uint256)',
      },
    ],
  },
  {
    name: 'UVBEToken',
    address: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
    category: 'Token',
    knownSelectors: [
      {
        name: 'transfer',
        selector: '0xa9059cbb',
        signature: 'transfer(address,uint256)',
      },
      {
        name: 'approve',
        selector: '0x095ea7b3',
        signature: 'approve(address,uint256)',
      },
    ],
  },
  {
    name: 'P2PEscrow',
    address: DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow,
    category: 'Escrow',
    knownSelectors: [
      {
        name: 'createTrade',
        selector: '0x409543e0',
        signature: 'createTrade((address,address,address,uint256,uint256,bytes32,uint256))',
      },
      {
        name: 'fundTrade',
        selector: '0xebf2a7db',
        signature: 'fundTrade(uint256)',
      },
      {
        name: 'submitPayment',
        selector: '0x643194a2',
        signature: 'submitPayment(uint256,bytes32,bytes32)',
      },
      {
        name: 'confirmAndRelease',
        selector: '0xbda76019',
        signature: 'confirmAndRelease(uint256)',
      },
      {
        name: 'refund',
        selector: '0x590e0e08',
        signature: 'refund(uint256)',
      },
      {
        name: 'cancelUnfundedTrade',
        selector: '0xd097566d',
        signature: 'cancelUnfundedTrade(uint256)',
      },
      {
        name: 'raiseDispute',
        selector: '0xd7739502',
        signature: 'raiseDispute(uint256,bytes32)',
      },
    ],
  },
];
