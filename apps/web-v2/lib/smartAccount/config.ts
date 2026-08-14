import { baseSepolia, base } from 'viem/chains';
import { Address } from 'viem';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

/**
 * Returns the configured ERC-4337 Bundler RPC URL.
 * Defaults to UnifyVault self-hosted Bundler endpoint (or local dev node).
 * Does NOT require any third-party API key or card.
 */
export function getBundlerRpcUrl(chainId: number = baseSepolia.id): string {
  const customRpc = process.env.BUNDLER_RPC_URL || process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;

  if (customRpc && customRpc.trim().length > 0) {
    return customRpc;
  }

  // Chain-specific default self-hosted / public endpoints
  if (chainId === baseSepolia.id) {
    return 'http://127.0.0.1:4337'; // Local/VPS self-hosted Alto bundler default
  }

  return 'http://127.0.0.1:4337';
}

/**
 * Returns the Paymaster RPC endpoint or server sponsorship API route.
 */
export function getPaymasterRpcUrl(chainId: number = baseSepolia.id): string {
  return (
    process.env.PAYMASTER_RPC_URL ||
    process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL ||
    '/api/smart-account/sponsor'
  );
}

/**
 * Returns the deployed UnifyVaultPaymaster address on Base Sepolia.
 */
export function getPaymasterAddress(chainId: number = baseSepolia.id): Address {
  const customAddr = (process.env.PAYMASTER_ADDRESS ||
    process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS) as Address | undefined;

  if (customAddr) return customAddr;

  // Placeholder / deployed address on Base Sepolia
  return '0x0000000000000000000000000000000000000000' as Address;
}

/**
 * Returns whether Gasless Account Abstraction Sponsorship is enabled for the chain.
 * By default enabled for Base Sepolia in dev/testing without third-party dependencies.
 */
export function isGaslessSponsorshipEnabled(chainId: number = baseSepolia.id): boolean {
  if (chainId !== baseSepolia.id) return false;

  const flag = process.env.NEXT_PUBLIC_AA_SPONSORSHIP_ENABLED || process.env.AA_SPONSORSHIP_ENABLED;

  if (flag !== undefined) {
    return flag === 'true' || flag === '1';
  }

  return true; // Enabled by default on Base Sepolia
}

/**
 * @deprecated Kept solely for backward compatibility with Phase 2A tests.
 * Returns true if AA sponsorship is enabled or configured.
 */
export function isPimlicoConfigured(): boolean {
  return isGaslessSponsorshipEnabled(baseSepolia.id);
}

/**
 * @deprecated Kept solely for backward compatibility with Phase 2A tests.
 */
export function getPimlicoApiKey(): string | undefined {
  return process.env.PIMLICO_API_KEY || process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
}

/**
 * @deprecated Kept solely for backward compatibility with Phase 2A tests.
 */
export function getPimlicoRpcUrl(chainId: number = baseSepolia.id): string {
  const apiKey = getPimlicoApiKey();
  const slug = chainId === base.id ? 'base' : 'base-sepolia';
  if (!apiKey) {
    return `https://api.pimlico.io/v2/${slug}/rpc?apikey=MISSING_API_KEY`;
  }
  return `https://api.pimlico.io/v2/${slug}/rpc?apikey=${apiKey}`;
}
