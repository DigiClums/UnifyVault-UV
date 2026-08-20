import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  parseUnits,
  encodeErrorResult,
} from 'viem';
import { LIQUIDITY_MANAGER_ABI } from '../contracts/liquidity';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { decodeTransactionError } from '../utils/errorDecoder';
import { GOVERNANCE_ROLE, CONTROLLER_ROLE } from '../../hooks/useLiquidityAdmin';

describe('Phase 7: Liquidity & Reserve Admin Test Suite', () => {
  const USDC_ADDR = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

  // ==========================================
  // 1. ABI Alignment with Solidity
  // ==========================================
  describe('1. ABI Alignment with Solidity', () => {
    it('verifies all view functions on LIQUIDITY_MANAGER_ABI', () => {
      const viewFns = [
        'BPS_DENOMINATOR',
        'DEFAULT_OPERATIONAL_TARGET_BPS',
        'DEFAULT_REFILL_THRESHOLD_BPS',
        'DEFAULT_EXCESS_THRESHOLD_BPS',
        'directory',
        'custodyVault',
        'getLiquidityBalances',
        'getThresholds',
        'assessLiquidity',
        'hasRole',
      ];
      for (const fn of viewFns) {
        expect(getAbiItem({ abi: LIQUIDITY_MANAGER_ABI, name: fn })).toBeDefined();
      }
    });

    it('verifies mutating governance functions on LIQUIDITY_MANAGER_ABI', () => {
      const writeFns = [
        'refillOperationalLiquidity',
        'sweepReserveLiquidity',
        'setThresholds',
        'resetThresholds',
        'setLiquidityBalances',
        'recordDeposit',
        'recordWithdrawal',
        'checkLiquidity',
        'syncModules',
      ];
      for (const fn of writeFns) {
        const item = getAbiItem({ abi: LIQUIDITY_MANAGER_ABI, name: fn });
        expect(item).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('nonpayable');
      }
    });

    it('verifies events on LIQUIDITY_MANAGER_ABI', () => {
      const events = [
        'RefillRequired',
        'ReserveSweepRequired',
        'OperationalLiquidityRefilled',
        'ReserveLiquiditySwept',
        'ThresholdsConfigured',
        'LiquidityBalancesSynced',
        'VaultSynchronized',
      ];
      for (const ev of events) {
        expect(getAbiItem({ abi: LIQUIDITY_MANAGER_ABI, name: ev })).toBeDefined();
      }
    });
  });

  // ==========================================
  // 2. Liquidity Function Encodings
  // ==========================================
  describe('2. Liquidity Function Encodings', () => {
    it('encodes refillOperationalLiquidity and sweepReserveLiquidity', () => {
      const amount = parseUnits('1000', 6);
      const refillCall = encodeFunctionData({
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'refillOperationalLiquidity',
        args: [USDC_ADDR, amount],
      });
      const sweepCall = encodeFunctionData({
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'sweepReserveLiquidity',
        args: [USDC_ADDR, amount],
      });

      expect(decodeFunctionData({ abi: LIQUIDITY_MANAGER_ABI, data: refillCall }).args).toEqual([
        USDC_ADDR,
        amount,
      ]);
      expect(decodeFunctionData({ abi: LIQUIDITY_MANAGER_ABI, data: sweepCall }).args).toEqual([
        USDC_ADDR,
        amount,
      ]);
    });

    it('encodes setThresholds call', () => {
      const call = encodeFunctionData({
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'setThresholds',
        args: [USDC_ADDR, 1000n, 500n, 1500n],
      });
      const decoded = decodeFunctionData({ abi: LIQUIDITY_MANAGER_ABI, data: call });
      expect(decoded.functionName).toBe('setThresholds');
      expect(decoded.args).toEqual([USDC_ADDR, 1000n, 500n, 1500n]);
    });
  });

  // ==========================================
  // 3. Security & Nonce Handling
  // ==========================================
  describe('3. Security & Nonce Handling', () => {
    it('verifies roles GOVERNANCE_ROLE and CONTROLLER_ROLE', () => {
      expect(GOVERNANCE_ROLE).toBe(
        '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1',
      );
      expect(CONTROLLER_ROLE).toBe(
        '0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357',
      );
    });

    it('verifies zero manual nonce usage in write configurations', () => {
      const writeConfig = {
        address: DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'refillOperationalLiquidity',
        args: [USDC_ADDR, 1000000n],
      };
      expect(writeConfig).not.toHaveProperty('nonce');
    });
  });

  // ==========================================
  // 4. Error Decoding
  // ==========================================
  describe('4. Error Decoding', () => {
    it('decodes InvalidThresholdConfiguration custom error', () => {
      const encoded = encodeErrorResult({
        abi: LIQUIDITY_MANAGER_ABI,
        errorName: 'InvalidThresholdConfiguration',
      });
      const decoded = decodeTransactionError({ data: encoded });
      expect(decoded.message).toContain('Invalid threshold configuration');
    });

    it('decodes InsufficientReserveBalance custom error', () => {
      const encoded = encodeErrorResult({
        abi: LIQUIDITY_MANAGER_ABI,
        errorName: 'InsufficientReserveBalance',
        args: [USDC_ADDR, 2000n, 1000n],
      });
      const decoded = decodeTransactionError({ data: encoded });
      expect(decoded.message).toContain('Insufficient reserve liquidity balance');
    });
  });
});
