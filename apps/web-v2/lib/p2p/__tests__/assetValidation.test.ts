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
  const baseSepoliaId = 84532;
  const baseMainnetId = 8453;

  const sepoliaUSDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  const sepoliacbBTC = '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29';
  const sepoliaWETH = '0xd116ab1c943cf15904ec4c8dd701086f175FA323';
  const canonicalUVBE = CANONICAL_UVBE_ADDRESS;

  it('1. Returns ONLY UVBE for Base Sepolia (84532)', () => {
    const assets = getSupportedP2PAssetsForChain(baseSepoliaId);
    expect(assets.length).toBe(1);
    expect(assets[0].symbol).toBe('UVBE');
    expect(assets[0].address.toLowerCase()).toBe(
      (process.env.NEXT_PUBLIC_UVBE_TOKEN_ADDRESS_SEPOLIA || '0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde').toLowerCase(),
    );
    expect(assets[0].isNative).toBe(false);
  });

  it('2. Returns ONLY UVBE for Base Mainnet (8453)', () => {
    const assets = getSupportedP2PAssetsForChain(baseMainnetId);
    expect(assets.length).toBe(1);
    expect(assets[0].symbol).toBe('UVBE');
    expect(assets[0].isNative).toBe(false);
  });

  it('3. Returns empty array for unsupported chain (e.g. Ethereum Mainnet 1)', () => {
    const assets = getSupportedP2PAssetsForChain(1);
    expect(assets).toEqual([]);
  });

  it('4. Successfully validates canonical UVBE on Base Sepolia', () => {
    const sepoliaUVBE = getCanonicalUVBEAddress(baseSepoliaId);
    const res = validateP2PAsset(sepoliaUVBE, baseSepoliaId);
    expect(res.isValid).toBe(true);
    expect(res.isNative).toBe(false);
    expect(res.assetInfo?.symbol).toBe('UVBE');
  });

  it('5. Strictly rejects non-UVBE tokens (USDC, cbBTC, WETH) on Base Sepolia', () => {
    const resUsdc = validateP2PAsset(sepoliaUSDC, baseSepoliaId);
    expect(resUsdc.isValid).toBe(false);
    expect(resUsdc.errorMessage).toBe('P2P marketplace exclusively supports UVBE token.');

    const resBtc = validateP2PAsset(sepoliacbBTC, baseSepoliaId);
    expect(resBtc.isValid).toBe(false);

    const resWeth = validateP2PAsset(sepoliaWETH, baseSepoliaId);
    expect(resWeth.isValid).toBe(false);
  });

  it('6. Strictly rejects Native ETH on Base Sepolia', () => {
    const resEth = validateP2PAsset(NATIVE_ETH_ADDRESS, baseSepoliaId);
    expect(resEth.isValid).toBe(false);
    expect(resEth.errorMessage).toContain('P2P marketplace exclusively supports UVBE token');
  });

  it('7. Rejects unknown/random EVM address', () => {
    const randomAddress = '0x1111111111111111111111111111111111111111';
    const res = validateP2PAsset(randomAddress, baseSepoliaId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('P2P marketplace exclusively supports UVBE token.');
  });

  it('8. Rejects invalid non-EVM address strings', () => {
    const res = validateP2PAsset('not-an-address', baseSepoliaId);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toBe('Invalid token address format for P2P order.');
  });

  it('9. Identifies Native ETH format helper', () => {
    expect(isNativeETHAsset(NATIVE_ETH_ADDRESS)).toBe(true);
    expect(isNativeETHAsset('ETH')).toBe(true);
    expect(isNativeETHAsset('eth')).toBe(true);
    expect(isNativeETHAsset(canonicalUVBE)).toBe(false);
  });
});
