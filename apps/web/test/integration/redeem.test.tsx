import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Redeem from '../../app/redeem/page';
import { renderWithProviders, screen, userEvent } from '../utils';

const mockConnect = vi.fn();
const mockSwitchChain = vi.fn();
const mockRefetchAssetBalance = vi.fn();
const mockRefetchShareBalance = vi.fn();
const mockRefetchPreview = vi.fn();
const mockRedeem = vi.fn().mockResolvedValue(undefined);

let mockWalletState = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890',
  connect: mockConnect,
};
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
  previewAssets: 100000000n,
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

vi.mock('../../hooks/usePortfolio', () => ({
  usePortfolio: () => ({
    portfolio: null,
    navData: { totalPortfolioValueUSD: 1000000000000000000n, navPerShare: 1000000000000000000n },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

describe('Redeem Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = {
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      connect: mockConnect,
    };
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
      previewAssets: 100000000n,
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
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await user.type(sharesInput, '10');

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    expect(redeemButton).not.toBeDisabled();
  });

  it('shows error warning when redeem amount exceeds available share balance', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await user.type(sharesInput, '100'); // User has 50 shares

    expect(screen.getByText(/insufficient uvbtceth share balance\./i)).toBeInTheDocument();

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    expect(redeemButton).toBeDisabled();
  });

  it('populates available share balance when Max button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Redeem />);

    const maxButton = screen.getByRole('button', { name: /^max$/i });
    await user.click(maxButton);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i) as HTMLInputElement;
    expect(sharesInput.value).toBe('50');
  });

  it('populates share balance input correctly when 25%, 50%, 75%, and 100% preset buttons are clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Redeem />);

    const btn25 = screen.getByRole('button', { name: '25%' });
    await user.click(btn25);
    const sharesInput = screen.getByLabelText(/redeem shares amount input/i) as HTMLInputElement;
    expect(sharesInput.value).toBe('12.5');

    const btn50 = screen.getByRole('button', { name: '50%' });
    await user.click(btn50);
    expect(sharesInput.value).toBe('25');

    const btn75 = screen.getByRole('button', { name: '75%' });
    await user.click(btn75);
    expect(sharesInput.value).toBe('37.5');

    const btn100 = screen.getByRole('button', { name: '100%' });
    await user.click(btn100);
    expect(sharesInput.value).toBe('50');
  });

  it('executes redeem flow when redeem button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await user.type(sharesInput, '10');

    const redeemButton = screen.getByRole('button', { name: /redeem for usdc/i });
    await user.click(redeemButton);

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

  it('renders success confirmation and refetches balances after successful redemption', async () => {
    mockRedeemState = { ...mockRedeemState, status: 'confirmed' };

    renderWithProviders(<Redeem />);

    expect(await screen.findByText(/redemption completed successfully!/i)).toBeInTheDocument();
    expect(mockRefetchShareBalance).toHaveBeenCalled();
    expect(mockRefetchAssetBalance).toHaveBeenCalled();
    expect(mockRefetchPreview).toHaveBeenCalled();
  });

  it('displays contract error message when redemption fails', async () => {
    mockRedeemState = {
      ...mockRedeemState,
      status: 'submitting',
      errorMessage: 'Redemption reverted: Slippage limit exceeded',
    };

    renderWithProviders(<Redeem />);

    expect(await screen.findByText(/redemption failed/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/redemption reverted: slippage limit exceeded/i),
    ).toBeInTheDocument();
  });

  it('displays $0.01 USDC for Protocol Redeem Fee when redeeming 8.9775 shares with 0.10% fee, not $0.00', async () => {
    const user = userEvent.setup({ delay: null });
    // 8.9775 shares => gross 8,977,500 units USDC
    // 0.10% fee = 8,977 units (0.008977 USDC)
    // Net out = 8,968,523 units USDC
    mockRedeemPreviewState = {
      previewAssets: 8968523n,
      netAssetsOut: 8968523n,
      grossAssets: 8977500n,
      protocolFee: 8977n,
      isLoading: false,
      isError: false,
      refetch: mockRefetchPreview,
    };

    renderWithProviders(<Redeem />);

    const sharesInput = screen.getByLabelText(/redeem shares amount input/i);
    await user.type(sharesInput, '8.9775');

    expect(screen.getByText('Protocol Redeem Fee (0.10%)')).toBeInTheDocument();
    expect(screen.getByText('$0.01 USDC')).toBeInTheDocument();
    expect(screen.queryByText('$0.00 USDC')).not.toBeInTheDocument();
  });
});
