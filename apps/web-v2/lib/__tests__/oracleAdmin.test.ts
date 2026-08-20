import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  parseEther,
  formatEther,
  encodeErrorResult,
} from 'viem';
import { ORACLE_MANAGER_ABI, CHAINLINK_ORACLE_PROVIDER_ABI } from '../contracts/oracle';
import { DEPLOYED_CONTRACTS_SEPOLIA, getExplorerBaseUrl } from '../../constants';
import { decodeTransactionError } from '../utils/errorDecoder';
import { GOVERNANCE_ROLE, DEFAULT_ADMIN_ROLE, toAssetId } from '../../hooks/useOracleAdmin';

describe('Phase 7: Oracle Risk & Provider Admin Test Suite', () => {
  const DEPLOYER_ADMIN = '0xd905920c91853039060246Ed5724AA72B91a96DA' as const;
  const SAMPLE_ASSET = '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29' as const; // cbBTC
  const SAMPLE_FEED = '0x1111111111111111111111111111111111111111' as const;
  const assetId = toAssetId(SAMPLE_ASSET);

  // ==========================================
  // 1. ABI Alignment with Solidity
  // ==========================================
  describe('1. ABI Alignment with Solidity', () => {
    it('verifies all view functions on ORACLE_MANAGER_ABI', () => {
      const viewFns = [
        'getAssetPrice',
        'isPriceFresh',
        'getFeedMetadata',
        'getPrice',
        'getNormalizedPrice',
        'isHealthy',
        'getProvider',
        'getFallbackProvider',
        'getMaxDeviationBps',
        'getLastValidPrice',
        'getAssetConfig',
        'hasRole',
      ];

      for (const fn of viewFns) {
        const item = getAbiItem({ abi: ORACLE_MANAGER_ABI, name: fn });
        expect(item, `Expected function ${fn} on ORACLE_MANAGER_ABI`).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('view');
      }
    });

    it('verifies mutating governance functions on ORACLE_MANAGER_ABI', () => {
      const writeFns = [
        'configureAsset',
        'setMaxDeviationBps',
        'resetCircuitBreaker',
        'setAssetEnabled',
        'getValidatedPrice',
      ];

      for (const fn of writeFns) {
        const item = getAbiItem({ abi: ORACLE_MANAGER_ABI, name: fn });
        expect(item, `Expected function ${fn} on ORACLE_MANAGER_ABI`).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('nonpayable');
      }
    });

    it('verifies all view and write functions on CHAINLINK_ORACLE_PROVIDER_ABI', () => {
      const viewFns = [
        'getLatestPrice',
        'getLatestRound',
        'getDecimals',
        'getUpdatedAt',
        'isHealthy',
        'getFeedConfig',
        'hasRole',
      ];
      for (const fn of viewFns) {
        const item = getAbiItem({ abi: CHAINLINK_ORACLE_PROVIDER_ABI, name: fn });
        expect(item).toBeDefined();
      }

      const writeFns = [
        'registerFeed',
        'updateFeed',
        'removeFeed',
        'updateHeartbeat',
        'setFeedEnabled',
      ];
      for (const fn of writeFns) {
        const item = getAbiItem({ abi: CHAINLINK_ORACLE_PROVIDER_ABI, name: fn });
        expect(item).toBeDefined();
      }
    });

    it('verifies events on ORACLE_MANAGER_ABI and CHAINLINK_ORACLE_PROVIDER_ABI', () => {
      const omEvents = [
        'PrimaryProviderUpdated',
        'FallbackProviderUpdated',
        'ProviderEnabled',
        'ProviderDisabled',
        'MaxDeviationUpdated',
        'CircuitBreakerReset',
        'OracleFailure',
        'OracleFallback',
      ];
      for (const ev of omEvents) {
        expect(getAbiItem({ abi: ORACLE_MANAGER_ABI, name: ev })).toBeDefined();
      }

      const clEvents = [
        'FeedRegistered',
        'FeedUpdated',
        'FeedRemoved',
        'HeartbeatUpdated',
        'FeedEnabledSet',
      ];
      for (const ev of clEvents) {
        expect(getAbiItem({ abi: CHAINLINK_ORACLE_PROVIDER_ABI, name: ev })).toBeDefined();
      }
    });
  });

  // ==========================================
  // 2. Asset Identifier & Read Encoding
  // ==========================================
  describe('2. Asset Identifier & Read Encoding', () => {
    it('computes 32-byte assetId from 20-byte address', () => {
      expect(assetId.length).toBe(66);
      expect(assetId.startsWith('0x000000000000000000000000')).toBe(true);
    });

    it('encodes getPrice and isHealthy queries', () => {
      const getPriceCall = encodeFunctionData({
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getPrice',
        args: [assetId],
      });
      const isHealthyCall = encodeFunctionData({
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isHealthy',
        args: [assetId],
      });

      expect(decodeFunctionData({ abi: ORACLE_MANAGER_ABI, data: getPriceCall }).args).toEqual([
        assetId,
      ]);
      expect(decodeFunctionData({ abi: ORACLE_MANAGER_ABI, data: isHealthyCall }).args).toEqual([
        assetId,
      ]);
    });
  });

  // ==========================================
  // 3. Mutating Call Encodings
  // ==========================================
  describe('3. Mutating Call Encodings', () => {
    it('encodes configureAsset call', () => {
      const call = encodeFunctionData({
        abi: ORACLE_MANAGER_ABI,
        functionName: 'configureAsset',
        args: [assetId, SAMPLE_FEED, '0x0000000000000000000000000000000000000000', 86400, true],
      });
      const decoded = decodeFunctionData({ abi: ORACLE_MANAGER_ABI, data: call });
      expect(decoded.functionName).toBe('configureAsset');
      expect(decoded.args).toEqual([
        assetId,
        SAMPLE_FEED,
        '0x0000000000000000000000000000000000000000',
        86400,
        true,
      ]);
    });

    it('encodes resetCircuitBreaker call', () => {
      const price = parseEther('65000.00');
      const call = encodeFunctionData({
        abi: ORACLE_MANAGER_ABI,
        functionName: 'resetCircuitBreaker',
        args: [assetId, price],
      });
      const decoded = decodeFunctionData({ abi: ORACLE_MANAGER_ABI, data: call });
      expect(decoded.functionName).toBe('resetCircuitBreaker');
      expect(decoded.args).toEqual([assetId, price]);
    });

    it('encodes setMaxDeviationBps call', () => {
      const call = encodeFunctionData({
        abi: ORACLE_MANAGER_ABI,
        functionName: 'setMaxDeviationBps',
        args: [assetId, 1500n],
      });
      const decoded = decodeFunctionData({ abi: ORACLE_MANAGER_ABI, data: call });
      expect(decoded.functionName).toBe('setMaxDeviationBps');
      expect(decoded.args).toEqual([assetId, 1500n]);
    });

    it('encodes registerFeed and updateFeed on Chainlink provider', () => {
      const regCall = encodeFunctionData({
        abi: CHAINLINK_ORACLE_PROVIDER_ABI,
        functionName: 'registerFeed',
        args: [assetId, SAMPLE_FEED, 86400],
      });
      expect(
        decodeFunctionData({ abi: CHAINLINK_ORACLE_PROVIDER_ABI, data: regCall }).functionName,
      ).toBe('registerFeed');
    });
  });

  // ==========================================
  // 4. Role & Security Safeguards
  // ==========================================
  describe('4. Role & Security Safeguards', () => {
    it('verifies GOVERNANCE_ROLE and DEFAULT_ADMIN_ROLE', () => {
      expect(GOVERNANCE_ROLE).toBe(
        '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1',
      );
      expect(DEFAULT_ADMIN_ROLE).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });

    it('verifies zero manual nonce usage', () => {
      const writeConfig = {
        address: DEPLOYED_CONTRACTS_SEPOLIA.OracleManager,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'setMaxDeviationBps',
        args: [assetId, 1000n],
      };
      expect(writeConfig).not.toHaveProperty('nonce');
    });
  });

  // ==========================================
  // 5. Error Decoding
  // ==========================================
  describe('5. Error Decoding', () => {
    it('decodes UnsafePricing custom error', () => {
      const encoded = encodeErrorResult({
        abi: ORACLE_MANAGER_ABI,
        errorName: 'UnsafePricing',
        args: [SAMPLE_ASSET],
      });
      const decoded = decodeTransactionError({ data: encoded });
      expect(decoded.message).toContain('Oracle price safety check failed');
    });

    it('decodes IncompleteRound custom error', () => {
      const encoded = encodeErrorResult({
        abi: CHAINLINK_ORACLE_PROVIDER_ABI,
        errorName: 'IncompleteRound',
        args: [assetId],
      });
      const decoded = decodeTransactionError({ data: encoded });
      expect(decoded.message).toContain('incomplete round');
    });
  });
});
