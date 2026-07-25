import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../../app/dashboard/page';
import { renderWithProviders, screen, userEvent } from '../utils';

// Mock next/dynamic
vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockWalletButton() {
      return <button aria-label="Connect Web3 Wallet">Connect Wallet</button>;
    };
  },
}));

const mockRefetch = vi.fn();

let mockWalletState: { isConnected: boolean; address?: string } = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890',
};

const defaultDashboardData = {
  addresses: {
    directory: '0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722',
    controller: '0xa8c6Baf298122d700269C0B331406522450ba967',
    vault: '0x11202B3Da20bB5432E3Be4A56743Ef879683b09F',
    treasury: '0x90723e17B8936f587078929869a2b5D4e434F8DD',
    token: '0x56CF4750EC2E1d66E76e51B2cF3405CbA9487d83',
    oracleManager: '0x11396dB2272a71841cfBe855c6e330CEE657CFe0',
    strategyManager: '0x882421d092e593165744F0D15c9F7F37318B5601',
    portfolioManager: '0xFb30D207164a32c1d963243362D7600cd1FBC609',
    swapAdapter: '0x3d85434A0D92d09B2eC098aa0822F57Fd81beb6D',
    liquidityManager: '0xad3c7a8d05333a4cA9eBF6f131E4C12Af9C05EA0',
  },
  TVL: { rawUsd: 1000000000000000000000n, formattedUsd: '$1,000.00', usdValueNumber: 1000 },
  NAV: { rawNavPerShare: 1000000000000000000n, formattedNavPerShare: '$1.0000', navUsdNumber: 1.0 },
  TotalSupply: { raw: 500000000000000000000n, formatted: '500.00' },
  TreasuryFees: {
    totalUsdNumber: 0,
    totalUsdFormatted: '$0.00',
    nativeBalanceRaw: 0n,
    nativeBalanceFormatted: '0.00',
    balances: [],
  },
  CustodyAssets: [
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      symbol: 'USDC',
      decimals: 6,
      weightBps: 10000,
      weightPercent: 100,
      custodyBalanceRaw: 1000000000n,
      custodyBalanceFormatted: '1000.00',
      priceUsdRaw: 1000000000000000000n,
      priceUsdNumber: 1.0,
      custodyUsdValueNumber: 1000.0,
    },
  ],
  UserShareBalance: {
    userAddress: '0x1234567890123456789012345678901234567890',
    rawShares: 100000000000000000000n,
    formattedShares: '100.00',
    usdValueNumber: 100.0,
    ownershipPercentage: 20,
    userUsdcBalanceRaw: 500000000n,
    userUsdcBalanceFormatted: '500.00',
  },
  OracleStatus: {
    isHealthy: true,
    feeds: [
      {
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        symbol: 'USDC',
        isFresh: true,
        priceUsdRaw: 1000000000000000000n,
        priceUsdNumber: 1.0,
      },
    ],
  },
  LiquidityStatus: {
    needsRefill: false,
    needsSweep: false,
    amountRaw: 0n,
    operationalBalanceRaw: 100000n,
    reserveBalanceRaw: 900000n,
    totalBalanceRaw: 1000000n,
  },
  HealthStatus: {
    isHealthy: true,
    isPaused: false,
    isDirectoryResolved: true,
    timestamp: 1700000000000,
  },
};

let mockDashboardState: any = {
  data: defaultDashboardData,
  isLoading: false,
  error: undefined,
  refetch: mockRefetch,
};

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

vi.mock('../../hooks/useDashboardService', () => ({
  useDashboardService: () => mockDashboardState,
}));

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = { isConnected: true, address: '0x1234567890123456789012345678901234567890' };
    mockDashboardState = {
      data: defaultDashboardData,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    };
  });

  it('renders Dashboard page header and main sections successfully', () => {
    renderWithProviders(<Dashboard />);

    expect(
      screen.getByRole('heading', { name: /unifyvault v2 live protocol dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh dashboard metrics/i })).toBeInTheDocument();
    expect(screen.getAllByText(/total value locked/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/on-chain protocol directory registry/i)).toBeInTheDocument();
  });

  it('renders loading skeletons while queries are pending', () => {
    mockDashboardState = { ...mockDashboardState, isLoading: true };

    const { container } = renderWithProviders(<Dashboard />);

    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders vault metrics correctly after successful queries', () => {
    renderWithProviders(<Dashboard />);

    expect(screen.getAllByText('$1,000.00').length).toBeGreaterThan(0); // TVL
    expect(screen.getByText('500.00 UVBTCETH')).toBeInTheDocument(); // Supply
  });

  it('triggers refetch when refresh button is clicked', async () => {
    renderWithProviders(<Dashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh dashboard metrics/i });
    await userEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });
});
