export const P2P_ESCROW_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'buyer', type: 'address' },
          { name: 'seller', type: 'address' },
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fiatAmount', type: 'uint256' },
          { name: 'fiatCurrency', type: 'bytes32' },
          { name: 'paymentWindow', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'createTrade',
    outputs: [{ name: 'tradeId', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'fundTrade',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'paymentReference', type: 'bytes32' },
      { name: 'evidenceHash', type: 'bytes32' },
    ],
    name: 'submitPayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'confirmAndRelease',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'cancelUnfundedTrade',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'reasonHash', type: 'bytes32' },
    ],
    name: 'raiseDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'outcome', type: 'uint8' },
    ],
    name: 'resolveDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'getTrade',
    outputs: [
      {
        components: [
          { name: 'tradeId', type: 'uint256' },
          { name: 'buyer', type: 'address' },
          { name: 'seller', type: 'address' },
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fiatAmount', type: 'uint256' },
          { name: 'fiatCurrency', type: 'bytes32' },
          { name: 'state', type: 'uint8' },
          { name: 'paymentWindow', type: 'uint256' },
          { name: 'fundingTimestamp', type: 'uint256' },
          { name: 'paymentTimestamp', type: 'uint256' },
          { name: 'paymentReference', type: 'bytes32' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'disputeInitiator', type: 'address' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalTrades',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'evidenceHash', type: 'bytes32' }],
    name: 'isEvidenceHashUsed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'newFeeBps', type: 'uint256' }],
    name: 'setFeeConfig',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newTreasury', type: 'address' }],
    name: 'setTreasury',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    name: 'hasRole',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'paymentReference', type: 'bytes32' }],
    name: 'isPaymentReferenceUsed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'asset', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'fiatAmount', type: 'uint256' },
      { indexed: false, name: 'fiatCurrency', type: 'bytes32' },
      { indexed: false, name: 'paymentWindow', type: 'uint256' },
    ],
    name: 'TradeCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'fundingTimestamp', type: 'uint256' },
    ],
    name: 'EscrowFunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'paymentReference', type: 'bytes32' },
      { indexed: false, name: 'evidenceHash', type: 'bytes32' },
      { indexed: false, name: 'paymentTimestamp', type: 'uint256' },
    ],
    name: 'PaymentSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'netPayout', type: 'uint256' },
      { indexed: false, name: 'feeCollected', type: 'uint256' },
    ],
    name: 'EscrowReleased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'refundAmount', type: 'uint256' },
    ],
    name: 'EscrowRefunded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'initiator', type: 'address' },
      { indexed: false, name: 'reasonHash', type: 'bytes32' },
    ],
    name: 'DisputeRaised',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'resolver', type: 'address' },
      { indexed: false, name: 'outcome', type: 'uint8' },
      { indexed: false, name: 'payoutAmount', type: 'uint256' },
    ],
    name: 'DisputeResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'actor', type: 'address' },
    ],
    name: 'TradeCancelled',
    type: 'event',
  },
  {
    inputs: [],
    name: 'InvalidTradeParty',
    type: 'error',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'currentState', type: 'uint8' },
      { name: 'expectedState', type: 'uint8' },
    ],
    name: 'InvalidTradeState',
    type: 'error',
  },
  {
    inputs: [{ name: 'evidenceHash', type: 'bytes32' }],
    name: 'EvidenceHashAlreadyUsed',
    type: 'error',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'currentTimestamp', type: 'uint256' },
    ],
    name: 'TradePaymentWindowExpired',
    type: 'error',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'currentTimestamp', type: 'uint256' },
    ],
    name: 'TradePaymentWindowActive',
    type: 'error',
  },
  {
    inputs: [{ name: 'caller', type: 'address' }],
    name: 'UnauthorizedDisputeResolver',
    type: 'error',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'TradeDoesNotExist',
    type: 'error',
  },
  {
    inputs: [{ name: 'paymentReference', type: 'bytes32' }],
    name: 'PaymentReferenceAlreadyUsed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidEvidenceHash',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidPaymentReference',
    type: 'error',
  },
  {
    inputs: [
      { name: 'provided', type: 'uint256' },
      { name: 'minimum', type: 'uint256' },
    ],
    name: 'MinimumPaymentWindowNotMet',
    type: 'error',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'TradeAlreadyFunded',
    type: 'error',
  },
  {
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    name: 'TradeNotFunded',
    type: 'error',
  },
  {
    inputs: [
      { name: 'feeBps', type: 'uint256' },
      { name: 'maxBps', type: 'uint256' },
    ],
    name: 'FeeExceedsMaximum',
    type: 'error',
  },
  {
    inputs: [
      { name: 'expected', type: 'uint256' },
      { name: 'actual', type: 'uint256' },
    ],
    name: 'IncorrectNativeAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'feeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ProtocolPaused',
    type: 'error',
  },
] as const;

/**
 * Escrow Trade Lifecycle State Enum matching Solidity EscrowTypes.TradeState
 */
export enum TradeState {
  NONE = 0,
  CREATED = 1,
  FUNDED = 2,
  PAYMENT_SUBMITTED = 3,
  DISPUTED = 4,
  RELEASED = 5,
  REFUNDED = 6,
  CANCELLED = 7,
}

/**
 * Escrow Dispute Resolution Outcome Enum matching Solidity EscrowTypes.DisputeOutcome
 */
export enum DisputeOutcome {
  RELEASE_TO_BUYER = 0,
  REFUND_TO_SELLER = 1,
}

export {
  ARBITRATOR_ROLE_HASH,
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
  SPONSOR_DISPATCHER_ROLE_HASH,
} from './governance';

export interface EscrowTrade {
  tradeId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  asset: `0x${string}`;
  amount: bigint;
  fiatAmount: bigint;
  fiatCurrency: `0x${string}`;
  state: TradeState;
  paymentWindow: bigint;
  fundingTimestamp: bigint;
  paymentTimestamp: bigint;
  paymentReference: `0x${string}`;
  evidenceHash: `0x${string}`;
  disputeInitiator: `0x${string}`;
}
