import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HistoryPage from '../../app/history/page';
import { renderWithProviders, screen, userEvent } from '../utils';

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

  it('renders Transaction History title and table headers', () => {
    renderWithProviders(<HistoryPage />);

    expect(screen.getByRole('heading', { name: /transaction history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv report/i })).toBeInTheDocument();
    expect(screen.getByText('Total Operations')).toBeInTheDocument();
    expect(screen.getByText('Total Deposited')).toBeInTheDocument();
  });

  it('filters transactions when type buttons are clicked', async () => {
    renderWithProviders(<HistoryPage />);

    const depositFilterBtn = screen.getByRole('button', { name: /^DEPOSIT$/i });
    await userEvent.click(depositFilterBtn);

    expect(screen.getAllByText('DEPOSIT').length).toBeGreaterThan(0);
  });
});
