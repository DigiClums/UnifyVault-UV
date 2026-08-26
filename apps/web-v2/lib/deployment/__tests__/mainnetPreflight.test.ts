import { describe, it, expect } from 'vitest';
import { runPreflight, REQUIRED_CONTRACT_KEYS } from '../mainnetPreflight';
import {
  getProtocolDirectoryAddress,
  getChainTokens,
  getDefaultChainId,
  isNonZeroAddress,
} from '../../../constants';

describe('Base Mainnet Preflight & Configuration Hardening', () => {
  it('1. getProtocolDirectoryAddress returns canonical directory address for mainnet', () => {
    const mainnetDir = getProtocolDirectoryAddress(8453);
    expect(mainnetDir.toLowerCase()).toBe('0xe74b400f4aea3a0b593be5acbc54f56631c0d60e');
  });

  it('2. Base Mainnet tokens match canonical verified assets in getChainTokens', () => {
    const mainnetTokens = getChainTokens(8453);

    expect(mainnetTokens.USDC.toLowerCase()).toBe('0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
    expect(mainnetTokens.cbBTC.toLowerCase()).toBe('0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf');
    expect(mainnetTokens.WETH.toLowerCase()).toBe('0x4200000000000000000000000000000000000006');
    expect(mainnetTokens.UVBE?.toLowerCase()).toBe('0xd2715141a0f5998b707baa963990bfc2e94cf145');
  });

  it('3. Preflight fails closed when manifest chainId is not 8453', async () => {
    const mockInvalidManifest = {
      chainId: 84532, // Wrong chain
      contracts: {},
    };

    const res = await runPreflight({
      silent: true,
      manifest: mockInvalidManifest,
      skipEnvironment: true,
      skipBytecode: true,
    });

    expect(res.fail.length).toBeGreaterThan(0);
    expect(res.fail.some((f) => f.includes('chainId mismatch'))).toBe(true);
  });

  it('4. Preflight detects duplicate contract addresses in manifest', async () => {
    const mockDuplicateManifest = {
      chainId: 8453,
      contracts: {
        ProtocolDirectory: '0x1111111111111111111111111111111111111111',
        OracleManager: '0x1111111111111111111111111111111111111111', // Duplicate!
      },
    };

    const res = await runPreflight({
      silent: true,
      manifest: mockDuplicateManifest,
      skipEnvironment: true,
      skipBytecode: true,
    });

    expect(res.fail.length).toBeGreaterThan(0);
    expect(res.fail.some((f) => f.includes('Duplicate contract address'))).toBe(true);
  });

  it('5. Preflight accepts valid, unique mocked mainnet manifest structure', async () => {
    const mockValidContracts: Record<string, string> = {};
    REQUIRED_CONTRACT_KEYS.forEach((key, idx) => {
      const hex = (idx + 1).toString(16).padStart(40, '0');
      mockValidContracts[key] = `0x${hex}`;
    });

    const mockValidManifest = {
      chainId: 8453,
      contracts: mockValidContracts,
    };

    const res = await runPreflight({
      silent: true,
      manifest: mockValidManifest,
      skipBytecode: true,
      skipEnvironment: true,
    });

    expect(res.fail.length).toBe(0);
    expect(res.pass.some((p) => p.includes('mapped without duplication'))).toBe(true);
  });
});
