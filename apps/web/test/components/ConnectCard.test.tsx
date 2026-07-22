import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectCard } from '../../components/web3/ConnectCard';
import { WalletButton } from '../../components/web3/WalletButton';
import { renderWithProviders, screen } from '../utils';

// Mock next/dynamic to render WalletButton synchronously in test environment
vi.mock('next/dynamic', async () => {
  const mod = await vi.importActual<typeof import('../../components/web3/WalletButton')>(
    '../../components/web3/WalletButton',
  );
  return {
    default: () => mod.WalletButton,
  };
});

let mockRainbowAccount: any = undefined;

vi.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({
    openConnectModal: vi.fn(),
    connectModalOpen: false,
  }),
  ConnectButton: {
    Custom: ({ children }: { children: (props: any) => React.ReactNode }) =>
      children({
        account: mockRainbowAccount,
        chain: mockRainbowAccount ? { id: 84532, name: 'Base Sepolia' } : undefined,
        openConnectModal: vi.fn(),
        mounted: true,
      }),
  },
}));

vi.mock('../../hooks/useNetwork', () => ({
  useNetwork: () => ({
    isSupported: true,
    chain: { id: 84532, name: 'Base Sepolia' },
    switchChain: vi.fn(),
    switchChainPending: false,
  }),
}));

describe('ConnectCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRainbowAccount = undefined;
  });

  it('renders default connect prompt title and description', () => {
    renderWithProviders(<ConnectCard />);

    expect(screen.getByRole('heading', { name: /connect your wallet/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /please connect your web3 wallet to access vault deposit, redemption, and portfolio metrics\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders custom title and description when provided via props', () => {
    renderWithProviders(
      <ConnectCard
        title="Custom Deposit Title"
        description="Custom deposit action prompt description."
      />,
    );

    expect(screen.getByRole('heading', { name: /custom deposit title/i })).toBeInTheDocument();
    expect(screen.getByText(/custom deposit action prompt description\./i)).toBeInTheDocument();
  });

  it('handles disconnected wallet state by rendering connect button', () => {
    mockRainbowAccount = undefined;
    renderWithProviders(<ConnectCard />);

    const connectButton = screen.getByRole('button', { name: /connect web3 wallet/i });
    expect(connectButton).toBeInTheDocument();
  });

  it('handles connected wallet state by rendering wallet actions button', () => {
    mockRainbowAccount = { address: '0x1234567890123456789012345678901234567890' };
    renderWithProviders(<ConnectCard />);

    const walletButton = screen.getByRole('button', { name: /wallet actions for/i });
    expect(walletButton).toBeInTheDocument();
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });
});
