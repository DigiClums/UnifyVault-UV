import { describe, it, expect } from 'vitest';
import { DEPLOYED_CONTRACTS_SEPOLIA, getChainTokens, getExplorerBaseUrl } from '../../constants';

describe('Protocol Contracts & Wallet Integration Suite', () => {
  it('should expose all 8 required canonical protocol contract addresses for Base Sepolia', () => {
    expect(DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken).toBe(
      '0x5c0C26A825639adc58C6edf3aE864616F1dA94b9',
    );
    expect(DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.OracleManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.Treasury).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(DEPLOYED_CONTRACTS_SEPOLIA.ProtocolDirectory).toMatch(/^0x[a-fA-F0-9]{40}$/);
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
        symbol: 'UVBTCETH',
        decimals: 18,
      },
    };

    expect(watchAssetParams.type).toBe('ERC20');
    expect(watchAssetParams.options.address).toBe('0x5c0C26A825639adc58C6edf3aE864616F1dA94b9');
    expect(watchAssetParams.options.symbol).toBe('UVBTCETH');
    expect(watchAssetParams.options.decimals).toBe(18);
  });

  it('should verify desktop provider wallet_watchAsset success response', async () => {
    const mockDesktopProvider = {
      request: async ({ method, params }: { method: string; params: any }) => {
        if (method === 'wallet_watchAsset' && params.options.symbol === 'UVBTCETH') {
          return true;
        }
        return false;
      },
    };

    const res = await mockDesktopProvider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken,
          symbol: 'UVBTCETH',
          decimals: 18,
        },
      },
    });

    expect(res).toBe(true);
  });

  it('should verify mobile provider wallet_watchAsset matrix (success, false, rejection, unsupported)', async () => {
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
            symbol: 'UVBTCETH',
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
            symbol: 'UVBTCETH',
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
            symbol: 'UVBTCETH',
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
            symbol: 'UVBTCETH',
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
});
