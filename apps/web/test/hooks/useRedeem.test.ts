import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRedeem } from '../../hooks/useRedeem';
import { TestProviders } from '../utils/renderWithProviders';

let mockUserAddress: string | undefined = '0x1234567890123456789012345678901234567890';
let mockControllerAddress: string | undefined = '0x1111111111111111111111111111111111111111';
let mockWriteContractError: any = null;
let mockWriteContractResult = '0xRedeemTxHash1234567890abcdef';
let mockIsSubmitPending = false;
let mockIsTxPending = false;
let mockIsTxSuccess = false;

vi.mock('../../hooks/useControllerAddress', () => ({
  useControllerAddress: () => ({
    controllerAddress: mockControllerAddress,
    isLoading: false,
  }),
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockUserAddress,
    isConnected: !!mockUserAddress,
  }),
  useWriteContract: () => ({
    writeContractAsync: vi.fn(async () => {
      if (mockWriteContractError) throw mockWriteContractError;
      return mockWriteContractResult;
    }),
    isPending: mockIsSubmitPending,
    error: mockWriteContractError,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: mockIsTxPending,
    isSuccess: mockIsTxSuccess,
    error: null,
  }),
}));

describe('useRedeem Hook', () => {
  const sampleToken = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserAddress = '0x1234567890123456789012345678901234567890';
    mockControllerAddress = '0x1111111111111111111111111111111111111111';
    mockWriteContractError = null;
    mockWriteContractResult = '0xRedeemTxHash1234567890abcdef';
    mockIsSubmitPending = false;
    mockIsTxPending = false;
    mockIsTxSuccess = false;
  });

  it('validates input and remains idle initially', () => {
    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    expect(result.current.status).toBe('idle');
    expect(result.current.txHash).toBeUndefined();
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('does not execute redemption if user address is missing', async () => {
    mockUserAddress = undefined;

    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.redeem(1000000000000000000n, 995000n);
    });

    expect(result.current.txHash).toBeUndefined();
  });

  it('handles successful share redemption', async () => {
    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.redeem(1000000000000000000n, 995000n);
    });

    expect(result.current.txHash).toBe('0xRedeemTxHash1234567890abcdef');
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('reports pending status during transaction receipt mining', () => {
    mockIsTxPending = true;

    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    expect(result.current.status).toBe('pending');
  });

  it('reports confirmed status and updates cached state upon success', () => {
    mockIsTxSuccess = true;

    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    expect(result.current.status).toBe('confirmed');
  });

  it('surfaces contract errors when redemption fails', async () => {
    mockWriteContractError = { code: 4001, message: 'User rejected the transaction' };

    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.redeem(1000000000000000000n, 1000000n);
    });

    expect(result.current.errorMessage).toBe('Connection request was rejected by the user.');
  });

  it('resets state when reset is called', async () => {
    const { result } = renderHook(() => useRedeem(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.redeem(1000000000000000000n, 995000n);
    });

    expect(result.current.txHash).toBe('0xRedeemTxHash1234567890abcdef');

    act(() => {
      result.current.reset();
    });

    expect(result.current.txHash).toBeUndefined();
    expect(result.current.status).toBe('idle');
  });
});
