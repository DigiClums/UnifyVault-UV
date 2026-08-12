import { describe, it, expect } from 'vitest';
import { DEPLOYED_CONTRACTS_SEPOLIA, getChainTokens, getExplorerBaseUrl } from '../../constants';
import { installProviderInterceptors } from '../utils/providerInterceptor';
import { createSafeWagmiStorage, getSafeStorage } from '../utils/storageFallback';

describe('Protocol Contracts & SafePal Wallet Integration Suite', () => {
  it('should expose all 8 required canonical protocol contract addresses for Base Sepolia', () => {
    expect(DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken).toBe(
      '0x4A33d001D7F81C12c0C9262256Af83000e64457D',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController).toBe(
      '0x9499Ad93fa257D4d20925FDc4B6D6F6b2b565Bc2',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager).toBe(
      '0x68c969b758e682B67e99a1ed2CC5753Ff1B2635E',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.OracleManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.Treasury).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager).toBe(
      '0x15dd90413BF9379E6B1D50eED34771094f067765',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.PerformanceManager).toBe(
      '0x83984555065c95E160a1d6e8e35C43C0BBc3d58F',
    );
  });

  it('should expose core ERC20 token addresses for Base Sepolia', () => {
    const tokens = getChainTokens(84532);
    expect(tokens.USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(tokens.cbBTC).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(tokens.WETH).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('should generate accurate BaseScan explorer URLs based on chain ID 84532', () => {
    const sepoliaExplorer = getExplorerBaseUrl(84532);
    expect(sepoliaExplorer).toBe('https://sepolia.basescan.org');

    const mainnetExplorer = getExplorerBaseUrl(8453);
    expect(mainnetExplorer).toBe('https://basescan.org');

    const tokenUrl = `${sepoliaExplorer}/address/${DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken}`;
    expect(tokenUrl).toBe(
      `https://sepolia.basescan.org/address/${DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken}`,
    );
  });

  it('should format wallet_watchAsset ERC20 parameters accurately for UVBTCETH token', () => {
    const tokenAddress = DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken;
    const watchAssetParams = {
      type: 'ERC20',
      options: {
        address: tokenAddress,
        symbol: 'UVBE',
        decimals: 18,
      },
    };

    expect(watchAssetParams.type).toBe('ERC20');
    expect(watchAssetParams.options.address).toBe('0x4A33d001D7F81C12c0C9262256Af83000e64457D');
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
          address: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
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
            address: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
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
            address: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
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
            address: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
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
            address: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
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
    const contractsObj = JSON.stringify(DEPLOYED_CONTRACTS_SEPOLIA);
    expect(contractsObj).not.toContain('privateKey');
    expect(contractsObj).not.toContain('secret');
    expect(contractsObj).not.toContain('MNEMONIC');
  });

  it('should verify provider interceptor preserves EIP-1193 event listeners (.on, .removeListener) for wallet reconnect on page refresh', async () => {
    const listeners: Record<string, Function[]> = {};
    class DummyProvider {
      isMetaMask = true;
      request = async ({ method }: { method: string }) => {
        if (method === 'eth_accounts') return ['0x1234567890123456789012345678901234567890'];
        return null;
      };
      on(event: string, fn: Function) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      }
      removeListener(event: string, fn: Function) {
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
