import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Redeem from '../../app/redeem/page';
import { renderWithProviders, screen, userEvent } from '../utils';

const mockConnect = vi.fn();
const mockSwitchChain = vi.fn();
const mockRefetchAssetBalance = vi.fn();
const mockRefetchShareBalance = vi.fn();
const mockRefetchPreview = vi.fn();
const mockRedeem = vi.fn();

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
let mockRedeemPreviewState: any = {
  netAssetsOut: 100000000n, // 100 USDC net out
  isLoading: false,
  isError: false,
  refetch: mockRefetchPreview,
};
let mockRedeemState: any = {
  redeem: mockRedeem,
  status: 'idle',
  errorMessage: undefined,
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

vi.mock('../../hooks/useRedeemPreview', () => ({
  useRedeemPreview: () => mockRedeemPreviewState,
}));

vi.mock('../../hooks/useRedeem', () => ({
  useRedeem: () => mockRedeemState,
}));

describe('Redeem Page Integration Tests', () => {
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
    mockRedeemPreviewState = {
      netAssetsOut: 100000000n,
      isLoading: false,
      isError: false,
      refetch: mockRefetchPreview,
    };
    mockRedeemState = {
      redeem: mockRedeem,
      status: 'idle',
      errorMessage: undefined,
    };
  });

  it('renders Redeem page title and main form sections successfully', () => {
    renderWithProviders(<Redeem />);

    expect(screen.getByRole('heading', { name: /redeem vault shares/i })).toBeInTheDocument();
    expect(screen.getByText(/interactive withdrawal form/i)).toBeInTheDocument();
    expect(screen.getByText(/redemption preview/i)).toBeInTheDocument();
  });

  it('renders wallet connection prompt when disconnected', () => {
    mockWalletState = { isConnected: false, connect: mockConnect };

    renderWithProviders(<Redeem />);

    expect(
      screen.getByRole('heading', { name: /wallet connection required/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('renders unsupported network warning when connected to unsupported chain', () => {
    mockNetworkState = { isSupported: false, switchChain: mockSwitchChain, chainId: 1 };

    renderWithProviders(<Redeem />);

    expect(screen.getByRole('heading', { name: /unsupported network/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to base sepolia/i })).toBeInTheDocument();
  });

  it('renders empty portfolio state when user has zero share balance', () => {
    mockShareBalanceState = { ...mockShareBalanceState, balance: 0n };

    renderWithProviders(<Redeem />);

    expect(screen.getByText('0 UVBTCETH')).toBeInTheDocument();
  });

  it('disables redeem action button when amount input is zero or empty', () => {
    renderWithProviders(<Redeem />);

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    expect(redeemButton).toBeDisabled();
  });

  it('validates amount input and enables redeem button when valid shares amount is entered', async () => {
    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await userEvent.type(sharesInput, '10');

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    expect(redeemButton).not.toBeDisabled();
  });

  it('shows error warning when redeem amount exceeds available share balance', async () => {
    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await userEvent.type(sharesInput, '100'); // User has 50 shares

    expect(screen.getByText(/insufficient uvbtceth share balance\./i)).toBeInTheDocument();

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    expect(redeemButton).toBeDisabled();
  });

  it('populates available share balance when Max button is clicked', async () => {
    renderWithProviders(<Redeem />);

    const maxButton = screen.getByRole('button', { name: /^max$/i });
    await userEvent.click(maxButton);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i) as HTMLInputElement;
    expect(sharesInput.value).toBe('50');
  });

  it('executes redeem flow when redeem button is clicked', async () => {
    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await userEvent.type(sharesInput, '10');

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    await userEvent.click(redeemButton);

    expect(mockRedeem).toHaveBeenCalledWith(
      10000000000000000000n, // 10 shares
      99500000n, // minAssetsOut with 0.5% slippage
    );
  });

  it('renders pending transaction UI during redemption mining', () => {
    mockRedeemState = { ...mockRedeemState, status: 'pending' };

    renderWithProviders(<Redeem />);

    expect(screen.getByText(/burning shares\.\.\./i)).toBeInTheDocument();
  });

  it('renders success confirmation and refetches balances after successful redemption', () => {
    mockRedeemState = { ...mockRedeemState, status: 'confirmed' };

    renderWithProviders(<Redeem />);

    expect(screen.getByText(/redemption completed successfully!/i)).toBeInTheDocument();
    expect(mockRefetchShareBalance).toHaveBeenCalled();
    expect(mockRefetchAssetBalance).toHaveBeenCalled();
    expect(mockRefetchPreview).toHaveBeenCalled();
  });

  it('displays contract error message when redemption fails', () => {
    mockRedeemState = {
      ...mockRedeemState,
      status: 'submitting',
      errorMessage: 'Redemption reverted: Slippage limit exceeded',
    };

    renderWithProviders(<Redeem />);

    expect(screen.getByText(/redemption failed/i)).toBeInTheDocument();
    expect(screen.getByText(/redemption reverted: slippage limit exceeded/i)).toBeInTheDocument();
  });
});
