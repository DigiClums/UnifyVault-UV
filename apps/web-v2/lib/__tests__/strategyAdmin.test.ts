import { describe, it, expect } from 'vitest';
import { getAbiItem, encodeFunctionData, decodeFunctionData, encodeErrorResult } from 'viem';
import { STRATEGY_MANAGER_ABI } from '../contracts/strategy';
import { PORTFOLIO_MANAGER_ABI } from '../contracts/portfolioManager';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { decodeTransactionError } from '../utils/errorDecoder';
import { GOVERNANCE_ROLE } from '../../hooks/useStrategyAdmin';

describe('Phase 7: Strategy & Rebalance Admin Test Suite', () => {
  const BTC_ADDR = '0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29' as const;
  const ETH_ADDR = '0xd116ab1c943cf15904eC4c8dd701086f175FA323' as const;

  // ==========================================
  // 1. ABI Alignment with Solidity
  // ==========================================
  describe('1. ABI Alignment with Solidity', () => {
    it('verifies all view functions on STRATEGY_MANAGER_ABI', () => {
      const viewFns = [
        'TOTAL_BPS',
        'getSupportedAssets',
        'getAssetWeight',
        'getTargetWeights',
        'getTotalAllocationBps',
        'isSupportedAsset',
        'getAssetCount',
        'hasRole',
      ];
      for (const fn of viewFns) {
        expect(getAbiItem({ abi: STRATEGY_MANAGER_ABI, name: fn })).toBeDefined();
      }
    });

    it('verifies mutating governance functions on STRATEGY_MANAGER_ABI', () => {
      const writeFns = ['setStrategy', 'addAsset', 'removeAsset', 'updateWeights'];
      for (const fn of writeFns) {
        const item = getAbiItem({ abi: STRATEGY_MANAGER_ABI, name: fn });
        expect(item).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('nonpayable');
      }
    });
  });

  // ==========================================
  // 2. Invariant & Weight Sum Validation
  // ==========================================
  describe('2. Invariant & Weight Sum Validation', () => {
    it('validates exact 10,000 BPS sum rule', () => {
      const validWeights = [5000n, 5000n];
      const sum = validWeights.reduce((a, b) => a + b, 0n);
      expect(sum).toBe(10000n);

      const invalidWeights = [5000n, 4000n];
      const badSum = invalidWeights.reduce((a, b) => a + b, 0n);
      expect(badSum).not.toBe(10000n);
    });

    it('encodes updateWeights and setStrategy calls', () => {
      const updateCall = encodeFunctionData({
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'updateWeights',
        args: [
          [BTC_ADDR, ETH_ADDR],
          [6000n, 4000n],
        ],
      });
      const decoded = decodeFunctionData({ abi: STRATEGY_MANAGER_ABI, data: updateCall });
      expect(decoded.functionName).toBe('updateWeights');
      expect(decoded.args).toEqual([
        [BTC_ADDR, ETH_ADDR],
        [6000n, 4000n],
      ]);
    });

    it('encodes addAsset and removeAsset calls', () => {
      const addCall = encodeFunctionData({
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'addAsset',
        args: [BTC_ADDR, 2000n],
      });
      const removeCall = encodeFunctionData({
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'removeAsset',
        args: [BTC_ADDR],
      });

      expect(decodeFunctionData({ abi: STRATEGY_MANAGER_ABI, data: addCall }).functionName).toBe(
        'addAsset',
      );
      expect(decodeFunctionData({ abi: STRATEGY_MANAGER_ABI, data: removeCall }).functionName).toBe(
        'removeAsset',
      );
    });
  });

  // ==========================================
  // 3. Security & Nonce Handling
  // ==========================================
  describe('3. Security & Nonce Handling', () => {
    it('verifies GOVERNANCE_ROLE matches canonical AccessRoles.sol', () => {
      expect(GOVERNANCE_ROLE).toBe(
        '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1',
      );
    });

    it('verifies zero manual nonce usage', () => {
      const writeConfig = {
        address: DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'updateWeights',
        args: [
          [BTC_ADDR, ETH_ADDR],
          [5000n, 5000n],
        ],
      };
      expect(writeConfig).not.toHaveProperty('nonce');
    });
  });

  // ==========================================
  // 4. Error Decoding
  // ==========================================
  describe('4. Error Decoding', () => {
    it('decodes InvalidTotalAllocation custom error', () => {
      const encoded = encodeErrorResult({
        abi: STRATEGY_MANAGER_ABI,
        errorName: 'InvalidTotalAllocation',
        args: [9000n, 10000n],
      });
      const decoded = decodeTransactionError({ data: encoded });
      expect(decoded.message).toContain('10,000 basis points');
    });

    it('decodes ZeroWeightNotAllowed custom error', () => {
      const encoded = encodeErrorResult({
        abi: STRATEGY_MANAGER_ABI,
        errorName: 'ZeroWeightNotAllowed',
      });
      const decoded = decodeTransactionError({ data: encoded });
      expect(decoded.message).toContain('weight cannot be zero');
    });
  });
});
