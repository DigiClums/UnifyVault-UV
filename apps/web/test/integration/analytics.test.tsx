import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Analytics from '../../app/analytics/page';
import { renderWithProviders, screen, userEvent } from '../utils';

const mockRefetch = vi.fn();

let mockDashboardState: any = {
  data: {
    addresses: {
      directory: '0x1111111111111111111111111111111111111111',
      controller: '0x2222222222222222222222222222222222222222',
      liquidityVault: '0x3333333333333333333333333333333333333333',
      custodyVault: '0x4444444444444444444444444444444444444444',
      treasury: '0x5555555555555555555555555555555555555555',
      oracle: '0x6666666666666666666666666666666666666666',
      indexToken: '0x7777777777777777777777777777777777777777',
      usdc: '0x8888888888888888888888888888888888888888',
      cbBTC: '0x9999999999999999999999999999999999999999',
      weth: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
    TVL: {
      rawUsd: 1000000000000000000000000n,
      formattedUsd: '$1,000,000.00',
      usdValueNumber: 1000000,
    },
    NAV: {
      rawNavPerShare: 1000000000000000000n,
      formattedNavPerShare: '$1.0000',
      navUsdNumber: 1.0,
    },
    TotalSupply: {
      raw: 1000000000000000000000000n,
      formatted: '1,000,000',
    },
    TreasuryFees: {
      totalUsdNumber: 2500,
      totalUsdFormatted: '$2,500.00',
      nativeBalanceRaw: 100000000000000000n,
      nativeBalanceFormatted: '0.1000',
      balances: [],
    },
    CustodyAssets: [],
    UserShareBalance: {
      rawShares: 0n,
      formattedShares: '0.00',
      usdValueNumber: 0,
      ownershipPercentage: 0,
      userUsdcBalanceRaw: 0n,
      userUsdcBalanceFormatted: '0.00',
    },
    OracleStatus: {
      isHealthy: true,
      feeds: [
        {
          symbol: 'USDC/USD',
          address: '0x1111111111111111111111111111111111111111',
          priceUsdRaw: 100000000n,
          priceUsdNumber: 1.0,
          isFresh: true,
        },
      ],
    },
    LiquidityStatus: {
      needsRefill: false,
      needsSweep: false,
      amountRaw: 0n,
      operationalBalanceRaw: 500000000n,
      reserveBalanceRaw: 500000000n,
      totalBalanceRaw: 1000000000n,
    },
    HealthStatus: {
      isHealthy: true,
      isPaused: false,
      isDirectoryResolved: true,
      timestamp: Date.now(),
    },
  },
  isLoading: false,
  error: undefined,
  refetch: mockRefetch,
};

vi.mock('../../hooks/useDashboardService', () => ({
  useDashboardService: () => mockDashboardState,
}));

describe('Analytics Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDashboardState = {
      data: {
        addresses: {
          directory: '0x1111111111111111111111111111111111111111',
          controller: '0x2222222222222222222222222222222222222222',
          liquidityVault: '0x3333333333333333333333333333333333333333',
          custodyVault: '0x4444444444444444444444444444444444444444',
          treasury: '0x5555555555555555555555555555555555555555',
          oracle: '0x6666666666666666666666666666666666666666',
          indexToken: '0x7777777777777777777777777777777777777777',
          usdc: '0x8888888888888888888888888888888888888888',
          cbBTC: '0x9999999999999999999999999999999999999999',
          weth: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        },
        TVL: {
          rawUsd: 1000000000000000000000000n,
          formattedUsd: '$1,000,000.00',
          usdValueNumber: 1000000,
        },
        NAV: {
          rawNavPerShare: 1000000000000000000n,
          formattedNavPerShare: '$1.0000',
          navUsdNumber: 1.0,
        },
        TotalSupply: {
          raw: 1000000000000000000000000n,
          formatted: '1,000,000',
        },
        TreasuryFees: {
          totalUsdNumber: 2500,
          totalUsdFormatted: '$2,500.00',
          nativeBalanceRaw: 100000000000000000n,
          nativeBalanceFormatted: '0.1000',
          balances: [],
        },
        CustodyAssets: [],
        UserShareBalance: {
          rawShares: 0n,
          formattedShares: '0.00',
          usdValueNumber: 0,
          ownershipPercentage: 0,
          userUsdcBalanceRaw: 0n,
          userUsdcBalanceFormatted: '0.00',
        },
        OracleStatus: {
          isHealthy: true,
          feeds: [
            {
              symbol: 'USDC/USD',
              address: '0x1111111111111111111111111111111111111111',
              priceUsdRaw: 100000000n,
              priceUsdNumber: 1.0,
              isFresh: true,
            },
          ],
        },
        LiquidityStatus: {
          needsRefill: false,
          needsSweep: false,
          amountRaw: 0n,
          operationalBalanceRaw: 500000000n,
          reserveBalanceRaw: 500000000n,
          totalBalanceRaw: 1000000000n,
        },
        HealthStatus: {
          isHealthy: true,
          isPaused: false,
          isDirectoryResolved: true,
          timestamp: Date.now(),
        },
      },
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    };
  });

  it('renders Analytics page title, header, and main section cards', () => {
    renderWithProviders(<Analytics />);

    expect(
      screen.getByRole('heading', { name: /protocol analytics dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh analytics data/i })).toBeInTheDocument();
    expect(screen.getByText('Total Value Locked (TVL)')).toBeInTheDocument();
    expect(screen.getByText('NAV Per Share')).toBeInTheDocument();
    expect(screen.getByText('Total Shares Supply')).toBeInTheDocument();
    expect(screen.getByText('Treasury Fee Reserves')).toBeInTheDocument();
  });

  it('renders loading skeletons while analytics data is fetching', () => {
    mockDashboardState = { ...mockDashboardState, isLoading: true, data: undefined };

    const { container } = renderWithProviders(<Analytics />);

    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders error state when analytics fetch fails or data is missing', () => {
    mockDashboardState = {
      ...mockDashboardState,
      isLoading: false,
      data: undefined,
      error: new Error('Contract read failed'),
    };

    renderWithProviders(<Analytics />);

    expect(
      screen.getByRole('heading', { name: /no protocol analytics data available/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry loading analytics/i })).toBeInTheDocument();
  });

  it('renders disabled historical data export button with disclaimer text', () => {
    renderWithProviders(<Analytics />);

    const exportButton = screen.getByRole('button', {
      name: /historical export is unavailable\./i,
    });
    expect(exportButton).toBeDisabled();
  });

  it('renders live protocol metrics correctly across overview cards', () => {
    renderWithProviders(<Analytics />);

    expect(screen.getByText('$1,000,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1.0000')).toBeInTheDocument();
    expect(screen.getByText('1,000,000 Shares')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
  });

  it('renders Oracle status and Liquidity Buffer cards', () => {
    renderWithProviders(<Analytics />);

    expect(screen.getByText(/chainlink oracle status/i)).toBeInTheDocument();
    expect(screen.getByText(/oracles operational/i)).toBeInTheDocument();
    expect(screen.getByText(/liquidity buffer status/i)).toBeInTheDocument();
  });

  it('triggers refetch when Refresh Analytics button is clicked', async () => {
    renderWithProviders(<Analytics />);

    const refreshButton = screen.getByRole('button', { name: /refresh analytics data/i });
    await userEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
