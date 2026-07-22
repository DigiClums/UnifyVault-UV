import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProtocolDirectoryAddresses } from '../../hooks/useProtocolDirectoryAddresses';
import { TestProviders } from '../utils/renderWithProviders';

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => ({
    chainId: 84532,
    isSupported: true,
  }),
}));

let mockIsLoading = false;

vi.mock('wagmi', () => ({
  useReadContracts: (config: any) => {
    if (config?.contracts?.length === 3) {
      return {
        data: [
          { status: 'success', result: '0x1111111111111111111111111111111111111111' },
          { status: 'success', result: '0x3333333333333333333333333333333333333333' },
          { status: 'success', result: '0x2222222222222222222222222222222222222222' },
        ],
        isLoading: mockIsLoading,
      };
    }
    return { data: undefined, isLoading: false };
  },
}));

describe('useProtocolDirectoryAddresses Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
  });

  it('fetches all directory module addresses in a single multicall', () => {
    const { result } = renderHook(() => useProtocolDirectoryAddresses(), {
      wrapper: TestProviders,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.controllerAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(result.current.indexTokenAddress).toBe('0x3333333333333333333333333333333333333333');
    expect(result.current.vaultAddress).toBe('0x2222222222222222222222222222222222222222');
  });

  it('handles loading state during directory address fetch', () => {
    mockIsLoading = true;

    const { result } = renderHook(() => useProtocolDirectoryAddresses(), {
      wrapper: TestProviders,
    });

    expect(result.current.isLoading).toBe(true);
  });
});
