import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletButton } from '../../components/web3/WalletButton';
import { renderWithProviders, screen, userEvent } from '../utils';

const mockSwitchChain = vi.fn();
const mockOpenConnectModal = vi.fn();
let mockIsSupported = true;
let mockSwitchChainPending = false;
let mockRainbowKitState: any = {
  account: { address: '0x1234567890123456789012345678901234567890' },
  chain: { id: 84532, name: 'Base Sepolia', unsupported: false },
  openConnectModal: mockOpenConnectModal,
  mounted: true,
};

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: any) => React.ReactNode }) =>
      children(mockRainbowKitState),
  },
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => ({
    isSupported: mockIsSupported,
    chain: mockIsSupported
      ? { id: 84532, name: 'Base Sepolia' }
      : { id: 1, name: 'Ethereum Mainnet' },
    switchChain: mockSwitchChain,
    switchChainPending: mockSwitchChainPending,
  }),
}));

vi.mock('../../hooks/useWallet', () => ({
  useWallet: () => ({
    isConnected: !!mockRainbowKitState.account,
    address: mockRainbowKitState.account?.address,
  }),
}));

describe('WalletButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSupported = true;
    mockSwitchChainPending = false;
    mockRainbowKitState = {
      account: { address: '0x1234567890123456789012345678901234567890' },
      chain: { id: 84532, name: 'Base Sepolia', unsupported: false },
      openConnectModal: mockOpenConnectModal,
      mounted: true,
    };
  });

  it('renders loading skeleton in unmounted/pending connection state', () => {
    mockRainbowKitState = { ...mockRainbowKitState, mounted: false };

    renderWithProviders(<WalletButton />);
    expect(screen.getByRole('status', { name: /loading wallet status/i })).toBeInTheDocument();
  });

  it('renders connect wallet button in disconnected state and triggers connect flow', async () => {
    mockRainbowKitState = {
      account: undefined,
      chain: undefined,
      openConnectModal: mockOpenConnectModal,
      mounted: true,
    };

    renderWithProviders(<WalletButton />);

    const connectButton = screen.getByRole('button', { name: /connect web3 wallet/i });
    expect(connectButton).toBeInTheDocument();

    await userEvent.click(connectButton);
    expect(mockOpenConnectModal).toHaveBeenCalled();
  });

  it('renders address and network badge in connected state', () => {
    renderWithProviders(<WalletButton />);

    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
    expect(screen.getByText('Base Sepolia')).toBeInTheDocument();
  });

  it('renders switch chain button in unsupported network state and triggers switchChain', async () => {
    mockIsSupported = false;
    mockRainbowKitState = {
      account: { address: '0x1234567890123456789012345678901234567890' },
      chain: { id: 1, name: 'Ethereum Mainnet', unsupported: true },
      openConnectModal: mockOpenConnectModal,
      mounted: true,
    };

    renderWithProviders(<WalletButton />);

    const switchButton = screen.getByRole('button', {
      name: /wrong network\. switch to base sepolia/i,
    });
    expect(switchButton).toBeInTheDocument();

    await userEvent.click(switchButton);
    expect(mockSwitchChain).toHaveBeenCalledWith(84532);
  });
});
