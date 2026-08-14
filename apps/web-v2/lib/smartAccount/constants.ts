import { base, baseSepolia } from 'viem/chains';
import { DEPLOYED_CONTRACTS_SEPOLIA, TOKENS_BY_CHAIN } from '../../constants';

/**
 * Canonical ERC-4337 EntryPoint v0.7 Address
 * Official canonical ERC-4337 v0.7 entrypoint across all EVM networks.
 */
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

/**
 * Supported chain IDs for ERC-4337 Account Abstraction
 */
export const SUPPORTED_AA_CHAINS = [baseSepolia.id, base.id] as const;

/**
 * Default local / self-hosted ERC-4337 Bundler endpoints
 */
export const DEFAULT_BUNDLER_URLS: Record<number, string> = {
  [baseSepolia.id]: 'http://127.0.0.1:4337',
  [base.id]: 'http://127.0.0.1:4337',
};

/**
 * @deprecated Kept solely for backward compatibility with Phase 2A tests.
 */
export const PIMLICO_CHAIN_SLUGS: Record<number, string> = {
  [baseSepolia.id]: 'base-sepolia',
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
 * Approved contract addresses for Base Sepolia sponsorship
 */
export const APPROVED_SEPOLIA_TARGETS = {
  USDC: TOKENS_BY_CHAIN[baseSepolia.id].USDC.toLowerCase(),
  CONTROLLER: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController.toLowerCase(),
  UVBE: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken.toLowerCase(),
} as const;
