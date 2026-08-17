export const P2P_REPUTATION_ABI = [
  {
    inputs: [{ name: '_p2pEscrow', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'AlreadyRated',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidScore',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SelfRatingForbidden',
    type: 'error',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'currentState', type: 'uint8' },
    ],
    name: 'TradeNotReleased',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UnauthorizedRater',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroAddressDetected',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tradeId', type: 'uint256' },
      { indexed: true, name: 'rater', type: 'address' },
      { indexed: true, name: 'target', type: 'address' },
      { indexed: false, name: 'score', type: 'uint8' },
      { indexed: false, name: 'feedbackHash', type: 'bytes32' },
      { indexed: false, name: 'roleRated', type: 'uint8' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'RatingSubmitted',
    type: 'event',
  },
  {
    inputs: [],
    name: 'BAYESIAN_PRIOR_SCORE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BAYESIAN_PRIOR_WEIGHT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MERCHANT_MIN_RATINGS',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MERCHANT_MIN_SETTLED_VOLUME',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MERCHANT_MIN_TRUST_SCORE',
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SCALE_FACTOR',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'ratingsCount', type: 'uint32' },
      { name: 'scoreSum', type: 'uint64' },
    ],
    name: 'calculateTrustScore',
    outputs: [{ name: 'trustScoreBps', type: 'uint16' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { name: 'ratingsCount', type: 'uint32' },
      { name: 'scoreBps', type: 'uint16' },
      { name: 'volumeSettled', type: 'uint128' },
    ],
    name: 'computeTier',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBuyerTrustScore',
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBuyerTrustTier',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getCombinedTrustScore',
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getProfile',
    outputs: [
      {
        components: [
          { name: 'totalTradesAsBuyer', type: 'uint32' },
          { name: 'totalTradesAsSeller', type: 'uint32' },
          {
            components: [
              { name: 'ratingsCount', type: 'uint32' },
              { name: 'scoreSum', type: 'uint64' },
              { name: 'positiveCount', type: 'uint32' },
              { name: 'neutralCount', type: 'uint32' },
              { name: 'negativeCount', type: 'uint32' },
              { name: 'volumeSettled', type: 'uint128' },
            ],
            name: 'buyerStats',
            type: 'tuple',
          },
          {
            components: [
              { name: 'ratingsCount', type: 'uint32' },
              { name: 'scoreSum', type: 'uint64' },
              { name: 'positiveCount', type: 'uint32' },
              { name: 'neutralCount', type: 'uint32' },
              { name: 'negativeCount', type: 'uint32' },
              { name: 'volumeSettled', type: 'uint128' },
            ],
            name: 'sellerStats',
            type: 'tuple',
          },
          { name: 'firstTradeTimestamp', type: 'uint32' },
          { name: 'lastTradeTimestamp', type: 'uint32' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getSellerTrustScore',
    outputs: [{ name: '', type: 'uint16' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getSellerTrustTier',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'rater', type: 'address' },
    ],
    name: 'getTradeRating',
    outputs: [
      {
        components: [
          { name: 'score', type: 'uint8' },
          { name: 'timestamp', type: 'uint32' },
          { name: 'feedbackHash', type: 'bytes32' },
          { name: 'rater', type: 'address' },
          { name: 'target', type: 'address' },
          { name: 'roleRated', type: 'uint8' },
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
      { name: 'tradeId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    name: 'hasUserRated',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'p2pEscrow',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'score', type: 'uint8' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    name: 'submitRating',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export enum RatingValue {
  NONE = 0,
  ONE_STAR = 1,
  TWO_STAR = 2,
  THREE_STAR = 3,
  FOUR_STAR = 4,
  FIVE_STAR = 5,
}

export enum TrustTier {
  UNRATED = 0,
  PROBATIONARY = 1,
  ESTABLISHED = 2,
  VERIFIED_MERCHANT = 3,
}

export enum ParticipantRole {
  BUYER = 0,
  SELLER = 1,
}

export interface RoleReputation {
  ratingsCount: number;
  scoreSum: bigint;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  volumeSettled: bigint;
}

export interface UserReputationProfile {
  totalTradesAsBuyer: number;
  totalTradesAsSeller: number;
  buyerStats: RoleReputation;
  sellerStats: RoleReputation;
  firstTradeTimestamp: number;
  lastTradeTimestamp: number;
}
