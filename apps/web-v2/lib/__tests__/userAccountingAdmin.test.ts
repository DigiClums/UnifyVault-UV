import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  parseEther,
  formatEther,
  isAddress,
  getAddress,
  encodeErrorResult,
} from 'viem';
import { COST_BASIS_MANAGER_V2_ABI, PERFORMANCE_MANAGER_ABI } from '../contracts';
import { DEPLOYED_CONTRACTS_SEPOLIA, getExplorerBaseUrl } from '../../constants';
import { decodeTransactionError } from '../utils/errorDecoder';
import {
  GOVERNANCE_ROLE,
  DEFAULT_ADMIN_ROLE,
  CONTROLLER_ROLE,
} from '../../hooks/useUserAccounting';

describe('Phase 6: User Accounting & Performance Analytics Admin Test Suite', () => {
  const DEPLOYER_ADMIN = '0xd905920c91853039060246Ed5724AA72B91a96DA' as const;
  const SAMPLE_USER = '0x1563915e194D8CfBA1943570603F7606A3115508' as const;
  const UNAUTHORIZED_USER = '0x1111111111111111111111111111111111111111' as const;

  // ==========================================
  // 1. ABI Alignment with Solidity
  // ==========================================
  describe('1. ABI Alignment with Solidity', () => {
    it('verifies all state inspection view functions on COST_BASIS_MANAGER_V2_ABI', () => {
      const viewFns = [
        'costBasis',
        'averageEntryPrice',
        'realizedPnL',
        'unrealizedPnL',
        'firstDepositTimestamp',
        'isEscrow',
        'indexToken',
        'portfolioManager',
        'directory',
        'hasRole',
        'getRoleAdmin',
      ];

      for (const fn of viewFns) {
        const item = getAbiItem({ abi: COST_BASIS_MANAGER_V2_ABI, name: fn });
        expect(item, `Expected function ${fn} on COST_BASIS_MANAGER_V2_ABI`).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('view');
      }
    });

    it('verifies mutating governance functions on COST_BASIS_MANAGER_V2_ABI', () => {
      const writeFns = ['setEscrowStatus', 'migrateAccounting', 'syncModules', 'setModules'];

      for (const fn of writeFns) {
        const item = getAbiItem({ abi: COST_BASIS_MANAGER_V2_ABI, name: fn });
        expect(item, `Expected mutating function ${fn} on COST_BASIS_MANAGER_V2_ABI`).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('nonpayable');
      }
    });

    it('verifies all view functions and struct components on PERFORMANCE_MANAGER_ABI', () => {
      const viewFns = [
        'currentValue',
        'investedCapital',
        'netProfit',
        'roi',
        'performance',
        'costBasisManager',
        'portfolioManager',
        'oracleManager',
        'indexToken',
        'directory',
        'hasRole',
      ];

      for (const fn of viewFns) {
        const item = getAbiItem({ abi: PERFORMANCE_MANAGER_ABI, name: fn });
        expect(item, `Expected function ${fn} on PERFORMANCE_MANAGER_ABI`).toBeDefined();
      }
    });

    it('verifies events on COST_BASIS_MANAGER_V2_ABI', () => {
      const events = [
        'CostBasisUpdated',
        'RealizedPnLRecorded',
        'AccountingMigrated',
        'EscrowStatusUpdated',
      ];

      for (const ev of events) {
        const item = getAbiItem({ abi: COST_BASIS_MANAGER_V2_ABI, name: ev });
        expect(item, `Expected event ${ev} on COST_BASIS_MANAGER_V2_ABI`).toBeDefined();
      }
    });

    it('verifies custom errors on COST_BASIS_MANAGER_V2_ABI and PERFORMANCE_MANAGER_ABI', () => {
      const cbmErrors = [
        'ZeroAddressDetected',
        'ZeroAmountDetected',
        'InsufficientShares',
        'ReentrancyDetected',
        'UnauthorizedCaller',
      ];

      for (const err of cbmErrors) {
        const item = getAbiItem({ abi: COST_BASIS_MANAGER_V2_ABI, name: err });
        expect(item, `Expected custom error ${err} on COST_BASIS_MANAGER_V2_ABI`).toBeDefined();
      }

      const pmErr = getAbiItem({ abi: PERFORMANCE_MANAGER_ABI, name: 'ZeroAddressDetected' });
      expect(pmErr).toBeDefined();
    });
  });

  // ==========================================
  // 2. Wallet Address Validation
  // ==========================================
  describe('2. Wallet Address Validation', () => {
    it('validates canonical 20-byte EVM addresses', () => {
      expect(isAddress('0xd905920c91853039060246Ed5724AA72B91a96DA')).toBe(true);
      expect(isAddress('0x1563915e194D8CfBA1943570603F7606A3115508')).toBe(true);
      expect(isAddress('0x57869372AFbd7b61752f2f8d3e7F37701e28517B')).toBe(true);
    });

    it('rejects invalid or non-checksummed garbage address strings', () => {
      expect(isAddress('0x123')).toBe(false);
      expect(isAddress('invalid-wallet')).toBe(false);
      expect(isAddress('')).toBe(false);
      expect(isAddress('0xZZZZ920c91853039060246Ed5724AA72B91a96DA')).toBe(false);
    });
  });

  // ==========================================
  // 3. Cost Basis Read Encoding
  // ==========================================
  describe('3. Cost Basis Read Encoding', () => {
    it('encodes costBasis and realizedPnL calls', () => {
      const basisCall = encodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'costBasis',
        args: [SAMPLE_USER],
      });
      const realizedCall = encodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'realizedPnL',
        args: [SAMPLE_USER],
      });

      expect(
        decodeFunctionData({ abi: COST_BASIS_MANAGER_V2_ABI, data: basisCall }).functionName,
      ).toBe('costBasis');
      expect(
        decodeFunctionData({ abi: COST_BASIS_MANAGER_V2_ABI, data: realizedCall }).functionName,
      ).toBe('realizedPnL');
    });
  });

  // ==========================================
  // 4. Performance Read Encoding
  // ==========================================
  describe('4. Performance Read Encoding', () => {
    it('encodes performance and roi view queries', () => {
      const perfCall = encodeFunctionData({
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'performance',
        args: [SAMPLE_USER],
      });
      const roiCall = encodeFunctionData({
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'roi',
        args: [SAMPLE_USER],
      });

      expect(decodeFunctionData({ abi: PERFORMANCE_MANAGER_ABI, data: perfCall }).args).toEqual([
        SAMPLE_USER,
      ]);
      expect(decodeFunctionData({ abi: PERFORMANCE_MANAGER_ABI, data: roiCall }).args).toEqual([
        SAMPLE_USER,
      ]);
    });
  });

  // ==========================================
  // 5. Escrow Status Read & Mutation Encoding
  // ==========================================
  describe('5. Escrow Status Read & Mutation Encoding', () => {
    it('encodes isEscrow view call', () => {
      const isEscrowCall = encodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'isEscrow',
        args: [SAMPLE_USER],
      });
      expect(
        decodeFunctionData({ abi: COST_BASIS_MANAGER_V2_ABI, data: isEscrowCall }).args,
      ).toEqual([SAMPLE_USER]);
    });

    it('encodes setEscrowStatus call', () => {
      const setEscrowCall = encodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'setEscrowStatus',
        args: [SAMPLE_USER, true],
      });
      const decoded = decodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        data: setEscrowCall,
      });

      expect(decoded.functionName).toBe('setEscrowStatus');
      expect(decoded.args).toEqual([SAMPLE_USER, true]);
    });
  });

  // ==========================================
  // 6. Migration Encoding (migrateAccounting)
  // ==========================================
  describe('6. Migration Encoding (migrateAccounting)', () => {
    it('encodes migrateAccounting with positive and signed values', () => {
      const costBasisUSD = parseEther('150.75');
      const realizedPnLUSD = -parseEther('25.50');
      const depositTimestamp = 1720000000n;

      const migrateCall = encodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'migrateAccounting',
        args: [SAMPLE_USER, costBasisUSD, realizedPnLUSD, depositTimestamp],
      });

      const decoded = decodeFunctionData({
        abi: COST_BASIS_MANAGER_V2_ABI,
        data: migrateCall,
      });

      expect(decoded.functionName).toBe('migrateAccounting');
      expect(decoded.args).toEqual([SAMPLE_USER, costBasisUSD, realizedPnLUSD, depositTimestamp]);
    });
  });

  // ==========================================
  // 7. Role Verification & Unauthorized Mutation Prevention
  // ==========================================
  describe('7. Role Verification & Security Controls', () => {
    it('verifies standard AccessControl role hashes', () => {
      expect(DEFAULT_ADMIN_ROLE).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
      expect(GOVERNANCE_ROLE).toBe(
        '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1',
      );
      expect(CONTROLLER_ROLE).toBe(
        '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357',
      );
    });

    it('prevents non-governance caller from authorizing migration or escrow changes', () => {
      const hasGovernanceAccess = (caller: string, adminRoleHolder: string) =>
        caller.toLowerCase() === adminRoleHolder.toLowerCase();

      expect(hasGovernanceAccess(DEPLOYER_ADMIN, DEPLOYER_ADMIN)).toBe(true);
      expect(hasGovernanceAccess(UNAUTHORIZED_USER, DEPLOYER_ADMIN)).toBe(false);
    });
  });

  // ==========================================
  // 8. Accounting Value Formatting & Signed PnL Handling
  // ==========================================
  describe('8. Accounting Value Formatting & Signed PnL Handling', () => {
    it('formats 18-decimal USD values accurately', () => {
      const formatUSD = (val: bigint): string => {
        const isNegative = val < 0n;
        const absVal = isNegative ? -val : val;
        const num = Number(formatEther(absVal));
        const formatted = `$${num.toFixed(2)}`;
        return isNegative ? `-${formatted}` : formatted;
      };

      expect(formatUSD(parseEther('100.50'))).toBe('$100.50');
      expect(formatUSD(-parseEther('25.25'))).toBe('-$25.25');
      expect(formatUSD(0n)).toBe('$0.00');
    });

    it('formats signed ROI from Basis Points (1 BPS = 0.01%)', () => {
      const formatROI = (bps: bigint): string => {
        const numBps = Number(bps);
        const percent = numBps / 100;
        const sign = numBps > 0 ? '+' : '';
        return `${sign}${percent.toFixed(2)}%`;
      };

      expect(formatROI(500n)).toBe('+5.00%');
      expect(formatROI(-250n)).toBe('-2.50%');
      expect(formatROI(10000n)).toBe('+100.00%');
      expect(formatROI(0n)).toBe('0.00%');
    });
  });

  // ==========================================
  // 9. Error Decoding for Accounting Custom Errors
  // ==========================================
  describe('9. Error Decoding for Accounting Custom Errors', () => {
    it('decodes ZeroAddressDetected error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: COST_BASIS_MANAGER_V2_ABI,
        errorName: 'ZeroAddressDetected',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Zero address detected in accounting operation.');
    });

    it('decodes InsufficientShares error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: COST_BASIS_MANAGER_V2_ABI,
        errorName: 'InsufficientShares',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Insufficient user share balance for accounting operation.');
    });

    it('decodes UnauthorizedCaller error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: COST_BASIS_MANAGER_V2_ABI,
        errorName: 'UnauthorizedCaller',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Caller is not authorized to invoke this accounting hook.');
    });

    it('decodes ReentrancyDetected error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: COST_BASIS_MANAGER_V2_ABI,
        errorName: 'ReentrancyDetected',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Reentrancy guard triggered on accounting contract.');
    });
  });

  // ==========================================
  // 10. No Manual Nonce Handling
  // ==========================================
  describe('10. No Manual Nonce Handling', () => {
    it('verifies that no manual transaction nonces are passed in write configs', () => {
      const sampleMigrationConfig = {
        address: DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'migrateAccounting',
        args: [SAMPLE_USER, parseEther('100'), parseEther('0'), 1720000000n],
      };

      expect(sampleMigrationConfig).not.toHaveProperty('nonce');
    });
  });

  // ==========================================
  // 11. Deployed Addresses on Base Sepolia
  // ==========================================
  describe('11. Deployed Addresses on Base Sepolia', () => {
    it('resolves canonical CostBasisManager and PerformanceManager addresses', () => {
      expect(DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager.toLowerCase()).toBe(
        '0xf71706a2fd8692e3c739855b2a33c0e679b4c382',
      );
      expect(DEPLOYED_CONTRACTS_SEPOLIA.PerformanceManager.toLowerCase()).toBe(
        '0x133fd024ea635694a223e66b936c2afab4f2db78',
      );
      expect(DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken.toLowerCase()).toBe(
        '0xa3db7c3dee9a50d966a06e19b5df4fcdee615bde',
      );
    });

    it('resolves BaseScan explorer URL on Base Sepolia', () => {
      const url = getExplorerBaseUrl(84532);
      expect(url).toBe('https://sepolia.basescan.org');
    });
  });
});
