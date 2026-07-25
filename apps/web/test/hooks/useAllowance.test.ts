import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAllowance } from '../../hooks/useAllowance';
import { TestProviders } from '../utils/renderWithProviders';

let mockReadContractsResult: any[] = [
  { status: 'success', result: 100000000n }, // Primary spender allowance
  { status: 'success', result: 100000000n }, // Secondary spender allowance
];
let mockWriteContractError: any = null;
let mockWriteContractResult = '0xTxHashApprove123';
let mockIsSubmitPending = false;
let mockIsTxPending = false;
let mockIsTxSuccess = false;
const mockWriteContractAsync = vi.fn(async () => {
  if (mockWriteContractError) throw mockWriteContractError;
  return mockWriteContractResult;
});

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234567890123456789012345678901234567890' }),
  useReadContracts: () => ({
    data: mockReadContractsResult,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsync,
    isPending: mockIsSubmitPending,
    error: mockWriteContractError,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: mockIsTxPending,
    isSuccess: mockIsTxSuccess,
    error: null,
  }),
  usePublicClient: () => ({
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
  }),
}));

describe('useAllowance Hook', () => {
  const tokenAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
  const primarySpender = '0x1111111111111111111111111111111111111111' as const;
  const secondarySpender = '0x2222222222222222222222222222222222222222' as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadContractsResult = [
      { status: 'success', result: 100000000n },
      { status: 'success', result: 100000000n },
    ];
    mockWriteContractError = null;
    mockWriteContractResult = '0xTxHashApprove123';
    mockIsSubmitPending = false;
    mockIsTxPending = false;
    mockIsTxSuccess = false;
  });

  it('returns effective allowance as primary allowance when no secondary spender is passed', () => {
    mockReadContractsResult = [{ status: 'success', result: 500000000n }];

    const { result } = renderHook(() => useAllowance(tokenAddress, primarySpender), {
      wrapper: TestProviders,
    });

    expect(result.current.allowance).toBe(500000000n);
  });

  it('returns minimum allowance between primary and secondary spenders', () => {
    mockReadContractsResult = [
      { status: 'success', result: 1000000000n }, // Primary: 1000 USDC
      { status: 'success', result: 200000000n }, // Secondary: 200 USDC
    ];

    const { result } = renderHook(
      () => useAllowance(tokenAddress, primarySpender, secondarySpender),
      { wrapper: TestProviders },
    );

    expect(result.current.allowance).toBe(200000000n);
  });

  it('approves both primary and secondary spenders when secondary allowance is lower than target amount', async () => {
    mockReadContractsResult = [
      { status: 'success', result: 0n }, // Primary needs approval
      { status: 'success', result: 0n }, // Secondary needs approval
    ];

    const { result } = renderHook(
      () => useAllowance(tokenAddress, primarySpender, secondarySpender),
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.approve(500000000n);
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(2);
    expect(mockWriteContractAsync).toHaveBeenNthCalledWith(1, {
      address: tokenAddress,
      abi: expect.any(Array),
      functionName: 'approve',
      args: [primarySpender, 500000000n],
    });
    expect(mockWriteContractAsync).toHaveBeenNthCalledWith(2, {
      address: tokenAddress,
      abi: expect.any(Array),
      functionName: 'approve',
      args: [secondarySpender, 500000000n],
    });
  });

  it('approves only primary spender if secondary spender already has sufficient allowance', async () => {
    mockReadContractsResult = [
      { status: 'success', result: 0n }, // Primary needs approval
      { status: 'success', result: 1000000000n }, // Secondary already has 1000 USDC
    ];

    const { result } = renderHook(
      () => useAllowance(tokenAddress, primarySpender, secondarySpender),
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.approve(500000000n);
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
    expect(mockWriteContractAsync).toHaveBeenCalledWith({
      address: tokenAddress,
      abi: expect.any(Array),
      functionName: 'approve',
      args: [primarySpender, 500000000n],
    });
  });
});
