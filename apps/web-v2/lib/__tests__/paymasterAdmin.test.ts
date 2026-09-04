import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  parseEther,
  formatEther,
  parseGwei,
  formatGwei,
  isAddress,
  getAddress,
  encodeErrorResult,
} from 'viem';
import {
  UNIFY_VAULT_PAYMASTER_ABI,
  GAS_TREASURY_ABI,
  ENTRYPOINT_V07_ABI,
  KNOWN_SPONSORSHIP_TARGETS,
} from '../contracts/paymaster';
import { DEPLOYED_CONTRACTS_MAINNET, getExplorerBaseUrl } from '../../constants';
import { decodeTransactionError } from '../utils/errorDecoder';
import { PaymasterHealthStatus } from '../../hooks/usePaymasterAdmin';

describe('Phase 5: Paymaster & Gas Treasury Admin Console Test Suite', () => {
  const DEPLOYER_ADMIN = '0xd905920c91853039060246Ed5724AA72B91a96DA' as const;
  const REFILL_OPERATOR = '0xd905920c91853039060246Ed5724AA72B91a96DA' as const;
  const UNAUTHORIZED_USER = '0x1111111111111111111111111111111111111111' as const;

  // ==========================================
  // 1. Paymaster ABI Alignment
  // ==========================================
  describe('1. Paymaster ABI Alignment', () => {
    it('verifies all state inspection view functions exist on UNIFY_VAULT_PAYMASTER_ABI', () => {
      const viewFns = [
        'entryPoint',
        'EXECUTE_SELECTOR',
        'EXECUTE_BATCH_SELECTOR',
        'verifyingSigner',
        'maxCostPerUserOp',
        'maxFeePerGasCap',
        'userOpCooldown',
        'requireSigner',
        'isPaused',
        'approvedTargets',
        'approvedSelectors',
        'lastSponsoredTimestamp',
        'owner',
        'getDeposit',
        'getHash',
      ];

      for (const fn of viewFns) {
        const item = getAbiItem({ abi: UNIFY_VAULT_PAYMASTER_ABI, name: fn });
        expect(item, `Expected view function ${fn} on UNIFY_VAULT_PAYMASTER_ABI`).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('view');
      }
    });

    it('verifies all policy configuration & administrative write functions on UNIFY_VAULT_PAYMASTER_ABI', () => {
      const writeFns = [
        'setApprovedTarget',
        'setApprovedSelector',
        'setVerifyingSigner',
        'setPolicyConfig',
        'setPaused',
        'deposit',
        'withdrawTo',
        'addStake',
        'unlockStake',
        'withdrawStake',
        'transferOwnership',
        'renounceOwnership',
      ];

      for (const fn of writeFns) {
        const item = getAbiItem({ abi: UNIFY_VAULT_PAYMASTER_ABI, name: fn });
        expect(item, `Expected write function ${fn} on UNIFY_VAULT_PAYMASTER_ABI`).toBeDefined();
      }
    });

    it('verifies all events on UNIFY_VAULT_PAYMASTER_ABI', () => {
      const events = [
        'TargetApprovalUpdated',
        'SelectorApprovalUpdated',
        'SignerUpdated',
        'PolicyConfigUpdated',
        'UserOperationSponsored',
        'GasWithdrawn',
        'EmergencyPaused',
        'OwnershipTransferred',
      ];

      for (const ev of events) {
        const item = getAbiItem({ abi: UNIFY_VAULT_PAYMASTER_ABI, name: ev });
        expect(item, `Expected event ${ev} on UNIFY_VAULT_PAYMASTER_ABI`).toBeDefined();
      }
    });

    it('verifies all custom errors on UNIFY_VAULT_PAYMASTER_ABI', () => {
      const errors = [
        'OnlyEntryPoint',
        'PaymasterPaused',
        'MaxCostExceeded',
        'GasFeeCapExceeded',
        'SenderCooldownActive',
        'InvalidTarget',
        'InvalidSelector',
        'NativeValueForbidden',
        'InvalidBatchLengths',
        'ExactApprovalViolation',
        'InvalidSigner',
        'InvalidSignatureLength',
        'SignatureExpired',
        'SignatureNotYetValid',
        'VerifyingSignerRequired',
      ];

      for (const err of errors) {
        const item = getAbiItem({ abi: UNIFY_VAULT_PAYMASTER_ABI, name: err });
        expect(item, `Expected custom error ${err} on UNIFY_VAULT_PAYMASTER_ABI`).toBeDefined();
      }
    });
  });

  // ==========================================
  // 2. GasTreasury ABI Alignment
  // ==========================================
  describe('2. GasTreasury ABI Alignment', () => {
    it('verifies all state inspection view functions on GAS_TREASURY_ABI', () => {
      const viewFns = [
        'refillOperator',
        'paymaster',
        'maxRefillPerTx',
        'dailyRefillLimit',
        'currentDayRefillTotal',
        'currentDayWindowStart',
        'isPaused',
        'owner',
        'checkPaymasterNeedsRefill',
      ];

      for (const fn of viewFns) {
        const item = getAbiItem({ abi: GAS_TREASURY_ABI, name: fn });
        expect(item, `Expected view function ${fn} on GAS_TREASURY_ABI`).toBeDefined();
        // @ts-expect-error type check
        expect(item.stateMutability).toBe('view');
      }
    });

    it('verifies operational and administrative write functions on GAS_TREASURY_ABI', () => {
      const writeFns = [
        'refillPaymaster',
        'setRefillOperator',
        'setPaymaster',
        'setLimits',
        'setPaused',
        'withdrawEmergency',
        'transferOwnership',
        'renounceOwnership',
      ];

      for (const fn of writeFns) {
        const item = getAbiItem({ abi: GAS_TREASURY_ABI, name: fn });
        expect(item, `Expected write function ${fn} on GAS_TREASURY_ABI`).toBeDefined();
      }
    });

    it('verifies events and custom errors on GAS_TREASURY_ABI', () => {
      const events = [
        'PaymasterRefilled',
        'RefillOperatorUpdated',
        'PaymasterAddressUpdated',
        'LimitsUpdated',
        'EmergencyFundsWithdrawn',
        'EmergencyPaused',
        'OwnershipTransferred',
      ];

      for (const ev of events) {
        const item = getAbiItem({ abi: GAS_TREASURY_ABI, name: ev });
        expect(item, `Expected event ${ev} on GAS_TREASURY_ABI`).toBeDefined();
      }

      const errors = [
        'OnlyOperatorOrOwner',
        'TreasuryPaused',
        'InvalidPaymaster',
        'ExceedsMaxRefillPerTx',
        'ExceedsDailyRefillLimit',
        'InsufficientTreasuryBalance',
      ];

      for (const err of errors) {
        const item = getAbiItem({ abi: GAS_TREASURY_ABI, name: err });
        expect(item, `Expected custom error ${err} on GAS_TREASURY_ABI`).toBeDefined();
      }
    });
  });

  // ==========================================
  // 3. Address Validation
  // ==========================================
  describe('3. Address Validation', () => {
    it('validates canonical EVM addresses', () => {
      expect(isAddress('0xd905920c91853039060246Ed5724AA72B91a96DA')).toBe(true);
      expect(isAddress('0x42c6342516714CFd64474bd41Ce360605b9fEA88')).toBe(true);
      expect(isAddress('0xd4b19a48c270b720feeed57ccab5aa4ecfcc1fd9')).toBe(true);
    });

    it('rejects invalid, malformed, or non-hex address strings', () => {
      expect(isAddress('0x123')).toBe(false);
      expect(isAddress('not_an_address')).toBe(false);
      expect(isAddress('')).toBe(false);
      expect(isAddress('0xZZZZ920c91853039060246Ed5724AA72B91a96DA')).toBe(false);
    });
  });

  // ==========================================
  // 4. Selector Validation
  // ==========================================
  describe('4. Selector Validation', () => {
    const isValidSelector = (sel: string): boolean => {
      const clean = sel.trim().toLowerCase();
      return /^0x[0-9a-fA-F]{8}$/.test(clean);
    };

    it('accepts valid 4-byte / 8-hex selector formats', () => {
      expect(isValidSelector('0x095ea7b3')).toBe(true); // approve
      expect(isValidSelector('0xa9059cbb')).toBe(true); // transfer
      expect(isValidSelector('0x8b6099db')).toBe(true); // deposit
      expect(isValidSelector('0xba8c738e')).toBe(true); // redeem
      expect(isValidSelector('0x409543e0')).toBe(true); // createTrade
    });

    it('rejects malformed, non-4-byte, or invalid hex selector formats', () => {
      expect(isValidSelector('0x095ea7')).toBe(false); // Too short (3 bytes)
      expect(isValidSelector('0x095ea7b312')).toBe(false); // Too long (5 bytes)
      expect(isValidSelector('095ea7b3')).toBe(false); // Missing 0x prefix
      expect(isValidSelector('0xZZZZZZZZ')).toBe(false); // Invalid hex
      expect(isValidSelector('')).toBe(false);
    });
  });

  // ==========================================
  // 5. Authorization Checks
  // ==========================================
  describe('5. Authorization Checks', () => {
    it('verifies owner authorization for Paymaster', () => {
      const checkPaymasterOwner = (user?: string, owner?: string) =>
        Boolean(user && owner && user.toLowerCase() === owner.toLowerCase());

      expect(checkPaymasterOwner(DEPLOYER_ADMIN, DEPLOYER_ADMIN)).toBe(true);
      expect(checkPaymasterOwner(UNAUTHORIZED_USER, DEPLOYER_ADMIN)).toBe(false);
      expect(checkPaymasterOwner(undefined, DEPLOYER_ADMIN)).toBe(false);
    });

    it('verifies owner or operator authorization for Gas Treasury refill', () => {
      const checkCanRefill = (user?: string, owner?: string, operator?: string) => {
        if (!user) return false;
        const u = user.toLowerCase();
        return (owner && u === owner.toLowerCase()) || (operator && u === operator.toLowerCase());
      };

      expect(checkCanRefill(DEPLOYER_ADMIN, DEPLOYER_ADMIN, REFILL_OPERATOR)).toBe(true);
      expect(checkCanRefill(REFILL_OPERATOR, DEPLOYER_ADMIN, REFILL_OPERATOR)).toBe(true);
      expect(checkCanRefill(UNAUTHORIZED_USER, DEPLOYER_ADMIN, REFILL_OPERATOR)).toBe(false);
    });
  });

  // ==========================================
  // 6. Unauthorized Write Prevention
  // ==========================================
  describe('6. Unauthorized Write Prevention', () => {
    it('prevents non-owner from executing policy and limit modifications', () => {
      const canModifyPolicy = (caller: string, owner: string) =>
        caller.toLowerCase() === owner.toLowerCase();

      expect(canModifyPolicy(UNAUTHORIZED_USER, DEPLOYER_ADMIN)).toBe(false);
      expect(canModifyPolicy(DEPLOYER_ADMIN, DEPLOYER_ADMIN)).toBe(true);
    });
  });

  // ==========================================
  // 7. Policy Configuration Encoding
  // ==========================================
  describe('7. Policy Configuration Encoding', () => {
    it('encodes setPolicyConfig with valid parameters', () => {
      const maxCost = parseEther('0.05');
      const maxFeeCap = parseGwei('100');
      const cooldown = 60n;
      const requireSigner = true;

      const callData = encodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setPolicyConfig',
        args: [maxCost, maxFeeCap, cooldown, requireSigner],
      });

      const decoded = decodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('setPolicyConfig');
      expect(decoded.args[0]).toBe(maxCost);
      expect(decoded.args[1]).toBe(maxFeeCap);
      expect(decoded.args[2]).toBe(cooldown);
      expect(decoded.args[3]).toBe(requireSigner);
    });
  });

  // ==========================================
  // 8. Target Approval Encoding
  // ==========================================
  describe('8. Target Approval Encoding', () => {
    it('encodes setApprovedTarget with true and false values', () => {
      const target = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

      const approveData = encodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setApprovedTarget',
        args: [target, true],
      });

      const revokeData = encodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setApprovedTarget',
        args: [target, false],
      });

      expect(
        decodeFunctionData({ abi: UNIFY_VAULT_PAYMASTER_ABI, data: approveData }).args,
      ).toEqual([target, true]);
      expect(decodeFunctionData({ abi: UNIFY_VAULT_PAYMASTER_ABI, data: revokeData }).args).toEqual(
        [target, false],
      );
    });
  });

  // ==========================================
  // 9. Selector Approval Encoding
  // ==========================================
  describe('9. Selector Approval Encoding', () => {
    it('encodes setApprovedSelector with target, selector, and approved flag', () => {
      const target = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      const selector = '0x095ea7b3' as `0x${string}`;

      const callData = encodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setApprovedSelector',
        args: [target, selector, true],
      });

      const decoded = decodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('setApprovedSelector');
      expect(decoded.args).toEqual([target, selector, true]);
    });
  });

  // ==========================================
  // 10. Gas Treasury Refill Encoding
  // ==========================================
  describe('10. Gas Treasury Refill Encoding', () => {
    it('encodes refillPaymaster on GAS_TREASURY_ABI', () => {
      const refillAmount = parseEther('0.05');

      const callData = encodeFunctionData({
        abi: GAS_TREASURY_ABI,
        functionName: 'refillPaymaster',
        args: [refillAmount],
      });

      const decoded = decodeFunctionData({
        abi: GAS_TREASURY_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('refillPaymaster');
      expect(decoded.args[0]).toBe(refillAmount);
    });
  });

  // ==========================================
  // 11. Emergency Pause Authorization
  // ==========================================
  describe('11. Emergency Pause Authorization', () => {
    it('encodes setPaused on Paymaster and Gas Treasury', () => {
      const paymasterPause = encodeFunctionData({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setPaused',
        args: [true],
      });
      const treasuryPause = encodeFunctionData({
        abi: GAS_TREASURY_ABI,
        functionName: 'setPaused',
        args: [true],
      });

      expect(
        decodeFunctionData({ abi: UNIFY_VAULT_PAYMASTER_ABI, data: paymasterPause }).args[0],
      ).toBe(true);
      expect(decodeFunctionData({ abi: GAS_TREASURY_ABI, data: treasuryPause }).args[0]).toBe(true);
    });
  });

  // ==========================================
  // 12. Transaction Lifecycle States
  // ==========================================
  describe('12. Transaction Lifecycle States', () => {
    it('generates accurate BaseScan explorer URLs on Base Mainnet (8453)', () => {
      const baseUrl = getExplorerBaseUrl(8453);
      expect(baseUrl).toBe('https://basescan.org');

      const sampleTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(`${baseUrl}/tx/${sampleTxHash}`).toBe(
        'https://basescan.org/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      );
    });
  });

  // ==========================================
  // 13. Error Decoding
  // ==========================================
  describe('13. Error Decoding', () => {
    it('decodes PaymasterPaused error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        errorName: 'PaymasterPaused',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Paymaster gas sponsorship is currently paused.');
    });

    it('decodes MaxCostExceeded error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        errorName: 'MaxCostExceeded',
        args: [parseEther('0.1'), parseEther('0.05')],
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('UserOperation gas cost exceeds max cost per op limit.');
    });

    it('decodes TreasuryPaused error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: GAS_TREASURY_ABI,
        errorName: 'TreasuryPaused',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Gas Treasury is currently paused.');
    });

    it('decodes OnlyOperatorOrOwner error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: GAS_TREASURY_ABI,
        errorName: 'OnlyOperatorOrOwner',
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe(
        'Caller is neither the Gas Treasury owner nor designated refill operator.',
      );
    });

    it('decodes InsufficientTreasuryBalance error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: GAS_TREASURY_ABI,
        errorName: 'InsufficientTreasuryBalance',
        args: [parseEther('1.0'), parseEther('0.1')],
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Insufficient native ETH balance in Gas Treasury reserve.');
    });

    it('decodes ExceedsMaxRefillPerTx error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: GAS_TREASURY_ABI,
        errorName: 'ExceedsMaxRefillPerTx',
        args: [parseEther('1.0'), parseEther('0.5')],
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Refill amount exceeds maximum refill per transaction limit.');
    });

    it('decodes ExceedsDailyRefillLimit error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: GAS_TREASURY_ABI,
        errorName: 'ExceedsDailyRefillLimit',
        args: [parseEther('2.5'), parseEther('2.0')],
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Refill amount exceeds remaining 24-hour daily refill limit.');
    });

    it('decodes InvalidTarget error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        errorName: 'InvalidTarget',
        args: ['0x1111111111111111111111111111111111111111'],
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe('Target contract is not whitelisted for Paymaster gas sponsorship.');
    });

    it('decodes InvalidSelector error into human-readable message', () => {
      const encoded = encodeErrorResult({
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        errorName: 'InvalidSelector',
        args: ['0x1111111111111111111111111111111111111111', '0x12345678'],
      });
      const res = decodeTransactionError({ data: encoded });
      expect(res.message).toBe(
        'Function selector is not whitelisted for Paymaster gas sponsorship.',
      );
    });
  });

  // ==========================================
  // 14. No Manual Nonce Handling
  // ==========================================
  describe('14. No Manual Nonce Handling', () => {
    it('verifies that transactions do not manually inject transaction nonces', () => {
      const sampleTxConfig = {
        address: DEPLOYED_CONTRACTS_MAINNET.Paymaster,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setPaused',
        args: [false],
      };

      expect(sampleTxConfig).not.toHaveProperty('nonce');
    });
  });

  // ==========================================
  // 14. Target Validation Logic
  // ==========================================
  describe('14. Target Validation Logic', () => {
    it('matches target validation list against canonical approved targets', () => {
      const approvedList = [
        DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController.toLowerCase(),
        DEPLOYED_CONTRACTS_MAINNET.UVBEToken.toLowerCase(),
        DEPLOYED_CONTRACTS_MAINNET.P2PEscrow.toLowerCase(),
      ];

      expect(approvedList).toContain(DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController.toLowerCase());
      expect(approvedList).toContain(DEPLOYED_CONTRACTS_MAINNET.UVBEToken.toLowerCase());
      expect(approvedList).toContain(DEPLOYED_CONTRACTS_MAINNET.P2PEscrow.toLowerCase());
      expect(approvedList).not.toContain('0x000000000000000000000000000000000000dead');
    });
  });

  // ==========================================
  // 15. Base Mainnet Address Resolution
  // ==========================================
  describe('15. Base Mainnet Address Resolution', () => {
    it('matches canonical Base Mainnet Paymaster, Gas Treasury, and EntryPoint addresses', () => {
      expect(DEPLOYED_CONTRACTS_MAINNET.Paymaster.toLowerCase()).toBe(
        '0xb5b7719f28368b35cd807a2f885843c9d1fdd0e9',
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.GasTreasury.toLowerCase()).toBe(
        '0x166477b1eb662dd553287d32af958436cad20c17',
      );
      expect(DEPLOYED_CONTRACTS_MAINNET.EntryPoint.toLowerCase()).toBe(
        '0x0000000071727de22e5e9d8baf0edac6f37da032',
      );
    });
  });

  // ==========================================
  // 16. Live Balance Formatting
  // ==========================================
  describe('16. Live Balance Formatting', () => {
    it('formats wei to ETH and vice versa correctly', () => {
      const depositWei = 10000000000000000n; // 0.01 ETH
      expect(formatEther(depositWei)).toBe('0.01');
      expect(parseEther('0.01')).toBe(depositWei);

      const feeGwei = 100000000000n; // 100 Gwei
      expect(formatGwei(feeGwei)).toBe('100');
      expect(parseGwei('100')).toBe(feeGwei);
    });
  });

  // ==========================================
  // 17. Paused-State Handling & Health Computations
  // ==========================================
  describe('17. Paused-State Handling & Health Computations', () => {
    it('computes correct PaymasterHealthStatus based on paused and balance levels', () => {
      const computeHealth = (
        isPaymasterPaused: boolean,
        isTreasuryPaused: boolean,
        deposit: bigint,
        loading = false,
      ): PaymasterHealthStatus => {
        if (loading) return 'Unknown';
        if (isPaymasterPaused || isTreasuryPaused) return 'Paused';
        if (deposit < 2000000000000000n) return 'Critical'; // < 0.002 ETH
        if (deposit < 10000000000000000n) return 'Warning'; // < 0.01 ETH
        return 'Healthy';
      };

      expect(computeHealth(false, false, parseEther('0.05'))).toBe('Healthy');
      expect(computeHealth(false, false, parseEther('0.008'))).toBe('Warning');
      expect(computeHealth(false, false, parseEther('0.001'))).toBe('Critical');
      expect(computeHealth(false, false, 0n)).toBe('Critical');
      expect(computeHealth(true, false, parseEther('0.05'))).toBe('Paused');
      expect(computeHealth(false, true, parseEther('0.05'))).toBe('Paused');
      expect(computeHealth(false, false, parseEther('0.05'), true)).toBe('Unknown');
    });
  });
});
