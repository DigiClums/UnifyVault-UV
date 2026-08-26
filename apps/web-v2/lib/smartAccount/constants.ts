import { base } from 'viem/chains';
import { DEPLOYED_CONTRACTS_MAINNET, TOKENS_BY_CHAIN } from '../../constants';

/**
 * Canonical ERC-4337 EntryPoint v0.7 Address
 * Official canonical ERC-4337 v0.7 entrypoint across all EVM networks.
 */
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

/**
 * Supported chain IDs for ERC-4337 Account Abstraction
 */
export const SUPPORTED_AA_CHAINS = [base.id] as const;

/**
 * Default local / self-hosted ERC-4337 Bundler endpoints
 */
export const DEFAULT_BUNDLER_URLS: Record<number, string> = {
  [base.id]: 'http://127.0.0.1:4337',
};

/**
 * Safe `verificationGasLimit` fallback for a first-deployment UserOperation.
 *
 * A counterfactual Smart Account's verification phase must cover:
 *   - initCode / factory.createAccount(owner, salt)  (measured ≈ 176,769 gas)
 *   - account validateUserOp()
 *   - paymaster validatePaymasterUserOp()
 *   - EntryPoint overhead
 *
 * This fallback is only used when `eth_estimateUserOperationGas` is unavailable
 * (e.g. offline local development). The live bundler's estimate always takes
 * precedence and returns the measured value.
 */
export const FIRST_DEPLOYMENT_VERIFICATION_GAS_LIMIT = 500000n;

/**
 * @deprecated Kept solely for backward compatibility with Phase 2A tests.
 */
export const PIMLICO_CHAIN_SLUGS: Record<number, string> = {
  [base.id]: 'base',
};

/**
 * Standard ERC-20 Minimal ABI for approvals and transfers
 */
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Standard P2P Escrow Minimal ABI for user operations
 */
export const P2P_ESCROW_ABI = [
  {
    type: 'function',
    name: 'createTrade',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'buyer', type: 'address' },
          { name: 'seller', type: 'address' },
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'fiatAmount', type: 'uint256' },
          { name: 'fiatCurrency', type: 'bytes32' },
          { name: 'paymentWindow', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'tradeId', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'fundTrade',
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'submitPayment',
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'paymentReference', type: 'bytes32' },
      { name: 'evidenceHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'confirmAndRelease',
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'refund',
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelUnfundedTrade',
    inputs: [{ name: 'tradeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'raiseDispute',
    inputs: [
      { name: 'tradeId', type: 'uint256' },
      { name: 'reasonHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

/**
 * Approved contract addresses for Base Mainnet sponsorship
 */
export const APPROVED_MAINNET_TARGETS = {
  USDC: TOKENS_BY_CHAIN[base.id].USDC.toLowerCase(),
  CONTROLLER: DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController.toLowerCase(),
  UVBE: DEPLOYED_CONTRACTS_MAINNET.UVBEToken.toLowerCase(),
  P2P_ESCROW: DEPLOYED_CONTRACTS_MAINNET.P2PEscrow.toLowerCase(),
} as const;

/**
 * @deprecated For backward compatibility
 */
export const APPROVED_SEPOLIA_TARGETS = APPROVED_MAINNET_TARGETS;
