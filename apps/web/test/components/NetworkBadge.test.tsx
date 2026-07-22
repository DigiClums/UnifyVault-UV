import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkBadge } from '../../components/web3/NetworkBadge';
import { renderWithProviders, screen } from '../utils';

// Mock custom hooks used by NetworkBadge
vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';

describe('NetworkBadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when wallet is disconnected', () => {
    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      address: undefined,
      status: 'disconnected',
    } as any);
    vi.mocked(useNetwork).mockReturnValue({
      chainId: 84532,
      chain: undefined,
      isSupported: false,
    } as any);

    const { container } = renderWithProviders(<NetworkBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correct network name for a supported network', () => {
    vi.mocked(useWallet).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      status: 'connected',
    } as any);
    vi.mocked(useNetwork).mockReturnValue({
      chainId: 84532,
      chain: { id: 84532, name: 'Base Sepolia' },
      isSupported: true,
    } as any);

    renderWithProviders(<NetworkBadge />);
    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
  });

  it('renders warning indicator for an unsupported network', () => {
    vi.mocked(useWallet).mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
      status: 'connected',
    } as any);
    vi.mocked(useNetwork).mockReturnValue({
      chainId: 1,
      chain: { id: 1, name: 'Ethereum Mainnet' },
      isSupported: false,
    } as any);

    renderWithProviders(<NetworkBadge />);
    expect(screen.getByText('Unsupported (Ethereum Mainnet)')).toBeInTheDocument();
  });
});
