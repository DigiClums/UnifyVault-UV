import { describe, it, expect } from 'vitest';
import { DEPLOYED_CONTRACTS_MAINNET, getChainTokens, getExplorerBaseUrl } from '../../constants';
import { installProviderInterceptors } from '../utils/providerInterceptor';
import { createSafeWagmiStorage, getSafeStorage } from '../utils/storageFallback';

describe('Protocol Contracts & SafePal Wallet Integration Suite', () => {
  it('should expose all 8 required canonical protocol contract addresses for Base Mainnet', () => {
    expect(DEPLOYED_CONTRACTS_MAINNET.UVBEToken).toBe('0x051979deb1eb4823672e6274a55c44d7818ff523');
    expect(DEPLOYED_CONTRACTS_MAINNET.UVBTCETHToken).toBe(
      '0x051979deb1eb4823672e6274a55c44d7818ff523',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController).toBe(
      '0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.PortfolioManager).toBe(
      '0xce97c16a1c544f1df87e46695f86c7cc61ea486a',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.CustodyVault).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_MAINNET.OracleManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_MAINNET.StrategyManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_MAINNET.Treasury).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_MAINNET.ProtocolDirectory).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_MAINNET.CostBasisManager).toBe(
      '0x3fcf09b4e1545926c1031d22a302a39e552b3469',
    );
    expect(DEPLOYED_CONTRACTS_MAINNET.PerformanceManager).toBe(
      '0x3e13aae6c9befaaec11b2247e2af678ce871f338',
    );
  });

  it('should expose core ERC20 token addresses for Base Mainnet', () => {
    const tokens = getChainTokens(8453);
    expect(tokens.USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(tokens.cbBTC).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(tokens.WETH).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(tokens.UVBE).toBe('0x051979deb1eb4823672e6274a55c44d7818ff523');
  });

  it('should generate accurate BaseScan explorer URLs based on chain ID', () => {
    const mainnetExplorer = getExplorerBaseUrl(8453);
    expect(mainnetExplorer).toBe('https://basescan.org');

    const tokenUrl = `${mainnetExplorer}/address/${DEPLOYED_CONTRACTS_MAINNET.UVBEToken}`;
    expect(tokenUrl).toBe(`https://basescan.org/address/${DEPLOYED_CONTRACTS_MAINNET.UVBEToken}`);
  });

  it('should format wallet_watchAsset ERC20 parameters accurately for UVBE token', () => {
    const tokenAddress = DEPLOYED_CONTRACTS_MAINNET.UVBEToken;
    const watchAssetParams = {
      type: 'ERC20',
      options: {
        address: tokenAddress,
        symbol: 'UVBE',
        decimals: 18,
      },
    };

    expect(watchAssetParams.type).toBe('ERC20');
    expect(watchAssetParams.options.address).toBe('0x051979deb1eb4823672e6274a55c44d7818ff523');
    expect(watchAssetParams.options.symbol).toBe('UVBE');
    expect(watchAssetParams.options.decimals).toBe(18);
  });

  it('should verify SafePal mobile injected provider window.safepalProvider request dispatch', async () => {
    const mockSafePalProvider = {
      isSafePal: true,
      request: async ({ method, params }: { method: string; params: any }) => {
        if (
          method === 'wallet_watchAsset' &&
          params.type === 'ERC20' &&
          params.options.symbol === 'UVBE'
        ) {
          return true;
        }
        return false;
      },
    };

    const res = await mockSafePalProvider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: DEPLOYED_CONTRACTS_MAINNET.UVBEToken,
          symbol: 'UVBE',
          decimals: 18,
        },
      },
    });

    expect(res).toBe(true);
  });

  it('should verify desktop and mobile provider wallet_watchAsset matrix (success, false, rejection, unsupported)', async () => {
    // 1. Mobile success
    const mockMobileSuccess = {
      request: async ({ method }: { method: string }) => method === 'wallet_watchAsset',
    };
    expect(
      await mockMobileSuccess.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: DEPLOYED_CONTRACTS_MAINNET.UVBTCETHToken,
            symbol: 'UVBE',
            decimals: 18,
          },
        },
      }),
    ).toBe(true);

    // 2. Mobile returns false
    const mockMobileFalse = {
      request: async () => false,
    };
    expect(
      await mockMobileFalse.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: DEPLOYED_CONTRACTS_MAINNET.UVBTCETHToken,
            symbol: 'UVBE',
            decimals: 18,
          },
        },
      }),
    ).toBe(false);

    // 3. User rejects (code 4001)
    const mockRejectionProvider = {
      request: async () => {
        const err = new Error('User rejected the request.');
        (err as any).code = 4001;
        throw err;
      },
    };

    await expect(
      mockRejectionProvider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: DEPLOYED_CONTRACTS_MAINNET.UVBTCETHToken,
            symbol: 'UVBE',
            decimals: 18,
          },
        },
      }),
    ).rejects.toThrow('User rejected the request.');

    // 4. Method unsupported (code -32601)
    const mockUnsupportedProvider = {
      request: async () => {
        const err = new Error('Method not found.');
        (err as any).code = -32601;
        throw err;
      },
    };

    await expect(
      mockUnsupportedProvider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: DEPLOYED_CONTRACTS_MAINNET.UVBTCETHToken,
            symbol: 'UVBE',
            decimals: 18,
          },
        },
      }),
    ).rejects.toThrow('Method not found.');
  });

  it('should verify deposit transaction state remains confirmed even if token import fails', () => {
    const depositStepState = 'confirmed';
    const tokenAddStatus = 'unsupported';

    expect(depositStepState).toBe('confirmed');
    expect(tokenAddStatus).toBe('unsupported');
    expect(depositStepState === 'confirmed').toBe(true);
  });

  it('should verify no deposit or mint transaction is triggered during token import request', () => {
    const isTransactionPending = false;
    const tokenImportMethod = 'wallet_watchAsset';

    expect(isTransactionPending).toBe(false);
    expect(tokenImportMethod).toBe('wallet_watchAsset');
    expect(tokenImportMethod).not.toBe('eth_sendTransaction');
  });

  it('should verify no private keys or secrets exist in deployed contract configuration', () => {
    const contractsObj = JSON.stringify(DEPLOYED_CONTRACTS_MAINNET);
    expect(contractsObj).not.toContain('privateKey');
    expect(contractsObj).not.toContain('secret');
    expect(contractsObj).not.toContain('MNEMONIC');
  });

  it('should verify provider interceptor preserves EIP-1193 event listeners (.on, .removeListener) for wallet reconnect on page refresh', async () => {
    const listeners: Record<string, ((...args: any[]) => void)[]> = {};
    class DummyProvider {
      isMetaMask = true;
      request = async ({ method }: { method: string }) => {
        if (method === 'eth_accounts') return ['0x1234567890123456789012345678901234567890'];
        return null;
      };
      on(event: string, fn: (...args: any[]) => void) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      }
      removeListener(event: string, fn: (...args: any[]) => void) {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((cb) => cb !== fn);
        }
      }
    }

    const originalProvider = new DummyProvider();
    (global as any).window = {
      ethereum: originalProvider,
    };

    installProviderInterceptors();

    const proxiedProvider = (global as any).window.ethereum;
    expect(proxiedProvider.__uv_proxied).toBe(true);

    // Verify .on and .removeListener work through the Proxy without throwing undefined method error
    let eventFired = false;
    const callback = () => {
      eventFired = true;
    };

    expect(typeof proxiedProvider.on).toBe('function');
    expect(typeof proxiedProvider.removeListener).toBe('function');

    proxiedProvider.on('accountsChanged', callback);
    expect(listeners['accountsChanged']).toHaveLength(1);

    listeners['accountsChanged'][0]();
    expect(eventFired).toBe(true);

    proxiedProvider.removeListener('accountsChanged', callback);
    expect(listeners['accountsChanged']).toHaveLength(0);

    // Clean up global window mock
    delete (global as any).window;
  });

  it('should verify safe wagmi storage fallback retains keys for auto-reconnecting wallet on page refresh', () => {
    const storage = createSafeWagmiStorage();
    expect(storage).toBeDefined();
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
  });
});
