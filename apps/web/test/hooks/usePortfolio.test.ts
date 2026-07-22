import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { TestProviders } from '../utils/renderWithProviders';

let mockUserAddress: string | undefined = '0x1234567890123456789012345678901234567890';
const mockRefetchPortfolio = vi.fn();
let mockIsLoading = false;

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

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockUserAddress,
    isConnected: !!mockUserAddress,
  }),
  useReadContracts: (config: any) => {
    if (config?.contracts?.length > 0 && mockUserAddress) {
      return {
        data: [
          { status: 'success', result: 100000000000000000000n }, // 100 shares
          // USDC
          { status: 'success', result: 500000000n }, // 500 USDC balance
          { status: 'success', result: 100000000n }, // 100 USDC redeemable
          { status: 'success', result: { normalizedPrice: 1000000000000000000n } }, // $1.00 USD
          // WETH
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
          { status: 'success', result: { normalizedPrice: 3000000000000000000000n } },
          // cbBTC
          { status: 'success', result: 0n },
          { status: 'success', result: 0n },
          { status: 'success', result: { normalizedPrice: 60000000000000000000000n } },
        ],
        isLoading: mockIsLoading,
        refetch: mockRefetchPortfolio,
      };
    }
    return { data: undefined, isLoading: false, refetch: vi.fn() };
  },
}));

describe('usePortfolio Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserAddress = '0x1234567890123456789012345678901234567890';
    mockIsLoading = false;
  });

  it('returns portfolio balances and USD calculations when connected', () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: TestProviders });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.portfolio).not.toBeNull();
    expect(result.current.portfolio?.sharesBalance).toBe(100000000000000000000n);
    expect(result.current.portfolio?.sharesValueUSD).toBe(100000000000000000000n); // $100
    expect(result.current.portfolio?.walletCollateralUSD).toBe(500000000000000000000n); // $500
  });

  it('returns null portfolio when user wallet is disconnected', () => {
    mockUserAddress = undefined;

    const { result } = renderHook(() => usePortfolio(), { wrapper: TestProviders });

    expect(result.current.portfolio).toBeNull();
  });

  it('handles loading state during contract queries', () => {
    mockIsLoading = true;

    const { result } = renderHook(() => usePortfolio(), { wrapper: TestProviders });

    expect(result.current.isLoading).toBe(true);
  });

  it('refetch updates queries via refetch functions', () => {
    const { result } = renderHook(() => usePortfolio(), { wrapper: TestProviders });

    act(() => {
      result.current.refetch();
    });

    expect(mockRefetchPortfolio).toHaveBeenCalled();
  });
});
