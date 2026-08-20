export const ORACLE_MANAGER_ABI = [
  // --- View Functions ---
  {
    type: 'function',
    name: 'getAssetPrice',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isPriceFresh',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'isFresh', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getFeedMetadata',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'provider', type: 'address' },
      { name: 'heartbeat', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPrice',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [
      {
        name: 'round',
        type: 'tuple',
        components: [
          { name: 'price', type: 'uint256' },
          { name: 'decimals', type: 'uint8' },
          { name: 'updatedAt', type: 'uint256' },
          { name: 'roundId', type: 'uint80' },
          { name: 'providerId', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNormalizedPrice',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isHealthy',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'healthy', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProvider',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'provider', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getFallbackProvider',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'fallbackProvider', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMaxDeviationBps',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLastValidPrice',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAssetConfig',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [
      {
        name: 'config',
        type: 'tuple',
        components: [
          { name: 'primaryProvider', type: 'address' },
          { name: 'fallbackProvider', type: 'address' },
          { name: 'heartbeat', type: 'uint32' },
          { name: 'enabled', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DEFAULT_MAX_DEVIATION_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_ALLOWED_DEVIATION_BPS',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },

  // --- Mutating Functions ---
  {
    type: 'function',
    name: 'configureAsset',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'primaryProvider', type: 'address' },
      { name: 'fallbackProvider', type: 'address' },
      { name: 'heartbeat', type: 'uint32' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setMaxDeviationBps',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'deviationBps', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resetCircuitBreaker',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'manualPrice', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setAssetEnabled',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getValidatedPrice',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },

  // --- Events ---
  {
    type: 'event',
    name: 'PrimaryProviderUpdated',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldProvider', type: 'address' },
      { indexed: false, name: 'newProvider', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'FallbackProviderUpdated',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldProvider', type: 'address' },
      { indexed: false, name: 'newProvider', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'ProviderEnabled',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'ProviderDisabled',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'MaxDeviationUpdated',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldBps', type: 'uint256' },
      { indexed: false, name: 'newBps', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'CircuitBreakerReset',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldPrice', type: 'uint256' },
      { indexed: false, name: 'newPrice', type: 'uint256' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'OracleFailure',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'OracleFallback',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: true, name: 'fallbackProvider', type: 'address' },
      { indexed: false, name: 'price', type: 'uint256' },
    ],
  },

  // --- Custom Errors ---
  {
    type: 'error',
    name: 'AssetNotSupported',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'UnsafePricing',
    inputs: [{ name: 'asset', type: 'address' }],
  },
  {
    type: 'error',
    name: 'ZeroAddressDetected',
    inputs: [],
  },
  {
    type: 'error',
    name: 'HeartbeatIntervalOutofBounds',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MathCalculationOverflow',
    inputs: [],
  },
] as const;

export const CHAINLINK_ORACLE_PROVIDER_ABI = [
  // --- View Functions ---
  {
    type: 'function',
    name: 'getLatestPrice',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLatestRound',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [
      {
        name: 'round',
        type: 'tuple',
        components: [
          { name: 'price', type: 'uint256' },
          { name: 'decimals', type: 'uint8' },
          { name: 'updatedAt', type: 'uint256' },
          { name: 'roundId', type: 'uint80' },
          { name: 'providerId', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDecimals',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'decimals', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUpdatedAt',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'updatedAt', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isHealthy',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [{ name: 'healthy', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getFeedConfig',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [
      {
        name: 'config',
        type: 'tuple',
        components: [
          { name: 'feedAddress', type: 'address' },
          { name: 'heartbeat', type: 'uint32' },
          { name: 'enabled', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },

  // --- Mutating Functions ---
  {
    type: 'function',
    name: 'registerFeed',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'feedAddress', type: 'address' },
      { name: 'heartbeat', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateFeed',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'newFeedAddress', type: 'address' },
      { name: 'newHeartbeat', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeFeed',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateHeartbeat',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'newHeartbeat', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeedEnabled',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // --- Events ---
  {
    type: 'event',
    name: 'FeedRegistered',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: true, name: 'feedAddress', type: 'address' },
      { indexed: false, name: 'heartbeat', type: 'uint32' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'FeedUpdated',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldFeedAddress', type: 'address' },
      { indexed: false, name: 'newFeedAddress', type: 'address' },
      { indexed: false, name: 'oldHeartbeat', type: 'uint32' },
      { indexed: false, name: 'newHeartbeat', type: 'uint32' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'FeedRemoved',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: true, name: 'oldFeedAddress', type: 'address' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'HeartbeatUpdated',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldHeartbeat', type: 'uint32' },
      { indexed: false, name: 'newHeartbeat', type: 'uint32' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'FeedEnabledSet',
    inputs: [
      { indexed: true, name: 'assetId', type: 'bytes32' },
      { indexed: false, name: 'oldStatus', type: 'bool' },
      { indexed: false, name: 'newStatus', type: 'bool' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },

  // --- Custom Errors ---
  {
    type: 'error',
    name: 'IncompleteRound',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'ZeroAddressDetected',
    inputs: [],
  },
  {
    type: 'error',
    name: 'HeartbeatIntervalOutofBounds',
    inputs: [],
  },
  {
    type: 'error',
    name: 'EntryAlreadyExists',
    inputs: [{ name: 'id', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'AssetNotSupported',
    inputs: [{ name: 'assetId', type: 'bytes32' }],
  },
  {
    type: 'error',
    name: 'OracleProviderPriceNegative',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'price', type: 'int256' },
    ],
  },
  {
    type: 'error',
    name: 'OracleProviderPriceStale',
    inputs: [
      { name: 'assetId', type: 'bytes32' },
      { name: 'age', type: 'uint256' },
      { name: 'heartbeat', type: 'uint256' },
    ],
  },
] as const;
