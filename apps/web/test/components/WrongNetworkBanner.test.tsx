import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WrongNetworkBanner } from '../../components/web3/WrongNetworkBanner';
import { renderWithProviders, screen, userEvent } from '../utils';

vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';

describe('WrongNetworkBanner Component', () => {
  const mockSwitchChain = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hidden on supported network', () => {
    vi.mocked(useWallet).mockReturnValue({ isConnected: true } as any);
    vi.mocked(useNetwork).mockReturnValue({
      isSupported: true,
      switchChain: mockSwitchChain,
      switchChainPending: false,
      errorMessage: null,
    } as any);

    const { container } = renderWithProviders(<WrongNetworkBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('hidden when wallet is disconnected', () => {
    vi.mocked(useWallet).mockReturnValue({ isConnected: false } as any);
    vi.mocked(useNetwork).mockReturnValue({
      isSupported: false,
      switchChain: mockSwitchChain,
      switchChainPending: false,
      errorMessage: null,
    } as any);

    const { container } = renderWithProviders(<WrongNetworkBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('visible on unsupported network and displays expected warning text', () => {
    vi.mocked(useWallet).mockReturnValue({ isConnected: true } as any);
    vi.mocked(useNetwork).mockReturnValue({
      isSupported: false,
      switchChain: mockSwitchChain,
      switchChainPending: false,
      errorMessage: null,
    } as any);

    renderWithProviders(<WrongNetworkBanner />);
    expect(
      screen.getByText(/Wrong Network. Please connect your wallet to Base Sepolia./i),
    ).toBeInTheDocument();
  });

  it('displays network information correctly and triggers chain switch on click', async () => {
    vi.mocked(useWallet).mockReturnValue({ isConnected: true } as any);
    vi.mocked(useNetwork).mockReturnValue({
      isSupported: false,
      switchChain: mockSwitchChain,
      switchChainPending: false,
      errorMessage: 'User rejected switch request',
    } as any);

    renderWithProviders(<WrongNetworkBanner />);

    expect(screen.getByText('(User rejected switch request)')).toBeInTheDocument();

    const switchButton = screen.getByRole('button', { name: /switch to base sepolia/i });
    expect(switchButton).toBeInTheDocument();

    await userEvent.click(switchButton);

    expect(mockSwitchChain).toHaveBeenCalledWith(84532);
  });
});
