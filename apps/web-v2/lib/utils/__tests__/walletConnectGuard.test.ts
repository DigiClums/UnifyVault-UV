import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupWalletConnectGuard } from '../storageFallback';

describe('WalletConnect Guard & Storage Fallback Forensic Tests', () => {
  let mockStore: Record<string, string> = {};
  let listeners: Record<string, ((event: any) => void)[]> = {};

  beforeEach(() => {
    mockStore = {};
    listeners = {};

    const mockLocalStorage = {
      getItem: (k: string) => mockStore[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStore[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStore[k];
      },
      clear: () => {
        mockStore = {};
      },
      key: (i: number) => Object.keys(mockStore)[i] ?? null,
      get length() {
        return Object.keys(mockStore).length;
      },
    };

    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      addEventListener: (type: string, cb: (event: any) => void) => {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(cb);
      },
      removeEventListener: (type: string, cb: (event: any) => void) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((fn) => fn !== cb);
        }
      },
      dispatchEvent: (event: any) => {
        const cbs = listeners[event.type] || [];
        cbs.forEach((cb) => cb(event));
        return true;
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    vi.restoreAllMocks();
  });

  it('1. Purges orphaned wc@2 subscription records when no active session exists', () => {
    mockStore['wc@2:relayer:subscription:topic1'] = 'sub_data_1';
    mockStore['wc@2:core:1.5:subscription:topic2'] = 'sub_data_2';
    mockStore['unrelated_key'] = 'value_ok';

    setupWalletConnectGuard();

    expect(mockStore['wc@2:relayer:subscription:topic1']).toBeUndefined();
    expect(mockStore['wc@2:core:1.5:subscription:topic2']).toBeUndefined();
    expect(mockStore['unrelated_key']).toBe('value_ok');
  });

  it('2. Preserves subscription records when an active WalletConnect session exists', () => {
    mockStore['wc@2:client:0.3:session'] = JSON.stringify({ topic: 'active_session_topic' });
    mockStore['wc@2:relayer:subscription:topic1'] = 'sub_data_1';

    setupWalletConnectGuard();

    expect(mockStore['wc@2:client:0.3:session']).toBeDefined();
    expect(mockStore['wc@2:relayer:subscription:topic1']).toBe('sub_data_1');
  });

  it('3. Suppresses unhandled promise rejections for relayer socket errors', () => {
    setupWalletConnectGuard();

    const mockPreventDefault = vi.fn();
    const event = {
      type: 'unhandledrejection',
      reason: new Error(
        "Couldn't establish socket connection to the relay server: wss://relay.walletconnect.org",
      ),
      preventDefault: mockPreventDefault,
    };

    (globalThis as any).window.dispatchEvent(event);

    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it('4. Suppresses unhandled promise rejections for Restore will override subscription errors', () => {
    setupWalletConnectGuard();

    const mockPreventDefault = vi.fn();
    const event = {
      type: 'unhandledrejection',
      reason: new Error('Restore will override.'),
      preventDefault: mockPreventDefault,
    };

    (globalThis as any).window.dispatchEvent(event);

    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it('5. Negative Test: PROVE the guard does NOT swallow generic application errors', () => {
    setupWalletConnectGuard();

    const mockPreventDefault = vi.fn();
    const event = {
      type: 'unhandledrejection',
      reason: new Error('CRITICAL_APPLICATION_ERROR'),
      preventDefault: mockPreventDefault,
    };

    (globalThis as any).window.dispatchEvent(event);

    expect(mockPreventDefault).not.toHaveBeenCalled();
  });

  it('6. Negative Test: PROVE the guard does NOT swallow contract reverts, RPC errors, or user rejections', () => {
    setupWalletConnectGuard();

    const nonSuppressedErrors = [
      'Execution reverted: P2P: TradeAlreadyFunded',
      'UserRejectedRequestError: User rejected the request',
      'insufficient funds for transfer',
      'HTTP 500: Internal Server Error on /api/p2p/order-action',
      "SmartAccountUserOpExecutionError: AA21 didn't pay prefund",
      'OCR verification failed: UTR mismatch',
      'React Error #310: Rendered more hooks than during the previous render',
      'JSON-RPC error: Internal JSON-RPC error on eth_sendTransaction',
    ];

    for (const errMsg of nonSuppressedErrors) {
      const mockPreventDefault = vi.fn();
      const event = {
        type: 'unhandledrejection',
        reason: new Error(errMsg),
        preventDefault: mockPreventDefault,
      };

      (globalThis as any).window.dispatchEvent(event);

      expect(mockPreventDefault).not.toHaveBeenCalled();
    }
  });

  it('7. Idempotency Test: Multiple calls in React StrictMode register only one listener', () => {
    // Call 3 times
    setupWalletConnectGuard();
    setupWalletConnectGuard();
    setupWalletConnectGuard();

    // Verify only 1 listener registered
    expect(listeners['unhandledrejection']?.length).toBe(1);
  });

  it('8. Storage Preservation Test: Never deletes wagmi, smart accounts, or user data', () => {
    mockStore['unifyvault-v2-wagmi.store'] = JSON.stringify({ state: { chainId: 84532 } });
    mockStore['uv_user_account_address'] = '0x1234567890123456789012345678901234567890';
    mockStore['unifyvault_smart_account_mode'] = 'true';
    mockStore['wc@2:relayer:subscription:orphan'] = 'garbage';

    setupWalletConnectGuard();

    expect(mockStore['unifyvault-v2-wagmi.store']).toBeDefined();
    expect(mockStore['uv_user_account_address']).toBe('0x1234567890123456789012345678901234567890');
    expect(mockStore['unifyvault_smart_account_mode']).toBe('true');
    expect(mockStore['wc@2:relayer:subscription:orphan']).toBeUndefined();
  });
});
