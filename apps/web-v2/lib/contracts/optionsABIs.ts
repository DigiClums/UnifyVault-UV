/**
 * Exact Deployed ABIs for UVBE Options Protocol (UV-NIFTY)
 * Sourced directly from packages/protocol/src/interfaces
 */

export const UV_OPTION_POSITION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'openPosition',
    inputs: [
      { name: 'seriesId', type: 'bytes32' },
      { name: 'isLong', type: 'bool' },
      { name: 'quantityLots', type: 'uint256' },
    ],
    outputs: [{ name: 'positionId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'closePosition',
    inputs: [
      { name: 'positionId', type: 'bytes32' },
      { name: 'quantityLots', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPosition',
    inputs: [{ name: 'positionId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'positionId', type: 'bytes32' },
          { name: 'seriesId', type: 'bytes32' },
          { name: 'trader', type: 'address' },
          { name: 'isLong', type: 'bool' },
          { name: 'quantityLots', type: 'uint256' },
          { name: 'entryPremiumUvbe', type: 'uint256' },
          { name: 'lockedCollateralUvbe', type: 'uint256' },
          { name: 'isOpen', type: 'bool' },
          { name: 'isSettled', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTraderPositions',
    inputs: [{ name: 'trader', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PositionOpened',
    inputs: [
      { name: 'positionId', type: 'bytes32', indexed: true },
      { name: 'seriesId', type: 'bytes32', indexed: true },
      { name: 'trader', type: 'address', indexed: true },
      { name: 'isLong', type: 'bool', indexed: false },
      { name: 'quantityLots', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PositionClosed',
    inputs: [
      { name: 'positionId', type: 'bytes32', indexed: true },
      { name: 'quantityClosed', type: 'uint256', indexed: false },
      { name: 'netReceiptUvbe', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const UV_OPTION_MARKET_FACTORY_ABI = [
  {
    type: 'function',
    name: 'getOptionSeries',
    inputs: [{ name: 'underlyingIndexId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'seriesId', type: 'bytes32' },
          { name: 'underlyingIndexId', type: 'bytes32' },
          { name: 'strike', type: 'uint256' },
          { name: 'expiry', type: 'uint256' },
          { name: 'lotSize', type: 'uint256' },
          { name: 'optionType', type: 'uint8' },
          { name: 'maxPriceDeviationCapBps', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSeries',
    inputs: [{ name: 'seriesId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'seriesId', type: 'bytes32' },
          { name: 'underlyingIndexId', type: 'bytes32' },
          { name: 'strike', type: 'uint256' },
          { name: 'expiry', type: 'uint256' },
          { name: 'lotSize', type: 'uint256' },
          { name: 'optionType', type: 'uint8' },
          { name: 'maxPriceDeviationCapBps', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

export const UV_OPTION_MARGIN_ENGINE_ABI = [
  {
    type: 'function',
    name: 'getRiskParameters',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'mcrBps', type: 'uint256' },
          { name: 'haircutBps', type: 'uint256' },
          { name: 'maintenanceMarginBps', type: 'uint256' },
          { name: 'liquidationThresholdBps', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateRequiredCollateral',
    inputs: [
      { name: 'seriesId', type: 'bytes32' },
      { name: 'quantityLots', type: 'uint256' },
    ],
    outputs: [
      { name: 'requiredCollateralUvbe', type: 'uint256' },
      { name: 'maintenanceCollateralUvbe', type: 'uint256' },
      { name: 'maxLossUsd', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const UV_OPTION_PRICING_ENGINE_ABI = [
  {
    type: 'function',
    name: 'getOptionQuote',
    inputs: [{ name: 'seriesId', type: 'bytes32' }],
    outputs: [
      { name: 'premiumUsd', type: 'uint256' },
      { name: 'premiumUvbe', type: 'uint256' },
      { name: 'delta', type: 'int256' },
      { name: 'ivBps', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGreeks',
    inputs: [{ name: 'seriesId', type: 'bytes32' }],
    outputs: [
      { name: 'delta', type: 'int256' },
      { name: 'gamma', type: 'int256' },
      { name: 'theta', type: 'int256' },
      { name: 'vega', type: 'int256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const UV_NIFTY_INDEX_MANAGER_ABI = [
  {
    type: 'function',
    name: 'getIndexPrice',
    inputs: [],
    outputs: [
      { name: 'indexPrice', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getComponents',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'assetId', type: 'bytes32' },
          { name: 'oracle', type: 'address' },
          { name: 'weightBps', type: 'uint256' },
          { name: 'referencePrice', type: 'uint256' },
          { name: 'priceDecimals', type: 'uint8' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

export const UV_OPTION_SETTLEMENT_VAULT_ABI = [
  {
    type: 'function',
    name: 'claimSettlement',
    inputs: [{ name: 'positionId', type: 'bytes32' }],
    outputs: [
      { name: 'payoutUvbe', type: 'uint256' },
      { name: 'refundCollateralUvbe', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSettlementSnapshot',
    inputs: [{ name: 'seriesId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'seriesId', type: 'bytes32' },
          { name: 'settlementTimestamp', type: 'uint256' },
          { name: 'twapIndexPrice', type: 'uint256' },
          { name: 'twapUvbePrice', type: 'uint256' },
          { name: 'intrinsicPayoffPerLot', type: 'uint256' },
          { name: 'settled', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

export const ERC20_OPTIONS_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;
