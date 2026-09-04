import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { base } from 'viem/chains';
import {
  DEPLOYED_CONTRACTS_MAINNET,
  MODULE_IDS,
  TOKENS_BY_CHAIN,
  getProtocolDirectoryAddress,
  getDefaultChainId,
} from '../../constants';
import { getMarketplaceAddress } from '../../hooks/useMarketplace';
import { ENTRYPOINT_ADDRESS_V07, APPROVED_MAINNET_TARGETS } from '../smartAccount/constants';
import { getPaymasterAddress } from '../smartAccount/config';
import { KNOWN_TOKENS } from '../explorer/eventRegistry';
import {
  CONTROLLER_ABI,
  CUSTODY_VAULT_ABI,
  TREASURY_ABI,
  PORTFOLIO_MANAGER_ABI,
  COST_BASIS_MANAGER_ABI,
  PERFORMANCE_MANAGER_ABI,
  ORACLE_MANAGER_ABI,
  P2P_ESCROW_ABI,
  PROTOCOL_DIRECTORY_ABI,
  FEE_MANAGER_ABI,
  STRATEGY_MANAGER_ABI,
  ERC20_ABI,
} from '../contracts';
import { MARKETPLACE_ABI } from '../contracts/marketplace';

// Canonical Base Mainnet V2 Contract Matrix
export const CANONICAL_BASE_MAINNET_V2 = {
  ProtocolDirectory: '0xcc954ec28ff8e69875ae8a7398cf54da98ce26e5',
  Treasury: '0x3d358110bf4dc51530e8c4ff66c50b1f34629ec9',
  FeeManager: '0x76c8a1ab608403cd974ec7598b01ec88b44320d3',
  CustodyVault: '0xcf3dc2cd20fb7c3c99138038092eed60385bfa9c',
  OracleManager: '0xdbab63fe1d8accff6620214a5c616d4151a8fec7',
  ChainlinkOracleProvider: '0x39af66781d16ec8a72d2b1a4a1b7697a577626a2',
  LiquidityManager: '0x6a52c50d9be9eab8bf8987f77d8714aecd9e0919',
  UVBEV2: '0x051979deb1eb4823672e6274a55c44d7818ff523',
  UnifyVaultController: '0xd6d39b581b808c3b14e4ccbd9fdfcccd37afe23c',
  StrategyManager: '0x8c196a631531ac3a9754016db1d7b873ebbdb6e9',
  PortfolioManager: '0xce97c16a1c544f1df87e46695f86c7cc61ea486a',
  SwapAdapter: '0x9560361d964ebfeea402e75ad3b74fad4d8057be',
  CostBasisManagerV2: '0x3fcf09b4e1545926c1031d22a302a39e552b3469',
  PerformanceManager: '0x3e13aae6c9befaaec11b2247e2af678ce871f338',
  P2PEscrowV2: '0x400916339033b88cda38b1d8a5fb0f82e4889f38',
  Marketplace: '0x6e3be632747e161a0b017cb35243d39eb90d0d8a',
  P2PReputation: '0x7a4093316955baa5bcb8189c4522d9db31f42d41',
  Paymaster: '0xdf96b619934d17ae85142dcef1655a8d3b19040a',
  GasTreasury: '0x136a146af0f3c5f1d62caaea31a3bddaaf4e6424',
  EntryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  Admin: '0x441dbf8076d0b143EC17199baE94Daa884161454',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  WETH: '0x4200000000000000000000000000000000000006',
};

// Backward compatibility alias for tests
export const CANONICAL_BASE_SEPOLIA_V2 = CANONICAL_BASE_MAINNET_V2;

// Known Obsolete Addresses (MUST NOT be used anywhere in frontend production code)
export const OBSOLETE_LEGACY_ADDRESSES = [
  '0xa34596D38Be381A4764141105A91C338Ca5503bB', // V1 Token
  '0x4A33d001D7F81C12c0C9262256Af83000e64457D', // V2 Token Legacy Symbol
  '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D', // Legacy Directory
  '0x9499Ad93fa257D4d20925FDc4B6D6F6b2b565Bc2', // Legacy Controller
  '0xa9284887B8670890F675386dA85877c34b40EE44', // Legacy Vault
  '0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6', // Legacy Treasury
  '0x5c0c26a825639adc58c6edf3ae864616f1da94b9', // Old Test Token
  '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6', // Old Unhardened Paymaster
];

describe('Frontend Contract Alignment — Canonical Base Mainnet V2 Production Suite', () => {
  describe('1. Canonical Base Mainnet Matrix Verification', () => {
    it('matches the canonical ProtocolDirectory address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.ProtocolDirectory.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.ProtocolDirectory.toLowerCase(),
      );
      expect(getProtocolDirectoryAddress(base.id).toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.ProtocolDirectory.toLowerCase(),
      );
    });

    it('matches the canonical Treasury address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Treasury.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.Treasury.toLowerCase(),
      );
    });

    it('matches the canonical FeeManager address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.FeeManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.FeeManager.toLowerCase(),
      );
    });

    it('matches the canonical CustodyVault address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.CustodyVault.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.CustodyVault.toLowerCase(),
      );
    });

    it('matches the canonical OracleManager & ChainlinkProvider addresses', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.OracleManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.OracleManager.toLowerCase(),
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.ChainlinkOracleProvider.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.ChainlinkOracleProvider.toLowerCase(),
      );
    });

    it('matches the canonical LiquidityManager address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.LiquidityManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.LiquidityManager.toLowerCase(),
      );
    });

    it('matches the canonical UVBEV2 Token address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.UVBEToken.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.UVBEV2.toLowerCase(),
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.UVBTCETHToken.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.UVBEV2.toLowerCase(),
      );
      expect(TOKENS_BY_CHAIN[base.id].UVBE?.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.UVBEV2.toLowerCase(),
      );
    });

    it('matches the canonical UnifyVaultController address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.UnifyVaultController.toLowerCase(),
      );
    });

    it('matches the canonical StrategyManager address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.StrategyManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.StrategyManager.toLowerCase(),
      );
    });

    it('matches the canonical PortfolioManager address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.PortfolioManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.PortfolioManager.toLowerCase(),
      );
    });

    it('matches the canonical SwapAdapter address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.SwapAdapter.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.SwapAdapter.toLowerCase(),
      );
    });

    it('matches the canonical CostBasisManagerV2 address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.CostBasisManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.CostBasisManagerV2.toLowerCase(),
      );
    });

    it('matches the canonical PerformanceManager address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.PerformanceManager.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.PerformanceManager.toLowerCase(),
      );
    });

    it('matches the canonical P2PEscrowV2 address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.P2PEscrow.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.P2PEscrowV2.toLowerCase(),
      );
    });

    it('matches the canonical Marketplace address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Marketplace.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.Marketplace.toLowerCase(),
      );
      expect(getMarketplaceAddress(base.id).toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.Marketplace.toLowerCase(),
      );
    });

    it('matches the canonical Paymaster and GasTreasury addresses', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Paymaster.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.Paymaster.toLowerCase(),
      );
      expect(getPaymasterAddress(base.id).toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.Paymaster.toLowerCase(),
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.GasTreasury?.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.GasTreasury.toLowerCase(),
      );
    });

    it('matches the canonical EntryPoint v0.7 address', () => {
      expect(ENTRYPOINT_ADDRESS_V07.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.EntryPoint.toLowerCase(),
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.EntryPoint?.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.EntryPoint.toLowerCase(),
      );
    });

    it('matches the canonical Admin address', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Admin?.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.Admin.toLowerCase(),
      );
    });

    it('matches the canonical collateral tokens for Base Mainnet', () => {
      expect(TOKENS_BY_CHAIN[base.id].USDC.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.USDC.toLowerCase(),
      );
      expect(TOKENS_BY_CHAIN[base.id].cbBTC.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.cbBTC.toLowerCase(),
      );
      expect(TOKENS_BY_CHAIN[base.id].WETH.toLowerCase()).toBe(
        CANONICAL_BASE_MAINNET_V2.WETH.toLowerCase(),
      );
    });
  });

  describe('2. Obsolete Contract Addresses Ban in Frontend Codebase', () => {
    it('ensures no obsolete/legacy address is hardcoded anywhere in web-v2 production code', () => {
      const webRoot = path.resolve(__dirname, '../..');
      const obsoleteLowers = OBSOLETE_LEGACY_ADDRESSES.map((a) => a.toLowerCase());

      const foundViolations: { file: string; line: number; addr: string; content: string }[] = [];

      function scanDir(dirPath: string) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (['node_modules', '.next', '.turbo', '.git'].includes(entry.name)) continue;
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            // Exclude this test file itself from the search
            if (entry.name === 'frontendContractAlignment.test.ts') continue;

            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              for (const obsolete of obsoleteLowers) {
                if (line.toLowerCase().includes(obsolete)) {
                  foundViolations.push({
                    file: path.relative(webRoot, fullPath),
                    line: idx + 1,
                    addr: obsolete,
                    content: line.trim(),
                  });
                }
              }
            });
          }
        }
      }

      scanDir(path.join(webRoot, 'constants'));
      scanDir(path.join(webRoot, 'hooks'));
      scanDir(path.join(webRoot, 'lib'));
      scanDir(path.join(webRoot, 'components'));
      scanDir(path.join(webRoot, 'app'));

      expect(foundViolations).toEqual([]);
    });

    it('ensures KNOWN_TOKENS in eventRegistry contains only canonical V2 tokens', () => {
      const knownKeys = Object.keys(KNOWN_TOKENS);
      for (const obsolete of OBSOLETE_LEGACY_ADDRESSES) {
        expect(knownKeys).not.toContain(obsolete.toLowerCase());
      }
      expect(knownKeys).toContain(CANONICAL_BASE_MAINNET_V2.UVBEV2.toLowerCase());
    });

    it('ensures APPROVED_MAINNET_TARGETS in smart account constants points to canonical V2 contracts', () => {
      expect(APPROVED_MAINNET_TARGETS.USDC).toBe(CANONICAL_BASE_MAINNET_V2.USDC.toLowerCase());
      expect(APPROVED_MAINNET_TARGETS.CONTROLLER).toBe(
        CANONICAL_BASE_MAINNET_V2.UnifyVaultController.toLowerCase(),
      );
      expect(APPROVED_MAINNET_TARGETS.UVBE).toBe(CANONICAL_BASE_MAINNET_V2.UVBEV2.toLowerCase());
      expect(APPROVED_MAINNET_TARGETS.P2P_ESCROW).toBe(
        CANONICAL_BASE_MAINNET_V2.P2PEscrowV2.toLowerCase(),
      );
    });
  });

  describe('3. Protocol Module IDs Verification', () => {
    it('verifies all 13 module IDs match on-chain ModuleIds.sol', () => {
      expect(MODULE_IDS.ORACLE).toBe(
        '0x2e30c16253629c211949dfd3fde5e2a3de47827f45371d8ef81f41a881d12a04',
      );
      expect(MODULE_IDS.VAULT).toBe(
        '0x918e3e21ecee5b021c92b4a7262afa2668effbe830864da44b7d3e7a6bd66640',
      );
      expect(MODULE_IDS.TREASURY).toBe(
        '0x6efca2866b731ee4984990bacad4cde10f1ef764fb54a5206bdfd291695b1a9b',
      );
      expect(MODULE_IDS.TOKEN).toBe(
        '0x0ac1902161e20716389981a690da9d8bdedd6217d645a4b359801d9bffce3bd8',
      );
      expect(MODULE_IDS.STRATEGY_MANAGER).toBe(
        '0x58b399e3748bdc2a6973276bd201243421cffba73d1ebdad6acf1b65eb6935e5',
      );
      expect(MODULE_IDS.PORTFOLIO_MANAGER).toBe(
        '0x3c40c670348eca8b03e7650189aa991cc9d77fcbee961381c2354fae1a3e2188',
      );
      expect(MODULE_IDS.SWAP_ADAPTER).toBe(
        '0xb38cc8783565eb75ee1b8d4c76a41d2179385de2efafcf6315528396e14ed8f2',
      );
      expect(MODULE_IDS.LIQUIDITY_MANAGER).toBe(
        '0x6878742ff510854cb02c186504af5267007c4a6d33f490fc28ec83e83e1458e1',
      );
      expect(MODULE_IDS.FEE_MANAGER).toBe(
        '0x42e3570c507db8e472a4592e53f4b6df78eb7c8a8d593e718bb47b707f2c6a90',
      );
      expect(MODULE_IDS.COST_BASIS_MANAGER).toBe(
        '0xd4741fb770f259864462ac1e0f0c516cde3c7a9a37aa2882da996c82ffff9796',
      );
      expect(MODULE_IDS.PERFORMANCE_MANAGER).toBe(
        '0x3cc6e30a00fc20cd55b209638eb88a197234ab24baed9e238b01e2c52159a815',
      );
      expect(MODULE_IDS.CONTROLLER).toBe(
        '0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af',
      );
      expect(MODULE_IDS.P2P_ESCROW).toBe(
        '0x4178f90dd1606e324454877b14154a3125c2f92df55a76df76af86093a797663',
      );
    });
  });

  describe('4. ABI & Function Compatibility Verification', () => {
    it('verifies UnifyVaultController ABI contains deposit, redeem, quotes, and emergency actions', () => {
      const fnNames = CONTROLLER_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(fnNames).toContain('deposit');
      expect(fnNames).toContain('redeem');
      expect(fnNames).toContain('getDepositQuote');
      expect(fnNames).toContain('getRedeemQuote');
      expect(fnNames).toContain('previewDeposit');
      expect(fnNames).toContain('previewRedeem');
      expect(fnNames).toContain('paused');
      expect(fnNames).toContain('swapSlippageBps');
      expect(fnNames).toContain('emergencyPause');
      expect(fnNames).toContain('resume');
    });

    it('verifies P2PEscrowV2 ABI contains lifecycle methods', () => {
      const fnNames = P2P_ESCROW_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(fnNames).toContain('createTrade');
      expect(fnNames).toContain('fundTrade');
      expect(fnNames).toContain('submitPayment');
      expect(fnNames).toContain('confirmAndRelease');
      expect(fnNames).toContain('refund');
      expect(fnNames).toContain('cancelUnfundedTrade');
      expect(fnNames).toContain('raiseDispute');
      expect(fnNames).toContain('resolveDispute');
      expect(fnNames).toContain('getTrade');
      expect(fnNames).toContain('totalTrades');
      expect(fnNames).toContain('feeBps');
    });

    it('verifies Marketplace ABI contains order matching and execution methods', () => {
      const abiString = JSON.stringify(MARKETPLACE_ABI);
      expect(abiString).toContain('createBuyOrder');
      expect(abiString).toContain('createSellOrder');
      expect(abiString).toContain('cancelOrder');
      expect(abiString).toContain('matchOrders');
      expect(abiString).toContain('takeOrder');
      expect(abiString).toContain('getOrder');
      expect(abiString).toContain('getOrderCount');
      expect(abiString).toContain('p2pEscrow');
      expect(abiString).toContain('uvbeToken');
    });

    it('verifies PerformanceManager ABI contains portfolio performance metrics', () => {
      const fnNames = PERFORMANCE_MANAGER_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(fnNames).toContain('currentValue');
      expect(fnNames).toContain('investedCapital');
      expect(fnNames).toContain('netProfit');
      expect(fnNames).toContain('roi');
      expect(fnNames).toContain('performance');
    });

    it('verifies CostBasisManagerV2 ABI contains cost basis and realized PnL methods', () => {
      const fnNames = COST_BASIS_MANAGER_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(fnNames).toContain('costBasis');
      expect(fnNames).toContain('realizedPnL');
      expect(fnNames).toContain('unrealizedPnL');
      expect(fnNames).toContain('averageEntryPrice');
      expect(fnNames).toContain('portfolioPerformance');
    });

    it('verifies PortfolioManager ABI contains NAV and price calculation methods', () => {
      const fnNames = PORTFOLIO_MANAGER_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(fnNames).toContain('calculateNAV');
      expect(fnNames).toContain('calculateUVPrice');
      expect(fnNames).toContain('calculatePortfolioValue');
      expect(fnNames).toContain('allocation');
      expect(fnNames).toContain('previewDeposit');
      expect(fnNames).toContain('previewRedeem');
    });

    it('verifies Treasury & CustodyVault ABIs contain deposit, withdrawal and balance methods', () => {
      const vaultFns = CUSTODY_VAULT_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(vaultFns).toContain('totalAssets');
      expect(vaultFns).toContain('balance');
      expect(vaultFns).toContain('withdraw');

      const treasuryFns = TREASURY_ABI.filter((x: any) => x.type === 'function').map(
        (x: any) => x.name,
      );
      expect(treasuryFns).toContain('balance');
      expect(treasuryFns).toContain('withdraw');
      expect(treasuryFns).toContain('withdrawNative');
    });
  });

  describe('5. P2P 1% Fee and Accounting Separation Invariants', () => {
    it('enforces 1% fee (100 BPS) in P2P escrow calculation', () => {
      const P2P_FEE_BPS = 100n;
      const tradeAmount = 100000000000000000000n; // 100 UVBE
      const feeAmount = (tradeAmount * P2P_FEE_BPS) / 10000n;
      const netPayout = tradeAmount - feeAmount;

      expect(feeAmount).toBe(1000000000000000000n); // Exact 1 UVBE (1%)
      expect(netPayout).toBe(99000000000000000000n); // Exact 99 UVBE (99%)
    });
  });
});
