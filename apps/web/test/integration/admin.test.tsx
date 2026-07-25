import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Admin from '../../app/admin/page';
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

let mockRolesState = {
  isAdmin: false,
  isGovernance: false,
  isGuardian: false,
  isController: false,
  isReadOnly: true,
};

vi.mock('../../hooks/useGovernance', () => ({
  useGovernance: () => ({
    roles: mockRolesState,
    governanceData: undefined,
    isLoading: false,
  }),
}));

describe('Admin Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolesState = {
      isAdmin: false,
      isGovernance: false,
      isGuardian: false,
      isController: false,
      isReadOnly: true,
    };
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

  it('renders Admin Page title, header, and overview metrics cards', () => {
    renderWithProviders(<Admin />);

    expect(
      screen.getByRole('heading', { name: /production admin dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh admin console data/i })).toBeInTheDocument();
    expect(screen.getByText('Total Value Locked (TVL)')).toBeInTheDocument();
    expect(screen.getByText('Current Index NAV')).toBeInTheDocument();
    expect(screen.getByText('Total UVBTCETH Supply')).toBeInTheDocument();
    expect(screen.getByText('Treasury Fee Reserves')).toBeInTheDocument();
  });

  it('renders Read-only Mode banner when connected wallet is not admin', () => {
    renderWithProviders(<Admin />);

    expect(screen.getByRole('heading', { name: /^read-only mode$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/read-only mode/i).length).toBeGreaterThan(0);
  });

  it('renders Admin Access Granted banner and pause/resume buttons when wallet is admin', () => {
    mockRolesState = {
      isAdmin: true,
      isGovernance: true,
      isGuardian: true,
      isController: false,
      isReadOnly: false,
    };

    renderWithProviders(<Admin />);

    expect(screen.getByText(/admin access granted \(authorized\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause protocol/i })).toBeInTheDocument();
  });

  it('renders loading skeletons while admin data is fetching', () => {
    mockDashboardState = { ...mockDashboardState, isLoading: true, data: undefined };

    const { container } = renderWithProviders(<Admin />);

    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders error state when admin fetch fails or data is missing', () => {
    mockDashboardState = {
      ...mockDashboardState,
      isLoading: false,
      data: undefined,
      error: new Error('Contract read failed'),
    };

    renderWithProviders(<Admin />);

    expect(
      screen.getByRole('heading', { name: /no protocol admin data available/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /retry loading admin console/i }),
    ).toBeInTheDocument();
  });

  it('renders Oracle monitoring table and contract registry details', () => {
    renderWithProviders(<Admin />);

    expect(screen.getByText(/chainlink oracle monitoring/i)).toBeInTheDocument();
    expect(screen.getByText(/usdc\/usd/i)).toBeInTheDocument();
    expect(screen.getByText(/active \(fresh\)/i)).toBeInTheDocument();
    expect(screen.getByText(/protocol contract registry/i)).toBeInTheDocument();
    expect(screen.getByText(/base sepolia \(84532\)/i)).toBeInTheDocument();
  });

  it('triggers refetch when Refresh Admin Console button is clicked', async () => {
    renderWithProviders(<Admin />);

    const refreshButton = screen.getByRole('button', { name: /refresh admin console data/i });
    await userEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
