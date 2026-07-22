import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultMetrics } from '../../hooks/useVaultMetrics';
import { TestProviders } from '../utils/renderWithProviders';

vi.mock('../../hooks/useProtocolDirectoryAddresses', () => ({
  useProtocolDirectoryAddresses: () => ({
    controllerAddress: '0x1111111111111111111111111111111111111111',
    indexTokenAddress: '0x3333333333333333333333333333333333333333',
    vaultAddress: '0x2222222222222222222222222222222222222222',
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => ({
    chainId: 84532,
    isSupported: true,
  }),
}));

const mockRefetchMetrics = vi.fn();
let mockReadContractsState: any = {
  data: undefined,
  isLoading: false,
};

vi.mock('wagmi', () => ({
  useReadContracts: (config: any) => {
    if (config?.contracts?.length > 0) {
      return {
        data: [
          { status: 'success', result: 1000000000000000000000000n }, // maxDeposit
          { status: 'success', result: 500000000000000000000n }, // totalSupply (500 shares)
          { status: 'success', result: 1000000000n }, // totalAssets USDC (1000 USDC)
          { status: 'success', result: 0n }, // totalAssets WETH
          { status: 'success', result: 0n }, // totalAssets cbBTC
          { status: 'success', result: { normalizedPrice: 1000000000000000000n } }, // quote USDC ($1.00 USD)
          { status: 'success', result: { normalizedPrice: 3000000000000000000000n } }, // quote WETH ($3000 USD)
          { status: 'success', result: { normalizedPrice: 60000000000000000000000n } }, // quote cbBTC ($60000 USD)
        ],
        isLoading: mockReadContractsState.isLoading,
        refetch: mockRefetchMetrics,
      };
    }
    return { data: undefined, isLoading: false, refetch: vi.fn() };
  },
  useAccount: () => ({ isConnected: true }),
}));

describe('useVaultMetrics Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContractsState = { data: undefined, isLoading: false };
  });

  it('loads vault metrics successfully', () => {
    const { result } = renderHook(() => useVaultMetrics(), { wrapper: TestProviders });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.metrics).not.toBeNull();
    expect(result.current.metrics?.totalSupply).toBe(500000000000000000000n);
    expect(result.current.metrics?.totalTvlUSD).toBe(1000000000000000000000n); // $1000 TVL
    expect(result.current.metrics?.vaultAddress).toBe('0x2222222222222222222222222222222222222222');
    expect(result.current.metrics?.indexTokenAddress).toBe(
      '0x3333333333333333333333333333333333333333',
    );
  });

  it('handles loading state during query execution', () => {
    mockReadContractsState = { isLoading: true };

    const { result } = renderHook(() => useVaultMetrics(), { wrapper: TestProviders });

    expect(result.current.isLoading).toBe(true);
  });

  it('refetch invokes underlying contract refetch functions', () => {
    const { result } = renderHook(() => useVaultMetrics(), { wrapper: TestProviders });

    act(() => {
      result.current.refetch();
    });

    expect(mockRefetchMetrics).toHaveBeenCalled();
  });
});
