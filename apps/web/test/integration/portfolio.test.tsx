import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Portfolio from '../../app/portfolio/page';
import { renderWithProviders, screen, userEvent } from '../utils';

// Mock WalletButton inside ConnectCard dynamically if rendered
vi.mock('../../components/web3/WalletButton', () => ({
  WalletButton: () => <button aria-label="Connect Web3 Wallet">Connect Wallet</button>,
}));

const mockRefetchPortfolio = vi.fn();

let mockWalletState: { isConnected: boolean; address?: string } = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890',
};
let mockNetworkState = { isSupported: true, chainId: 84532 };
let mockPortfolioState: any = {
  portfolio: {
    sharesBalance: 100000000000000000000n, // 100 shares
    sharesValueUSD: 200000000000000000000n, // $200
    walletCollateralUSD: 500000000000000000000n, // $500
    totalPortfolioValueUSD: 700000000000000000000n, // $700
    assetsBalances: [
      {
        symbol: 'USDC',
        name: 'USD Coin (Mock)',
        decimals: 6,
        balance: 500000000n, // 500 USDC balance
        assetValueUSD: 500000000000000000000n,
        redeemableAmount: 100000000n, // 100 USDC redeemable
        redeemableValueUSD: 100000000000000000000n,
        normalizedPrice: 1000000000000000000n,
      },
    ],
  },
  isLoading: false,
  refetch: mockRefetchPortfolio,
};

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => mockNetworkState,
}));

vi.mock('../../hooks/usePortfolio', () => ({
  usePortfolio: () => mockPortfolioState,
}));

describe('Portfolio Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = { isConnected: true, address: '0x1234567890123456789012345678901234567890' };
    mockNetworkState = { isSupported: true, chainId: 84532 };
    mockPortfolioState = {
      portfolio: {
        sharesBalance: 100000000000000000000n,
        sharesValueUSD: 200000000000000000000n,
        walletCollateralUSD: 500000000000000000000n,
        totalPortfolioValueUSD: 700000000000000000000n,
        assetsBalances: [
          {
            symbol: 'USDC',
            name: 'USD Coin (Mock)',
            decimals: 6,
            balance: 500000000n,
            assetValueUSD: 500000000000000000000n,
            redeemableAmount: 100000000n,
            redeemableValueUSD: 100000000000000000000n,
            normalizedPrice: 1000000000000000000n,
          },
        ],
      },
      isLoading: false,
      refetch: mockRefetchPortfolio,
    };
  });

  it('renders Portfolio page successfully with header and main sections', () => {
    renderWithProviders(<Portfolio />);

    expect(screen.getByRole('heading', { name: /your portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh portfolio balances/i })).toBeInTheDocument();
    expect(screen.getByText(/your collateral holdings/i)).toBeInTheDocument();
    expect(screen.getByText(/transaction activity/i)).toBeInTheDocument();
  });

  it('renders disconnected wallet prompt when wallet is disconnected', () => {
    mockWalletState = { isConnected: false, address: undefined };

    renderWithProviders(<Portfolio />);

    expect(screen.getByRole('heading', { name: /connect your wallet/i })).toBeInTheDocument();
  });

  it('renders unsupported network warning when connected to unsupported chain', () => {
    mockNetworkState = { isSupported: false, chainId: 1 };

    renderWithProviders(<Portfolio />);

    expect(screen.getByRole('heading', { name: /switch network/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /please connect your wallet to base sepolia to load your vault portfolio\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders loading skeletons while queries are pending', () => {
    mockPortfolioState = { ...mockPortfolioState, isLoading: true };

    const { container } = renderWithProviders(<Portfolio />);

    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders error state when portfolio queries fail or yield null data', () => {
    mockPortfolioState = {
      portfolio: null,
      isLoading: false,
      refetch: mockRefetchPortfolio,
    };

    renderWithProviders(<Portfolio />);

    expect(
      screen.getByRole('heading', { name: /no portfolio data available/i }),
    ).toBeInTheDocument();
  });

  it('renders empty portfolio state when user has zero shares balance', () => {
    mockPortfolioState = {
      portfolio: {
        sharesBalance: 0n,
        sharesValueUSD: 0n,
        walletCollateralUSD: 0n,
        totalPortfolioValueUSD: 0n,
        assetsBalances: [],
      },
      isLoading: false,
      refetch: mockRefetchPortfolio,
    };

    renderWithProviders(<Portfolio />);

    expect(screen.getByRole('heading', { name: /your portfolio is empty/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /make your first deposit/i })).toBeInTheDocument();
  });

  it('renders populated portfolio correctly with vault share balance, collateral values, and USD calculations', () => {
    renderWithProviders(<Portfolio />);

    expect(screen.getByText('$700.00')).toBeInTheDocument(); // Total Portfolio Value
    expect(screen.getByText('$200.00')).toBeInTheDocument(); // Withdrawable Vault Value
    expect(screen.getByText('100 Shares')).toBeInTheDocument(); // Index Holdings
    expect(screen.getByText('500 USDC')).toBeInTheDocument(); // Wallet balance
    expect(screen.getByText('100 USDC')).toBeInTheDocument(); // Redeemable collateral
    expect(screen.getByText('$100.00')).toBeInTheDocument(); // Withdrawable Value USD
  });

  it('displays vault share balance accurately in index holdings metric card', () => {
    mockPortfolioState.portfolio.sharesBalance = 2500000000000000000000n; // 2,500 shares

    renderWithProviders(<Portfolio />);

    expect(screen.getByText('2,500 Shares')).toBeInTheDocument();
  });

  it('displays collateral values and balance breakdown accurately in asset table', () => {
    mockPortfolioState.portfolio.assetsBalances = [
      {
        symbol: 'USDC',
        name: 'USD Coin (Mock)',
        decimals: 6,
        balance: 1000000000n, // 1,000 USDC
        assetValueUSD: 1000000000000000000000n, // $1,000
        redeemableAmount: 250000000n, // 250 USDC
        redeemableValueUSD: 250000000000000000000n, // $250
        normalizedPrice: 1000000000000000000n,
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ether (Mock)',
        decimals: 18,
        balance: 2000000000000000000n, // 2 WETH
        assetValueUSD: 6000000000000000000000n, // $6,000
        redeemableAmount: 500000000000000000n, // 0.5 WETH
        redeemableValueUSD: 1500000000000000000000n, // $1,500
        normalizedPrice: 3000000000000000000000n, // $3,000
      },
    ];

    renderWithProviders(<Portfolio />);

    expect(screen.getByText('1,000 USDC')).toBeInTheDocument();
    expect(screen.getByText('250 USDC')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();

    expect(screen.getByText('2 WETH')).toBeInTheDocument();
    expect(screen.getByText('0.5 WETH')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
  });

  it('displays USD calculations correctly across portfolio metrics', () => {
    mockPortfolioState.portfolio.totalPortfolioValueUSD = 1234560000000000000000n; // $1,234.56
    mockPortfolioState.portfolio.sharesValueUSD = 456780000000000000000n; // $456.78

    renderWithProviders(<Portfolio />);

    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    expect(screen.getByText('$456.78')).toBeInTheDocument();
  });

  it('triggers refetch and updates displayed balances when refresh balances button is clicked', async () => {
    const { rerender } = renderWithProviders(<Portfolio />);

    const refreshButton = screen.getByRole('button', { name: /refresh portfolio balances/i });
    await userEvent.click(refreshButton);

    expect(mockRefetchPortfolio).toHaveBeenCalledTimes(1);

    // Update mock data to reflect newly refetched balances
    mockPortfolioState = {
      ...mockPortfolioState,
      portfolio: {
        ...mockPortfolioState.portfolio,
        sharesBalance: 500000000000000000000n, // 500 shares
        totalPortfolioValueUSD: 1500000000000000000000n, // $1,500
        sharesValueUSD: 1000000000000000000000n, // $1,000
      },
    };

    rerender(<Portfolio />);

    expect(screen.getByText('500 Shares')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
  });

  it('updates portfolio metrics after mocked query invalidation', async () => {
    const { queryClient, rerender } = renderWithProviders(<Portfolio />);

    expect(screen.getByText('100 Shares')).toBeInTheDocument();
    expect(screen.getByText('$700.00')).toBeInTheDocument();

    // Simulate contract read updates arriving after query invalidation
    mockPortfolioState = {
      ...mockPortfolioState,
      portfolio: {
        ...mockPortfolioState.portfolio,
        sharesBalance: 300000000000000000000n, // 300 shares
        sharesValueUSD: 600000000000000000000n, // $600
        totalPortfolioValueUSD: 1800000000000000000000n, // $1,800
      },
    };

    // Invalidate queries via TanStack Query Client
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] });

    rerender(<Portfolio />);

    expect(screen.getByText('300 Shares')).toBeInTheDocument();
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();
    expect(screen.getByText('$600.00')).toBeInTheDocument();
  });
});
