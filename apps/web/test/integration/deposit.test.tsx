import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Deposit from '../../app/deposit/page';
import { renderWithProviders, screen, userEvent } from '../utils';

const mockConnect = vi.fn();
const mockSwitchChain = vi.fn();
const mockRefetchAssetBalance = vi.fn();
const mockRefetchShareBalance = vi.fn();
const mockRefetchAllowance = vi.fn();
const mockRefetchPreview = vi.fn();
const mockApprove = vi.fn();
const mockDeposit = vi.fn();
const mockResetApprove = vi.fn();
const mockResetDeposit = vi.fn();

let mockWalletState = { isConnected: true, connect: mockConnect };
let mockNetworkState = { isSupported: true, switchChain: mockSwitchChain, chainId: 84532 };
let mockAssetBalanceState: any = {
  balance: 1000000000n, // 1000 USDC
  decimals: 6,
  isLoading: false,
  refetch: mockRefetchAssetBalance,
};
let mockShareBalanceState: any = {
  balance: 50000000000000000000n, // 50 shares
  isLoading: false,
  refetch: mockRefetchShareBalance,
};
let mockAllowanceState: any = {
  allowance: 1000000000n, // 1000 USDC allowance
  approve: mockApprove,
  status: 'idle',
  errorMessage: undefined,
  refetch: mockRefetchAllowance,
  reset: mockResetApprove,
};
let mockDepositPreviewState: any = {
  quote: {
    depositAmount: 100000000n, // 100 USDC
    protocolFee: 250000n, // 0.25 USDC
    netDeposit: 99750000n, // 99.75 USDC
    sharesPreview: 99750000000000000000n, // 99.75 shares
    normalizedPrice: 1000000000000000000n,
    receiver: '0x1234567890123456789012345678901234567890',
  },
  isLoading: false,
  isError: false,
  refetch: mockRefetchPreview,
};
let mockDepositState: any = {
  deposit: mockDeposit,
  status: 'idle',
  errorMessage: undefined,
  reset: mockResetDeposit,
};

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => mockNetworkState,
}));

vi.mock('../../hooks/useControllerAddress', () => ({
  useControllerAddress: () => ({
    controllerAddress: '0x1111111111111111111111111111111111111111',
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useVaultAddress', () => ({
  useVaultAddress: () => ({
    vaultAddress: '0x2222222222222222222222222222222222222222',
  }),
}));

vi.mock('../../hooks/useIndexTokenAddress', () => ({
  useIndexTokenAddress: () => ({
    indexTokenAddress: '0x3333333333333333333333333333333333333333',
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useTokenBalance', () => ({
  useTokenBalance: (tokenAddress?: string) => {
    if (tokenAddress === '0x3333333333333333333333333333333333333333') {
      return mockShareBalanceState;
    }
    return mockAssetBalanceState;
  },
}));

vi.mock('../../hooks/useAllowance', () => ({
  useAllowance: () => mockAllowanceState,
}));

vi.mock('../../hooks/useDepositPreview', () => ({
  useDepositPreview: () => mockDepositPreviewState,
}));

vi.mock('../../hooks/useDeposit', () => ({
  useDeposit: () => mockDepositState,
}));

describe('Deposit Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = { isConnected: true, connect: mockConnect };
    mockNetworkState = { isSupported: true, switchChain: mockSwitchChain, chainId: 84532 };
    mockAssetBalanceState = {
      balance: 1000000000n,
      decimals: 6,
      isLoading: false,
      refetch: mockRefetchAssetBalance,
    };
    mockShareBalanceState = {
      balance: 50000000000000000000n,
      isLoading: false,
      refetch: mockRefetchShareBalance,
    };
    mockAllowanceState = {
      allowance: 1000000000n,
      approve: mockApprove,
      status: 'idle',
      errorMessage: undefined,
      refetch: mockRefetchAllowance,
      reset: mockResetApprove,
    };
    mockDepositPreviewState = {
      quote: {
        depositAmount: 100000000n,
        protocolFee: 250000n,
        netDeposit: 99750000n,
        sharesPreview: 99750000000000000000n,
        normalizedPrice: 1000000000000000000n,
        receiver: '0x1234567890123456789012345678901234567890',
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetchPreview,
    };
    mockDepositState = {
      deposit: mockDeposit,
      status: 'idle',
      errorMessage: undefined,
      reset: mockResetDeposit,
    };
  });

  it('renders Deposit page title and main form sections successfully', () => {
    renderWithProviders(<Deposit />);

    expect(screen.getByRole('heading', { name: /deposit collateral/i })).toBeInTheDocument();
    expect(screen.getByText(/interactive deposit form/i)).toBeInTheDocument();
    expect(screen.getByText(/live yield preview/i)).toBeInTheDocument();
  });

  it('renders wallet connection prompt when disconnected', () => {
    mockWalletState = { isConnected: false, connect: mockConnect };

    renderWithProviders(<Deposit />);

    expect(
      screen.getByRole('heading', { name: /wallet connection required/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('renders unsupported network warning when connected to unsupported chain', () => {
    mockNetworkState = { isSupported: false, switchChain: mockSwitchChain, chainId: 1 };

    renderWithProviders(<Deposit />);

    expect(screen.getByRole('heading', { name: /unsupported network/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to base sepolia/i })).toBeInTheDocument();
  });

  it('disables deposit action button when amount input is zero or empty', () => {
    renderWithProviders(<Deposit />);

    const depositButton = screen.getByRole('button', { name: /deposit usdc/i });
    expect(depositButton).toBeDisabled();
  });

  it('validates amount input and enables deposit action when valid amount is entered', async () => {
    renderWithProviders(<Deposit />);

    const amountInput = screen.getByLabelText(/deposit amount input/i);
    await userEvent.type(amountInput, '100');

    const depositButton = screen.getByRole('button', { name: /deposit usdc/i });
    expect(depositButton).not.toBeDisabled();
  });

  it('renders approve button state when allowance is lower than deposit amount', async () => {
    mockAllowanceState = { ...mockAllowanceState, allowance: 0n }; // Zero allowance

    renderWithProviders(<Deposit />);

    const amountInput = screen.getByLabelText(/deposit amount input/i);
    await userEvent.type(amountInput, '100');

    const approveButton = screen.getByRole('button', { name: /approve spend limit for usdc/i });
    expect(approveButton).toBeInTheDocument();
  });

  it('executes approve flow when approve button is clicked', async () => {
    mockAllowanceState = { ...mockAllowanceState, allowance: 0n };

    renderWithProviders(<Deposit />);

    const amountInput = screen.getByLabelText(/deposit amount input/i);
    await userEvent.type(amountInput, '100');

    const approveButton = screen.getByRole('button', { name: /approve spend limit for usdc/i });
    await userEvent.click(approveButton);

    expect(mockApprove).toHaveBeenCalledWith(100000000n); // 100 USDC (6 decimals)
  });

  it('executes deposit flow when deposit button is clicked', async () => {
    renderWithProviders(<Deposit />);

    const amountInput = screen.getByLabelText(/deposit amount input/i);
    await userEvent.type(amountInput, '100');

    const depositButton = screen.getByRole('button', { name: /deposit usdc/i });
    await userEvent.click(depositButton);

    expect(mockDeposit).toHaveBeenCalledWith(
      100000000n, // 100 USDC
      99251250000000000000n, // minSharesOut with 0.5% slippage
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('renders pending transaction state during deposit mining', async () => {
    mockDepositState = { ...mockDepositState, status: 'pending' };

    renderWithProviders(<Deposit />);

    expect(screen.getByText(/confirming deposit transaction\.\.\./i)).toBeInTheDocument();
  });

  it('renders success confirmation and refetches balances after successful deposit', async () => {
    mockDepositState = { ...mockDepositState, status: 'confirmed' };

    renderWithProviders(<Deposit />);

    expect(screen.getByText(/collateral deployed successfully!/i)).toBeInTheDocument();
    expect(mockRefetchAssetBalance).toHaveBeenCalled();
    expect(mockRefetchShareBalance).toHaveBeenCalled();
    expect(mockRefetchAllowance).toHaveBeenCalled();
    expect(mockRefetchPreview).toHaveBeenCalled();
  });

  it('displays contract error message when deposit fails', () => {
    mockDepositState = {
      ...mockDepositState,
      status: 'submitting',
      errorMessage: 'Deposit transaction reverted due to slippage',
    };

    renderWithProviders(<Deposit />);

    expect(screen.getByText(/deposit failed/i)).toBeInTheDocument();
    expect(screen.getByText(/deposit transaction reverted due to slippage/i)).toBeInTheDocument();
  });

  it('sets max balance into amount input when Max button is clicked', async () => {
    renderWithProviders(<Deposit />);

    const maxButton = screen.getByRole('button', { name: /^max$/i });
    await userEvent.click(maxButton);

    const amountInput = screen.getByLabelText(/deposit amount input/i) as HTMLInputElement;
    expect(amountInput.value).toBe('1000');
  });
});
