import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HistoryPage from '../../app/history/page';
import { renderWithProviders, screen } from '../utils';

let mockWalletState = {
  isConnected: true,
  address: '0x1234567890123456789012345678901234567890',
};

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => mockWalletState,
}));

describe('History Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState = {
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    };
  });

  it('renders Transaction History title and empty state UI when no transactions exist', () => {
    renderWithProviders(<HistoryPage />);

    expect(screen.getByRole('heading', { name: /transaction history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv report/i })).toBeInTheDocument();
    expect(screen.getByText('Total Operations')).toBeInTheDocument();
    expect(screen.getByText('Total Deposited')).toBeInTheDocument();
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /deposit usdc collateral/i })).toBeInTheDocument();
  });
});
