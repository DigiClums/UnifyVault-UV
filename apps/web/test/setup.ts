import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Global mocks for DOM APIs not implemented in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    resolvedTheme: 'dark',
    themes: ['light', 'dark', 'system'],
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @rainbow-me/rainbowkit
const MockConnectButton: any = ({
  chainStatus: _chainStatus,
  showBalance: _showBalance,
  ...props
}: any) =>
  React.createElement('button', { ...props, 'aria-label': 'Web3 Wallet Button' }, 'Connect Wallet');
MockConnectButton.Custom = ({ children }: { children: (props: any) => React.ReactNode }) =>
  children({
    account: {
      address: '0x1234567890123456789012345678901234567890',
      displayName: '0x1234...7890',
    },
    chain: { id: 84532, name: 'Base Sepolia', unsupported: false },
    openAccountModal: vi.fn(),
    openChainModal: vi.fn(),
    openConnectModal: vi.fn(),
    mounted: true,
  });

vi.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({
    openConnectModal: vi.fn(),
    connectModalOpen: false,
  }),
  ConnectButton: MockConnectButton,
}));

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    status: 'connected',
    chain: { id: 84532, name: 'Base Sepolia' },
    chainId: 84532,
  }),
  useChainId: () => 84532,
  useDisconnect: () => ({
    disconnect: vi.fn(),
    isPending: false,
  }),
  useSwitchChain: () => ({
    switchChain: vi.fn(),
    error: null,
    isPending: false,
  }),
  useReadContract: () => ({ data: undefined, isLoading: false, isError: false }),
  useReadContracts: () => ({ data: undefined, isLoading: false, isError: false }),
  useWriteContract: () => ({ writeContractAsync: vi.fn(), isPending: false }),
  useWaitForTransactionReceipt: () => ({ isLoading: false, isSuccess: true }),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock store state and subscribers for Vitest
let storeState: any = {
  isOpen: false,
  step: 'IDLE',
  txHash: undefined,
  errorMessage: undefined,
  actionType: undefined,
};

const listeners = new Set<() => void>();

const updateStore = (updater: (prev: any) => any) => {
  const nextState = updater(storeState);
  if (
    nextState.isOpen === storeState.isOpen &&
    nextState.step === storeState.step &&
    nextState.txHash === storeState.txHash &&
    nextState.errorMessage === storeState.errorMessage &&
    nextState.actionType === storeState.actionType
  ) {
    return;
  }
  storeState = nextState;
  listeners.forEach((l) => l());
};

export function useTransactionStoreMock(selector?: any) {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const storeObj = {
    ...storeState,
    openModal: (actionType?: string) =>
      updateStore((s) => ({
        ...s,
        isOpen: true,
        step: s.isOpen ? s.step : 'PREPARING',
        actionType: actionType || s.actionType,
      })),
    closeModal: () => updateStore((s) => ({ ...s, isOpen: false })),
    setStep: (step: string) => updateStore((s) => ({ ...s, step, isOpen: true })),
    setTxHash: (txHash: string) =>
      updateStore((s) => ({ ...s, txHash, step: 'CONFIRMED', isOpen: true })),
    setError: (errorMessage: string) =>
      updateStore((s) => ({ ...s, errorMessage, step: 'FAILED', isOpen: true })),
    reset: () =>
      updateStore(() => ({
        isOpen: false,
        step: 'IDLE',
        txHash: undefined,
        errorMessage: undefined,
        actionType: undefined,
      })),
  };

  return typeof selector === 'function' ? selector(storeObj) : storeObj;
}

beforeEach(() => {
  storeState = {
    isOpen: false,
    step: 'IDLE',
    txHash: undefined,
    errorMessage: undefined,
    actionType: undefined,
  };
  listeners.clear();
});

vi.mock('../store/useTransactionStore', () => ({
  useTransactionStore: (selector?: any) => useTransactionStoreMock(selector),
}));

vi.mock('../../store/useTransactionStore', () => ({
  useTransactionStore: (selector?: any) => useTransactionStoreMock(selector),
}));

import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  storeState = {
    isOpen: false,
    step: 'IDLE',
    txHash: undefined,
    errorMessage: undefined,
    actionType: undefined,
  };
  listeners.clear();
  vi.clearAllTimers();
});

afterAll(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
