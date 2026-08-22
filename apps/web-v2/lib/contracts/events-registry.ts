/**
 * Protocol Events Registry
 *
 * Central registry mapping every protocol contract to its ABI and every event
 * signature to a human-readable action description. Used by the transaction
 * explorer to decode receipt logs from ALL protocol contracts in a single pass.
 *
 * Design: Build a runtime map of `contractAddress → { name, abi }` once the
 * ProtocolDirectory resolves. Feed every receipt log through the map to
 * decode it against the correct ABI.
 */

import type { Abi, Address } from 'viem';

// ─── Raw Event ABI Fragments ────────────────────────────────────────────────

const CONTROLLER_EVENT_ABIS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'depositAmount', type: 'uint256' },
      { indexed: false, name: 'fee', type: 'uint256' },
      { indexed: false, name: 'targetAssets', type: 'address[]' },
      { indexed: false, name: 'assetsBought', type: 'uint256[]' },
      { indexed: false, name: 'sharesMinted', type: 'uint256' },
      { indexed: false, name: 'navAfter', type: 'uint256' },
    ],
    name: 'DepositExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'receiver', type: 'address' },
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'grossDeposit', type: 'uint256' },
      { indexed: false, name: 'protocolFee', type: 'uint256' },
      { indexed: false, name: 'netDeposit', type: 'uint256' },
      { indexed: false, name: 'sharesMinted', type: 'uint256' },
    ],
    name: 'DepositCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'sharesBurned', type: 'uint256' },
      { indexed: false, name: 'targetAssets', type: 'address[]' },
      { indexed: false, name: 'assetsSold', type: 'uint256[]' },
      { indexed: false, name: 'fee', type: 'uint256' },
      { indexed: false, name: 'usdcReturned', type: 'uint256' },
      { indexed: false, name: 'navAfter', type: 'uint256' },
    ],
    name: 'RedeemExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'receiver', type: 'address' },
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'sharesBurned', type: 'uint256' },
      { indexed: false, name: 'grossAssets', type: 'uint256' },
      { indexed: false, name: 'protocolFee', type: 'uint256' },
      { indexed: false, name: 'netAssets', type: 'uint256' },
    ],
    name: 'RedeemCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'payer', type: 'address' },
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'feeAmount', type: 'uint256' },
    ],
    name: 'ProtocolFeeCollected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'caller', type: 'address' }],
    name: 'EmergencyPaused',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'caller', type: 'address' }],
    name: 'EmergencyResumed',
    type: 'event',
  },
] as const satisfies Abi;

const CUSTODY_VAULT_EVENT_ABIS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: true, name: 'from', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'DepositExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'WithdrawalExecuted',
    type: 'event',
  },
] as const satisfies Abi;

const TREASURY_EVENT_ABIS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: true, name: 'from', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'FeeCollected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'TreasuryWithdrawal',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
    name: 'NativeWithdrawn',
    type: 'event',
  },
] as const satisfies Abi;

const ERC20_EVENT_ABIS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
] as const satisfies Abi;

const STRATEGY_MANAGER_EVENT_ABIS = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'caller', type: 'address' },
      { indexed: false, name: 'assets', type: 'address[]' },
      { indexed: false, name: 'newWeights', type: 'uint256[]' },
    ],
    name: 'StrategyRebalanced',
    type: 'event',
  },
] as const satisfies Abi;

// ─── Registry Types ─────────────────────────────────────────────────────────

export interface ContractEventRegistry {
  name: string;
  abi: Abi;
}

export type ProtocolContractName =
  | 'UnifyVaultController'
  | 'CustodyVault'
  | 'Treasury'
  | 'UVBEToken'
  | 'UVBTCETHToken'
  | 'StrategyManager';

/**
 * Build a mapping from contract address to its event ABI and human-readable
 * name. Call this after the ProtocolDirectory resolves.
 */
export function buildAddressToABIMap(
  addresses: Partial<Record<ProtocolContractName, Address | undefined>>,
): Map<Address, ContractEventRegistry> {
  const map = new Map<Address, ContractEventRegistry>();
  const add = (addr: Address | undefined, name: string, abi: Abi) => {
    if (addr) map.set(addr.toLowerCase() as Address, { name, abi });
  };
  add(addresses.UnifyVaultController, 'UnifyVaultController', CONTROLLER_EVENT_ABIS as Abi);
  add(addresses.CustodyVault, 'CustodyVault', CUSTODY_VAULT_EVENT_ABIS as Abi);
  add(addresses.Treasury, 'Treasury', TREASURY_EVENT_ABIS as Abi);
  add(addresses.UVBEToken || addresses.UVBTCETHToken, 'UVBEToken', ERC20_EVENT_ABIS as Abi);
  if (addresses.UVBTCETHToken) {
    add(addresses.UVBTCETHToken, 'UVBTCETHToken', ERC20_EVENT_ABIS as Abi);
  }
  add(addresses.StrategyManager, 'StrategyManager', STRATEGY_MANAGER_EVENT_ABIS as Abi);

  // Known tokens (Base Mainnet & Sepolia)
  const tokens: [Address, string][] = [
    ['0x833589fCD6eDb6E08f4c7C32d4f71b54bdA02913', 'USDC'],
    ['0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'USDC'],
    ['0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', 'cbBTC'],
    ['0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29', 'cbBTC'],
    ['0x4200000000000000000000000000000000000006', 'WETH'],
    ['0xd116ab1c943cf15904ec4c8dd701086f175fa323', 'WETH'],
    ['0xd1716dbfadda94ab2b6f8b0a759d2cfeb26cec4c', 'UVBE'],
  ];
  for (const [addr, name] of tokens) {
    add(addr, name, ERC20_EVENT_ABIS as Abi);
  }

  return map;
}

// ─── Human-Readable Event Name Map ──────────────────────────────────────────

type EventSignature = string;

/**
 * Maps a decoded event name + contract combination to a user-facing label.
 * Key is `${contractName}:${eventName}`.
 */
export const EVENT_DISPLAY_NAMES: Record<EventSignature, string> = {
  'UnifyVaultController:DepositExecuted': 'Deposit Executed',
  'UnifyVaultController:DepositCompleted': 'Deposit Completed',
  'UnifyVaultController:RedeemExecuted': 'Redeem Executed',
  'UnifyVaultController:RedeemCompleted': 'Redeem Completed',
  'UnifyVaultController:ProtocolFeeCollected': 'Protocol Fee Collected',
  'UnifyVaultController:EmergencyPaused': 'Emergency Paused',
  'UnifyVaultController:EmergencyResumed': 'Emergency Resumed',
  'CustodyVault:DepositExecuted': 'Custody Deposit',
  'CustodyVault:WithdrawalExecuted': 'Custody Withdrawal',
  'Treasury:FeeCollected': 'Fee Sent To Treasury',
  'Treasury:TreasuryWithdrawal': 'Treasury Withdrawal',
  'Treasury:NativeWithdrawn': 'Native Withdrawn',
  'UVBEToken:Transfer': 'UVBE Token Transfer',
  'UVBEToken:Approval': 'UVBE Token Approval',
  'UVBTCETHToken:Transfer': 'UVBE Token Transfer',
  'UVBTCETHToken:Approval': 'UVBE Token Approval',
  'StrategyManager:StrategyRebalanced': 'Strategy Rebalanced',
};

export function getEventDisplayName(contractName: string, eventName: string): string {
  return EVENT_DISPLAY_NAMES[`${contractName}:${eventName}`] ?? `${eventName}`;
}

/**
 * Ordering priority for timeline sorting. Lower = appears first.
 */
export const EVENT_DISPLAY_ORDER: Record<EventSignature, number> = {
  'UVBEToken:Transfer': 1,
  'UVBEToken:Approval': 1,
  'UVBTCETHToken:Transfer': 1,
  'UVBTCETHToken:Approval': 1,
  'Treasury:FeeCollected': 2,
  'CustodyVault:DepositExecuted': 4,
  'CustodyVault:WithdrawalExecuted': 4,
  'UnifyVaultController:DepositExecuted': 10,
  'UnifyVaultController:DepositCompleted': 10,
  'UnifyVaultController:RedeemExecuted': 10,
  'UnifyVaultController:RedeemCompleted': 10,
  'UnifyVaultController:ProtocolFeeCollected': 3,
  'UnifyVaultController:EmergencyPaused': 5,
  'UnifyVaultController:EmergencyResumed': 5,
  'Treasury:TreasuryWithdrawal': 4,
  'Treasury:NativeWithdrawn': 4,
  'StrategyManager:StrategyRebalanced': 5,
};

// ─── Action Type Detection ──────────────────────────────────────────────────

export type ProtocolActionType =
  'deposit' | 'redeem' | 'fee' | 'admin' | 'wallet_transfer' | 'unknown';

export function classifyTransaction(eventNames: string[]): ProtocolActionType {
  for (const name of eventNames) {
    if (name === 'DepositExecuted' || name === 'DepositCompleted') return 'deposit';
    if (name === 'RedeemExecuted' || name === 'RedeemCompleted') return 'redeem';
    if (name === 'ProtocolFeeCollected' || name === 'FeeCollected') return 'fee';
    if (name === 'EmergencyPaused' || name === 'EmergencyResumed' || name === 'StrategyRebalanced')
      return 'admin';
  }

  if (eventNames.includes('Transfer')) {
    return 'wallet_transfer';
  }

  return 'unknown';
}
