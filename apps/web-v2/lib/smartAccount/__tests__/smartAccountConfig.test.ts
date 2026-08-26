import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getBundlerRpcUrl,
  getPaymasterRpcUrl,
  getPaymasterAddress,
  isGaslessSponsorshipEnabled,
  getPimlicoApiKey,
  getPimlicoRpcUrl,
  isPimlicoConfigured,
} from '../config';
import { baseSepolia, base } from 'viem/chains';
import {
  ENTRYPOINT_ADDRESS_V07,
  APPROVED_SEPOLIA_TARGETS,
  DEFAULT_BUNDLER_URLS,
} from '../constants';

describe('Phase 2A.5 — Account Abstraction Provider Configuration Tests', () => {
  const originalBundlerRpc = process.env.BUNDLER_RPC_URL;
  const originalPaymasterRpc = process.env.PAYMASTER_RPC_URL;
  const originalPaymasterAddr = process.env.PAYMASTER_ADDRESS;
  const originalAASponsorship = process.env.AA_SPONSORSHIP_ENABLED;
  const originalPimlicoKey = process.env.PIMLICO_API_KEY;

  afterEach(() => {
    process.env.BUNDLER_RPC_URL = originalBundlerRpc;
    process.env.PAYMASTER_RPC_URL = originalPaymasterRpc;
    process.env.PAYMASTER_ADDRESS = originalPaymasterAddr;
    process.env.AA_SPONSORSHIP_ENABLED = originalAASponsorship;
    process.env.PIMLICO_API_KEY = originalPimlicoKey;
  });

  // 1. EntryPoint canonical address
  it('enforces canonical ERC-4337 EntryPoint v0.7 address', () => {
    expect(ENTRYPOINT_ADDRESS_V07).toBe('0x0000000071727De22E5E9d8BAf0edAc6f37da032');
  });

  // 2. Approved targets on Base Sepolia
  it('contains valid lowercase addresses for approved Base Sepolia targets', () => {
    expect(APPROVED_SEPOLIA_TARGETS.USDC).toMatch(/^0x[0-9a-f]{40}$/);
    expect(APPROVED_SEPOLIA_TARGETS.CONTROLLER).toMatch(/^0x[0-9a-f]{40}$/);
    expect(APPROVED_SEPOLIA_TARGETS.UVBE).toMatch(/^0x[0-9a-f]{40}$/);
  });

  // 3. Provider-Agnostic Bundler Configuration
  it('resolves bundler endpoint without requiring third-party API keys', () => {
    delete process.env.BUNDLER_RPC_URL;
    delete process.env.NEXT_PUBLIC_BUNDLER_RPC_URL;

    const defaultUrl = getBundlerRpcUrl(baseSepolia.id);
    expect(defaultUrl).toBe('/api/smart-account/bundler');

    process.env.BUNDLER_RPC_URL = 'https://bundler.unifyvault.xyz/rpc';
    expect(getBundlerRpcUrl(baseSepolia.id)).toBe('https://bundler.unifyvault.xyz/rpc');
  });

  // 4. Provider-Agnostic Paymaster Configuration
  it('resolves paymaster API route or custom paymaster RPC', () => {
    delete process.env.PAYMASTER_RPC_URL;
    delete process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL;

    expect(getPaymasterRpcUrl(baseSepolia.id)).toBe('/api/smart-account/sponsor');

    process.env.PAYMASTER_RPC_URL = 'https://paymaster.unifyvault.xyz/rpc';
    expect(getPaymasterRpcUrl(baseSepolia.id)).toBe('https://paymaster.unifyvault.xyz/rpc');
  });

  // 5. Sponsorship Enabled Checks
  it('enables sponsorship on Base Mainnet by default in dev/test', () => {
    delete process.env.AA_SPONSORSHIP_ENABLED;
    delete process.env.NEXT_PUBLIC_AA_SPONSORSHIP_ENABLED;

    expect(isGaslessSponsorshipEnabled(base.id)).toBe(true);

    process.env.AA_SPONSORSHIP_ENABLED = 'false';
    expect(isGaslessSponsorshipEnabled(base.id)).toBe(false);
  });

  // 6. Backward compatibility fallback helpers
  it('provides backward compatibility helpers for legacy Phase 2A references', () => {
    process.env.PIMLICO_API_KEY = 'test_legacy_key';
    expect(getPimlicoApiKey()).toBe('test_legacy_key');
    expect(getPimlicoRpcUrl(base.id)).toContain('test_legacy_key');
  });
});
