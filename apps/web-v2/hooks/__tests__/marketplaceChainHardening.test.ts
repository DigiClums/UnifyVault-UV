import { describe, it, expect, vi } from 'vitest';
import { base, baseSepolia } from 'viem/chains';
import { getMarketplaceAddress, performMarketplaceGasPreflight } from '../useMarketplace';
import { DEPLOYED_CONTRACTS_SEPOLIA, DEPLOYED_CONTRACTS_MAINNET } from '../../constants';

describe('Phase 7.5.4 — MarketPlace Buy Order Address + Gas Pre-Flight Hardening Suite', () => {
  // 1. Base Sepolia Resolution
  it('1. Resolves Base Sepolia (84532) strictly to Sepolia Marketplace contract (0xe908377f96F313a6b7771570ff6Fb414D38F451A)', () => {
    const address = getMarketplaceAddress(baseSepolia.id);
    expect(address.toLowerCase()).toBe('0xe908377f96f313a6b7771570ff6fb414d38f451a');
    expect(address.toLowerCase()).toBe(DEPLOYED_CONTRACTS_SEPOLIA.Marketplace.toLowerCase());
  });

  // 2. Base Mainnet Resolution
  it('2. Resolves Base Mainnet (8453) strictly to Mainnet Marketplace contract or fails closed if address(0)', () => {
    if (DEPLOYED_CONTRACTS_MAINNET.Marketplace !== '0x0000000000000000000000000000000000000000') {
      const address = getMarketplaceAddress(base.id);
      expect(address.toLowerCase()).toBe(DEPLOYED_CONTRACTS_MAINNET.Marketplace.toLowerCase());
    } else {
      expect(() => getMarketplaceAddress(base.id)).toThrow('zero or unconfigured');
    }
  });

  // 3. Unsupported Network Hard Block
  it('3. Throws explicit hard-block error on unsupported chain IDs (e.g. Ethereum Mainnet, Polygon)', () => {
    expect(() => getMarketplaceAddress(1)).toThrow('Unsupported network (Chain ID: 1)');
    expect(() => getMarketplaceAddress(137)).toThrow('Unsupported network (Chain ID: 137)');
  });

  // 4. Zero Marketplace Address Guard
  it('4. Throws explicit zero-address configuration error when address resolves to address(0)', async () => {
    await expect(
      performMarketplaceGasPreflight({
        publicClient: null,
        userAddress: '0x1111111111111111111111111111111111111111',
        marketplaceAddress: '0x0000000000000000000000000000000000000000',
        abi: [],
        functionName: 'createBuyOrder',
        args: [],
      }),
    ).rejects.toThrow('zero or unconfigured');
  });

  // 5. CreateBuyOrder never receives address(0)
  it('5. Ensures createBuyOrder contract target is never zero address', async () => {
    await expect(
      performMarketplaceGasPreflight({
        publicClient: {},
        userAddress: '0x1234567890123456789012345678901234567890',
        marketplaceAddress: '0x0000000000000000000000000000000000000000',
        abi: [],
        functionName: 'createBuyOrder',
        args: [],
      }),
    ).rejects.toThrow('Marketplace contract address is zero or unconfigured');
  });

  // 6. Insufficient Native ETH -> Transaction Blocked
  it('6. Blocks transaction and throws "Insufficient ETH for Base network gas." when native balance is 0', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(0n),
      simulateContract: vi.fn(),
    };

    await expect(
      performMarketplaceGasPreflight({
        publicClient: mockPublicClient,
        userAddress: '0x1234567890123456789012345678901234567890',
        marketplaceAddress: '0xe908377f96F313a6b7771570ff6Fb414D38F451A',
        abi: [],
        functionName: 'createBuyOrder',
        args: [],
      }),
    ).rejects.toThrow('Insufficient ETH for Base network gas.');

    expect(mockPublicClient.simulateContract).not.toHaveBeenCalled();
  });

  // 7. Simulation Error Due to Insufficient Gas / Miners -> Transaction Blocked
  it('7. Blocks transaction when simulation fails due to miner/gas error', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(1000000n),
      simulateContract: vi
        .fn()
        .mockRejectedValue(new Error('ETH(Base) is not enough to pay for miners')),
    };

    await expect(
      performMarketplaceGasPreflight({
        publicClient: mockPublicClient,
        userAddress: '0x1234567890123456789012345678901234567890',
        marketplaceAddress: '0xe908377f96F313a6b7771570ff6Fb414D38F451A',
        abi: [],
        functionName: 'createBuyOrder',
        args: [],
      }),
    ).rejects.toThrow('Insufficient ETH for Base network gas.');
  });

  // 8. Sufficient ETH -> Transaction Proceeds to Wallet Confirmation
  it('8. Allows transaction to proceed when native balance is sufficient and simulation succeeds', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(100000000000000000n),
      simulateContract: vi.fn().mockResolvedValue({ request: {} }),
    };

    await expect(
      performMarketplaceGasPreflight({
        publicClient: mockPublicClient,
        userAddress: '0x1234567890123456789012345678901234567890',
        marketplaceAddress: '0xe908377f96F313a6b7771570ff6Fb414D38F451A',
        abi: [],
        functionName: 'createBuyOrder',
        args: [],
      }),
    ).resolves.toBeUndefined();

    expect(mockPublicClient.getBalance).toHaveBeenCalled();
    expect(mockPublicClient.simulateContract).toHaveBeenCalled();
  });
});
