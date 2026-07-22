import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../../app/dashboard/page';
import { renderWithProviders, screen, userEvent } from '../utils';

// Mock next/dynamic to render components synchronously in test environment
vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockWalletButton() {
      return <button aria-label="Connect Web3 Wallet">Connect Wallet</button>;
    };
  },
}));

// Mock hooks
const mockRefetchMetrics = vi.fn();
const mockRefetchPortfolio = vi.fn();

let mockWalletState: { isConnected: boolean; address?: string } = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890',
};
let mockVaultMetricsState: any = {
  metrics: {
    totalSupply: 500000000000000000000n, // 500 shares
    totalTvlUSD: 1000000000000000000000n, // $1000 USD
    maxDepositLimit: 1000000000000000000000000n, // 1M limit
    vaultAddress: '0x2222222222222222222222222222222222222222',
    indexTokenAddress: '0x3333333333333333333333333333333333333333',
    assetAllocations: [
      {
        symbol: 'USDC',
        name: 'USD Coin (Mock)',
        decimals: 6,
        totalAssets: 1000000000n,
        normalizedPrice: 1000000000000000000n,
        assetTvlUSD: 1000000000000000000000n,
      },
    ],
  },
  isLoading: false,
  refetch: mockRefetchMetrics,
};

let mockPortfolioState: any = {
  portfolio: {
    sharesBalance: 100000000000000000000n, // 100 shares
    sharesValueUSD: 200000000000000000000n, // $200
    walletCollateralUSD: 500000000000000000000n, // $500
    totalPortfolioValueUSD: 700000000000000000000n, // $700
    assetsBalances: [],
  },
  isLoading: false,
  refetch: mockRefetchPortfolio,
};

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('../../hooks/useVaultMetrics', () => ({
  useVaultMetrics: () => mockVaultMetricsState,
}));

vi.mock('../../hooks/usePortfolio', () => ({
  usePortfolio: () => mockPortfolioState,
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = { isConnected: true, address: '0x1234567890123456789012345678901234567890' };
    mockVaultMetricsState = {
      metrics: {
        totalSupply: 500000000000000000000n,
        totalTvlUSD: 1000000000000000000000n,
        maxDepositLimit: 1000000000000000000000000n,
        vaultAddress: '0x2222222222222222222222222222222222222222',
        indexTokenAddress: '0x3333333333333333333333333333333333333333',
        assetAllocations: [
          {
            symbol: 'USDC',
            name: 'USD Coin (Mock)',
            decimals: 6,
            totalAssets: 1000000000n,
            normalizedPrice: 1000000000000000000n,
            assetTvlUSD: 1000000000000000000000n,
          },
        ],
      },
      isLoading: false,
      refetch: mockRefetchMetrics,
    };
    mockPortfolioState = {
      portfolio: {
        sharesBalance: 100000000000000000000n,
        sharesValueUSD: 200000000000000000000n,
        walletCollateralUSD: 500000000000000000000n,
        totalPortfolioValueUSD: 700000000000000000000n,
        assetsBalances: [],
      },
      isLoading: false,
      refetch: mockRefetchPortfolio,
    };
  });

  it('renders Dashboard page header and main sections successfully', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: /protocol dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh dashboard metrics/i })).toBeInTheDocument();
    expect(screen.getByText(/my portfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
  });

  it('renders loading skeletons while queries are pending', () => {
    mockVaultMetricsState = { ...mockVaultMetricsState, isLoading: true };

    const { container } = renderWithProviders(<Dashboard />);

    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders vault metrics correctly after successful queries', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getAllByText('$1,000.00').length).toBeGreaterThan(0); // TVL
    expect(screen.getByText('500 Shares')).toBeInTheDocument(); // Supply
    expect(screen.getByText(/holdings & asset allocation/i)).toBeInTheDocument();
  });

  it('renders portfolio summary correctly for connected populated portfolio', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getByText('$700.00')).toBeInTheDocument(); // Portfolio total
    expect(screen.getByText('100')).toBeInTheDocument(); // Shares balance
    expect(screen.getByText('$200.00')).toBeInTheDocument(); // Redeemable USD
  });

  it('renders empty portfolio prompt when user has zero shares balance', () => {
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

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: /your portfolio is empty\./i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /make first deposit/i })).toBeInTheDocument();
  });

  it('renders wallet disconnected prompt when user wallet is disconnected', () => {
    mockWalletState = { isConnected: false, address: undefined };

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: /view portfolio metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect web3 wallet/i })).toBeInTheDocument();
  });

  it('renders zero-value state when protocol TVL is zero', () => {
    mockVaultMetricsState = {
      metrics: {
        totalSupply: 0n,
        totalTvlUSD: 0n,
        maxDepositLimit: 1000000000000000000000000n,
        vaultAddress: '0x2222222222222222222222222222222222222222',
        indexTokenAddress: '0x3333333333333333333333333333333333333333',
        assetAllocations: [],
      },
      isLoading: false,
      refetch: mockRefetchMetrics,
    };

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: /no deposits yet/i })).toBeInTheDocument();
  });

  it('triggers refetch when refresh button is clicked', async () => {
    renderWithProviders(<Dashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh dashboard metrics/i });
    await userEvent.click(refreshButton);

    expect(mockRefetchMetrics).toHaveBeenCalled();
    expect(mockRefetchPortfolio).toHaveBeenCalled();
  });
});
