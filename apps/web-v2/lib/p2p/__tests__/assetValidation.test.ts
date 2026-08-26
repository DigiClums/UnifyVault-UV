import { describe, it, expect } from 'vitest';
import {
  getSupportedP2PAssetsForChain,
  validateP2PAsset,
  isNativeETHAsset,
  getCanonicalUVBEAddress,
  CANONICAL_UVBE_ADDRESS,
  NATIVE_ETH_ADDRESS,
} from '../assetValidation';

describe('Phase 1 — UVBE-Only P2P Asset & Active Chain Validation Tests', () => {
  const baseMainnetId = 8453;

  const mainnetUSDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const mainnetcbBTC = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
  const mainnetWETH = '0x4200000000000000000000000000000000000006';
  const canonicalUVBE = CANONICAL_UVBE_ADDRESS;

  it('1. Returns ONLY UVBE for Base Mainnet (8453)', () => {
    const assets = getSupportedP2PAssetsForChain(baseMainnetId);
    expect(assets.length).toBe(1);
    expect(assets[0].symbol).toBe('UVBE');
    expect(assets[0].address.toLowerCase()).toBe(canonicalUVBE.toLowerCase());
    expect(assets[0].isNative).toBe(false);
  });

  it('2. Returns empty array for unsupported chain (e.g. Ethereum Mainnet 1)', () => {
    const assets = getSupportedP2PAssetsForChain(1);
    expect(assets).toEqual([]);
  });

  it('3. Successfully validates canonical UVBE on Base Mainnet', () => {
    const mainnetUVBE = getCanonicalUVBEAddress(baseMainnetId);
    const res = validateP2PAsset(mainnetUVBE, baseMainnetId);
    expect(res.isValid).toBe(true);
    expect(res.isNative).toBe(false);
    expect(res.assetInfo?.symbol).toBe('UVBE');
  });

  it('4. Strictly rejects non-UVBE tokens (USDC, cbBTC, WETH) on Base Mainnet', () => {
    const resUsdc = validateP2PAsset(mainnetUSDC, baseMainnetId);
    expect(resUsdc.isValid).toBe(false);
    expect(resUsdc.errorMessage).toBe('P2P marketplace exclusively supports UVBE token.');

    const resBtc = validateP2PAsset(mainnetcbBTC, baseMainnetId);
    expect(resBtc.isValid).toBe(false);

    const resWeth = validateP2PAsset(mainnetWETH, baseMainnetId);
    expect(resWeth.isValid).toBe(false);
  });

  it('5. Strictly rejects Native ETH on Base Mainnet', () => {
    const resEth = validateP2PAsset(NATIVE_ETH_ADDRESS, baseMainnetId);
    expect(resEth.isValid).toBe(false);
    expect(resEth.errorMessage).toContain('P2P marketplace exclusively supports UVBE token');
  });

  it('6. Rejects unknown/random EVM address', () => {
    const randomAddress = '0x1111111111111111111111111111111111111111';
    const res = validateP2PAsset(randomAddress, baseMainnetId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('P2P marketplace exclusively supports UVBE token.');
  });

  it('7. Rejects invalid non-EVM address strings', () => {
    const res = validateP2PAsset('not-an-address', baseMainnetId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('Invalid token address format for P2P order.');
  });

  it('8. Identifies Native ETH format helper', () => {
    expect(isNativeETHAsset(NATIVE_ETH_ADDRESS)).toBe(true);
    expect(isNativeETHAsset('ETH')).toBe(true);
    expect(isNativeETHAsset('eth')).toBe(true);
    expect(isNativeETHAsset(canonicalUVBE)).toBe(false);
  });
});
