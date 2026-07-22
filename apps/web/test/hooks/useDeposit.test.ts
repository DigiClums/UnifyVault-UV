import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeposit } from '../../hooks/useDeposit';
import { TestProviders } from '../utils/renderWithProviders';

let mockControllerAddress: string | undefined = '0x1111111111111111111111111111111111111111';
let mockWriteContractError: any = null;
let mockWriteContractResult = '0xTxHash1234567890abcdef';
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
  useSimulateContract: () => ({
    data: { request: { functionName: 'deposit' } },
    error: null,
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

describe('useDeposit Hook', () => {
  const sampleToken = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
  const sampleReceiver = '0x1234567890123456789012345678901234567890' as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mockControllerAddress = '0x1111111111111111111111111111111111111111';
    mockWriteContractError = null;
    mockWriteContractResult = '0xTxHash1234567890abcdef';
    mockIsSubmitPending = false;
    mockIsTxPending = false;
    mockIsTxSuccess = false;
  });

  it('validates input and remains idle initially', () => {
    const { result } = renderHook(() => useDeposit(sampleToken), { wrapper: TestProviders });

    expect(result.current.status).toBe('idle');
    expect(result.current.txHash).toBeUndefined();
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('handles successful deposit execution', async () => {
    const { result } = renderHook(() => useDeposit(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.deposit(1000000n, 995000n, sampleReceiver);
    });

    expect(result.current.txHash).toBe('0xTxHash1234567890abcdef');
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('reports pending transaction status when mining', () => {
    mockIsTxPending = true;

    const { result } = renderHook(() => useDeposit(sampleToken), { wrapper: TestProviders });

    expect(result.current.status).toBe('pending');
  });

  it('reports confirmed status upon transaction receipt confirmation', () => {
    mockIsTxSuccess = true;

    const { result } = renderHook(() => useDeposit(sampleToken), { wrapper: TestProviders });

    expect(result.current.status).toBe('confirmed');
  });

  it('surfaces contract errors when transaction fails', async () => {
    mockWriteContractError = { code: 4001, message: 'User rejected the transaction' };

    const { result } = renderHook(() => useDeposit(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.deposit(1000000n, 995000n, sampleReceiver);
    });

    expect(result.current.errorMessage).toBe('Connection request was rejected by the user.');
  });

  it('resets hook state when reset is called', async () => {
    const { result } = renderHook(() => useDeposit(sampleToken), { wrapper: TestProviders });

    await act(async () => {
      await result.current.deposit(1000000n, 995000n, sampleReceiver);
    });

    expect(result.current.txHash).toBe('0xTxHash1234567890abcdef');

    act(() => {
      result.current.reset();
    });

    expect(result.current.txHash).toBeUndefined();
    expect(result.current.status).toBe('idle');
  });
});
