import { describe, it, expect } from 'vitest';
import {
  getSupportedP2PAssetsForChain,
  validateP2PAsset,
  isNativeETHAsset,
  NATIVE_ETH_ADDRESS,
} from '../assetValidation';

describe('Phase 7.1.4 — Supported P2P Asset & Active Chain Validation Tests', () => {
  const baseSepoliaId = 84532;
  const baseMainnetId = 8453;

  const sepoliaUSDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  const sepoliacbBTC = '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29';
  const sepoliaWETH = '0xd116ab1c943cf15904ec4c8dd701086f175FA323';
  const sepoliaUVBE = '0x4A33d001D7F81C12c0C9262256Af83000e64457D';

  const mainnetUSDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const mainnetcbBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
  const mainnetWETH = '0x4200000000000000000000000000000000000006';

  it('1. Returns supported assets for Base Sepolia (84532)', () => {
    const assets = getSupportedP2PAssetsForChain(baseSepoliaId);
    expect(assets.length).toBe(5);

    const symbols = assets.map((a) => a.symbol);
    expect(symbols).toContain('UVBTCETH');
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('cbBTC');
    expect(symbols).toContain('WETH');
    expect(symbols).toContain('ETH');
  });

  it('2. Returns supported assets for Base Mainnet (8453)', () => {
    const assets = getSupportedP2PAssetsForChain(baseMainnetId);
    expect(assets.length).toBe(4);

    const symbols = assets.map((a) => a.symbol);
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('cbBTC');
    expect(symbols).toContain('WETH');
    expect(symbols).toContain('ETH');
    expect(symbols).not.toContain('UVBTCETH');
  });

  it('3. Returns empty array for unsupported chain (e.g. Ethereum Mainnet 1) and never falls back to Sepolia', () => {
    const assets = getSupportedP2PAssetsForChain(1);
    expect(assets).toEqual([]);
  });

  it('4. Validates explicitly supported assets on Base Sepolia', () => {
    const resUsdc = validateP2PAsset(sepoliaUSDC, baseSepoliaId);
    expect(resUsdc.isValid).toBe(true);
    expect(resUsdc.isNative).toBe(false);
    expect(resUsdc.assetInfo?.symbol).toBe('USDC');

    const resEth = validateP2PAsset(NATIVE_ETH_ADDRESS, baseSepoliaId);
    expect(resEth.isValid).toBe(true);
    expect(resEth.isNative).toBe(true);
    expect(resEth.assetInfo?.symbol).toBe('ETH');
  });

  it('5. Rejects Sepolia token address when active chain is Base Mainnet (no cross-chain fallback)', () => {
    const res = validateP2PAsset(sepoliaUSDC, baseMainnetId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('Selected asset is not supported on the active network.');
  });

  it('6. Rejects Mainnet token address when active chain is Base Sepolia', () => {
    const res = validateP2PAsset(mainnetUSDC, baseSepoliaId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('Selected asset is not supported on the active network.');
  });

  it('7. Rejects unknown/random EVM address', () => {
    const randomAddress = '0x1111111111111111111111111111111111111111';
    const res = validateP2PAsset(randomAddress, baseSepoliaId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('Selected asset is not supported on the active network.');
  });

  it('8. Rejects invalid non-EVM address strings', () => {
    const res = validateP2PAsset('not-an-address', baseSepoliaId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('Selected asset is not supported on the active network.');
  });

  it('9. Identifies Native ETH asset string formats', () => {
    expect(isNativeETHAsset(NATIVE_ETH_ADDRESS)).toBe(true);
    expect(isNativeETHAsset('ETH')).toBe(true);
    expect(isNativeETHAsset('eth')).toBe(true);
    expect(isNativeETHAsset(sepoliaUSDC)).toBe(false);
  });
});
