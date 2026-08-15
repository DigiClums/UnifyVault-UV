/**
 * EIP-1193 Provider Interceptor — SafePal Nonce Debugging
 *
 * Proxies window.ethereum and window.safepalProvider to log the
 * EXACT params sent to eth_sendTransaction / wallet_sendTransaction.
 *
 * This is the FINAL layer before the wallet processes the request.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * FINDINGS (conclusive, 2026-08-09):
 *
 * SafePal's injected EVM provider uses a proprietary RPC backend and
 * does NOT honor dApp-provided nonces.  Resolution: use WalletConnect
 * for SafePal instead of the injected provider.
 *
 * This interceptor remains installed for debugging purposes only.
 * See docs/safepal-nonce-investigation.md for the full report.
 * ════════════════════════════════════════════════════════════════════════════
 */

type JsonRpcRequest = {
  method: string;
  params: unknown[];
};

type ProviderProxy = {
  request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
  send?: (method: string, params: unknown[]) => Promise<unknown>;
  sendAsync?: (payload: unknown, callback: unknown) => void;
  isSafePal?: boolean;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: ProviderProxy[];
  [key: string]: unknown;
};

const TX_METHODS = new Set([
  'eth_sendTransaction',
  'wallet_sendTransaction',
  'eth_sendRawTransaction',
]);

function deepLogTxParams(label: string, providerName: string, method: string, params: unknown[]) {
  const tx = Array.isArray(params) && params.length > 0 ? params[0] : undefined;

  if (tx && typeof tx === 'object') {
    const txObj = tx as Record<string, unknown>;
    console.group(
      `%c[UV EIP-1193 INTERCEPTOR] %c${label} %c→ %s(%s)`,
      'color: #f59e0b; font-weight: bold;',
      'color: #ef4444; font-weight: bold;',
      'color: inherit; font-weight: normal;',
      providerName,
      method,
    );
    console.log('  account (from):', txObj.from);
    console.log('  nonce:', txObj.nonce, `(type: ${typeof txObj.nonce})`);
    console.log('  to:', txObj.to);
    console.log(
      '  data preview:',
      typeof txObj.data === 'string' ? `${(txObj.data as string).slice(0, 66)}...` : txObj.data,
    );
    console.log('  value:', txObj.value);
    console.log('  gas:', txObj.gas);
    console.log('  gasPrice:', txObj.gasPrice);
    console.log('  maxFeePerGas:', txObj.maxFeePerGas);
    console.log('  maxPriorityFeePerGas:', txObj.maxPriorityFeePerGas);
    console.log('  chainId:', txObj.chainId);
    console.log('  type:', txObj.type);
    console.log(
      '  FULL params[0]:',
      JSON.stringify(txObj, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
    );
    console.groupEnd();
  } else {
    console.log(
      `[UV EIP-1193 INTERCEPTOR] ${label} → ${providerName} ${method}`,
      'params:',
      JSON.stringify(params),
    );
  }
}

function proxyProvider(provider: ProviderProxy, providerName: string): ProviderProxy {
  if (!provider || typeof provider.request !== 'function') {
    return provider;
  }

  // Avoid double-proxying
  if ((provider as ProviderProxy & { __uv_proxied?: boolean }).__uv_proxied) {
    return provider;
  }

  const proxied = new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === '__uv_proxied') {
        return true;
      }
      if (prop === 'request') {
        return async (args: { method: string; params: unknown[] }) => {
          if (args && args.method && TX_METHODS.has(args.method)) {
            deepLogTxParams('OUTGOING TX', providerName, args.method, args.params);
          }

          try {
            const result = await target.request(args);

            if (args && args.method && TX_METHODS.has(args.method)) {
              console.log(
                `[UV EIP-1193 INTERCEPTOR] ${providerName} ${args.method} → RESULT:`,
                result,
              );
            }

            return result;
          } catch (err) {
            if (args && args.method && TX_METHODS.has(args.method)) {
              console.error(
                `[UV EIP-1193 INTERCEPTOR] ${providerName} ${args.method} → ERROR:`,
                err,
              );
            }
            throw err;
          }
        };
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  });

  return proxied;
}

/**
 * Call once at app startup to install the interceptors on all known
 * EIP-1193 providers.  SafePal exposes window.safepalProvider (its
 * own namespace) as well as window.ethereum (which may be SafePal
 * when used inside the SafePal DApp browser).
 */
export function installProviderInterceptors(): void {
  if (typeof window === 'undefined') return;

  // Prevent double-install
  if (
    (window as unknown as { __uv_interceptors_installed?: boolean }).__uv_interceptors_installed
  ) {
    return;
  }
  (window as unknown as { __uv_interceptors_installed?: boolean }).__uv_interceptors_installed =
    true;

  const win = window as unknown as {
    ethereum?: ProviderProxy;
    safepalProvider?: ProviderProxy;
    __uv_interceptors_installed?: boolean;
  };

  console.log('[UV EIP-1193 INTERCEPTOR] Installing interceptors...');

  // SafePal-specific provider
  if (win.safepalProvider) {
    console.log('[UV EIP-1193 INTERCEPTOR] Found window.safepalProvider');
    win.safepalProvider = proxyProvider(win.safepalProvider, 'safepalProvider');
  }

  // Standard window.ethereum (may be SafePal in DApp browser)
  if (win.ethereum) {
    const label = win.ethereum.isSafePal
      ? 'ethereum(SafePal)'
      : win.ethereum.isMetaMask
        ? 'ethereum(MetaMask)'
        : win.ethereum.isCoinbaseWallet
          ? 'ethereum(CoinbaseWallet)'
          : 'ethereum';

    console.log(`[UV EIP-1193 INTERCEPTOR] Found window.ethereum (${label})`);
    win.ethereum = proxyProvider(win.ethereum, label);

    // Handle multi-provider (e.g., EIP-6963 injected providers)
    if (win.ethereum.providers && Array.isArray(win.ethereum.providers)) {
      win.ethereum.providers = win.ethereum.providers.map((p, i) =>
        proxyProvider(
          p,
          p.isSafePal
            ? `ethereum.providers[${i}](SafePal)`
            : p.isMetaMask
              ? `ethereum.providers[${i}](MetaMask)`
              : `ethereum.providers[${i}]`,
        ),
      );
    }
  }

  console.log('[UV EIP-1193 INTERCEPTOR] Interceptors installed.');
}
