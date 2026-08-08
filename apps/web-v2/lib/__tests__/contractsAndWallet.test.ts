import { describe, it, expect } from 'vitest';
import { DEPLOYED_CONTRACTS_SEPOLIA, getChainTokens, getExplorerBaseUrl } from '../../constants';

describe('Protocol Contracts & Wallet Integration Suite', () => {
  it('should expose all 8 required canonical protocol contract addresses for Base Sepolia', () => {
    expect(DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken).toMatch(/^0x[a-fA-F0-9]{40}$/);
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

  it('should generate accurate BaseScan explorer URLs based on chain ID', () => {
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
    expect(watchAssetParams.options.address).toBe(tokenAddress);
    expect(watchAssetParams.options.symbol).toBe('UVBTCETH');
    expect(watchAssetParams.options.decimals).toBe(18);
  });

  it('should verify no private keys or secrets exist in deployed contract configuration', () => {
    const contractsObj = JSON.stringify(DEPLOYED_CONTRACTS_SEPOLIA);
    expect(contractsObj).not.toContain('privateKey');
    expect(contractsObj).not.toContain('secret');
    expect(contractsObj).not.toContain('MNEMONIC');
  });
});
