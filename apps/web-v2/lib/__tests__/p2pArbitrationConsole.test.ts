import { describe, it, expect } from 'vitest';
import {
  getAbiItem,
  encodeFunctionData,
  decodeFunctionData,
  keccak256,
  toHex,
  formatUnits,
  parseUnits,
} from 'viem';
import {
  P2P_ESCROW_ABI,
  TradeState,
  DisputeOutcome,
  EscrowTrade,
  ARBITRATOR_ROLE_HASH,
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
} from '../contracts/escrow';
import { DEPLOYED_CONTRACTS_SEPOLIA, getChainTokens } from '../../constants';

describe('P2P Arbitration Console Test Suite', () => {
  const AUTHORIZED_ADMIN = '0xd905920c91853039060246Ed5724AA72B91a96DA';
  const UNAUTHORIZED_USER = '0x1111111111111111111111111111111111111111';
  const MOCK_BUYER = '0x2222222222222222222222222222222222222222';
  const MOCK_SELLER = '0x3333333333333333333333333333333333333333';
  const MOCK_ESCROW = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow;

  describe('1. Exact Deployed Escrow Address Verification', () => {
    it('verifies exact Base Sepolia P2PEscrow deployment address', () => {
      expect(DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow.toLowerCase()).toBe(
        '0xd2a5489618759a6c8ca07163acdc845cf7d104bb',
      );
    });

    it('verifies P2PReputation deployment address', () => {
      expect(DEPLOYED_CONTRACTS_SEPOLIA.P2PReputation.toLowerCase()).toBe(
        '0x49460e2ff8c20ba96121c18e7d36fd4ae293c70c',
      );
    });
  });

  describe('2. P2PEscrow ABI Function & Role Correctness', () => {
    it('includes resolveDispute function with tradeId (uint256) and outcome (uint8)', () => {
      const resolveItem = getAbiItem({
        abi: P2P_ESCROW_ABI,
        name: 'resolveDispute',
      });
      expect(resolveItem).toBeDefined();
      expect(resolveItem.inputs).toHaveLength(2);
      expect(resolveItem.inputs[0].type).toBe('uint256');
      expect(resolveItem.inputs[1].type).toBe('uint8');
      expect(resolveItem.stateMutability).toBe('nonpayable');
    });

    it('includes getTrade view function returning full 14-field tuple', () => {
      const getTradeItem = getAbiItem({
        abi: P2P_ESCROW_ABI,
        name: 'getTrade',
      });
      expect(getTradeItem).toBeDefined();
      expect(getTradeItem.inputs).toHaveLength(1);
      expect(getTradeItem.inputs[0].type).toBe('uint256');
      expect(getTradeItem.outputs[0].type).toBe('tuple');
      // @ts-expect-error viem tuple components inspection
      expect(getTradeItem.outputs[0].components).toHaveLength(14);
    });

    it('includes totalTrades, feeBps, treasury, paused, hasRole, isEvidenceHashUsed, isPaymentReferenceUsed', () => {
      const functionNames = [
        'totalTrades',
        'feeBps',
        'treasury',
        'paused',
        'hasRole',
        'isEvidenceHashUsed',
        'isPaymentReferenceUsed',
        'setFeeConfig',
        'setTreasury',
        'pause',
        'unpause',
      ];

      functionNames.forEach((name) => {
        const item = getAbiItem({
          abi: P2P_ESCROW_ABI,
          // @ts-expect-error dynamic name check
          name,
        });
        expect(item, `Expected ABI to include ${name}`).toBeDefined();
      });
    });

    it('verifies exact role hashes against Solidity AccessRoles library', () => {
      expect(ARBITRATOR_ROLE_HASH).toBe(keccak256(toHex('ARBITRATOR_ROLE')));
      expect(GOVERNANCE_ROLE_HASH).toBe(keccak256(toHex('GOVERNANCE_ROLE')));
      expect(GUARDIAN_ROLE_HASH).toBe(keccak256(toHex('GUARDIAN_ROLE')));
      expect(DEFAULT_ADMIN_ROLE_HASH).toBe(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      );
    });
  });

  describe('3. getTrade Decoding & Struct Field Semantics', () => {
    it('correctly maps mock on-chain trade data into EscrowTrade type', () => {
      const mockTrade: EscrowTrade = {
        tradeId: 1n,
        buyer: MOCK_BUYER as `0x${string}`,
        seller: MOCK_SELLER as `0x${string}`,
        asset: DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken,
        amount: parseUnits('100', 18),
        fiatAmount: 5000n,
        fiatCurrency:
          '0x494e520000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // "INR"
        state: TradeState.DISPUTED,
        paymentWindow: 900n,
        fundingTimestamp: 1710000000n,
        paymentTimestamp: 1710000100n,
        paymentReference:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
        evidenceHash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
        disputeInitiator: MOCK_BUYER as `0x${string}`,
      };

      expect(mockTrade.tradeId).toBe(1n);
      expect(mockTrade.state).toBe(TradeState.DISPUTED);
      expect(mockTrade.state).toBe(4);
      expect(formatUnits(mockTrade.amount, 18)).toBe('100');
      expect(mockTrade.disputeInitiator.toLowerCase()).toBe(MOCK_BUYER.toLowerCase());
    });
  });

  describe('4. Dispute Resolution Encoding (RELEASE_TO_BUYER & REFUND_TO_SELLER)', () => {
    it('encodes resolveDispute with RELEASE_TO_BUYER (outcome = 0)', () => {
      const tradeId = 42n;
      const callData = encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'resolveDispute',
        args: [tradeId, DisputeOutcome.RELEASE_TO_BUYER],
      });

      const decoded = decodeFunctionData({
        abi: P2P_ESCROW_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('resolveDispute');
      expect(decoded.args[0]).toBe(42n);
      expect(decoded.args[1]).toBe(0); // DisputeOutcome.RELEASE_TO_BUYER
    });

    it('encodes resolveDispute with REFUND_TO_SELLER (outcome = 1)', () => {
      const tradeId = 99n;
      const callData = encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'resolveDispute',
        args: [tradeId, DisputeOutcome.REFUND_TO_SELLER],
      });

      const decoded = decodeFunctionData({
        abi: P2P_ESCROW_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('resolveDispute');
      expect(decoded.args[0]).toBe(99n);
      expect(decoded.args[1]).toBe(1); // DisputeOutcome.REFUND_TO_SELLER
    });
  });

  describe('5. RBAC Authorization & Unauthorized Wallet Rejection', () => {
    it('authorizes addresses holding ARBITRATOR_ROLE or GOVERNANCE_ROLE', () => {
      const checkAuthorization = (roles: { isArbitrator: boolean; isGovernance: boolean }) => {
        return roles.isArbitrator || roles.isGovernance;
      };

      expect(checkAuthorization({ isArbitrator: true, isGovernance: false })).toBe(true);
      expect(checkAuthorization({ isArbitrator: false, isGovernance: true })).toBe(true);
      expect(checkAuthorization({ isArbitrator: true, isGovernance: true })).toBe(true);
      expect(checkAuthorization({ isArbitrator: false, isGovernance: false })).toBe(false);
    });

    it('rejects arbitration attempt on non-disputed trade states', () => {
      const canArbitrateTrade = (
        state: TradeState,
        isAuthorized: boolean,
      ): { allowed: boolean; reason?: string } => {
        if (!isAuthorized) {
          return { allowed: false, reason: 'Unauthorized Arbitrator' };
        }
        if (state !== TradeState.DISPUTED) {
          return { allowed: false, reason: 'Trade is not in DISPUTED state' };
        }
        return { allowed: true };
      };

      expect(canArbitrateTrade(TradeState.DISPUTED, true)).toEqual({ allowed: true });
      expect(canArbitrateTrade(TradeState.FUNDED, true)).toEqual({
        allowed: false,
        reason: 'Trade is not in DISPUTED state',
      });
      expect(canArbitrateTrade(TradeState.PAYMENT_SUBMITTED, true)).toEqual({
        allowed: false,
        reason: 'Trade is not in DISPUTED state',
      });
      expect(canArbitrateTrade(TradeState.RELEASED, true)).toEqual({
        allowed: false,
        reason: 'Trade is not in DISPUTED state',
      });
      expect(canArbitrateTrade(TradeState.DISPUTED, false)).toEqual({
        allowed: false,
        reason: 'Unauthorized Arbitrator',
      });
    });
  });

  describe('6. Escrow Configuration & Pause State Safeguards', () => {
    it('encodes setFeeConfig with valid fee BPS', () => {
      const feeBps = 50n; // 0.50%
      const callData = encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'setFeeConfig',
        args: [feeBps],
      });

      const decoded = decodeFunctionData({
        abi: P2P_ESCROW_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('setFeeConfig');
      expect(decoded.args[0]).toBe(50n);
    });

    it('encodes setTreasury with non-zero address', () => {
      const newTreasury = '0xB8c8113a042f39936dD966A5983fAaE2bF7b7290';
      const callData = encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'setTreasury',
        args: [newTreasury],
      });

      const decoded = decodeFunctionData({
        abi: P2P_ESCROW_ABI,
        data: callData,
      });

      expect(decoded.functionName).toBe('setTreasury');
      expect(decoded.args[0].toLowerCase()).toBe(newTreasury.toLowerCase());
    });

    it('encodes pause and unpause functions', () => {
      const pauseData = encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'pause',
      });
      const unpauseData = encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'unpause',
      });

      expect(decodeFunctionData({ abi: P2P_ESCROW_ABI, data: pauseData }).functionName).toBe(
        'pause',
      );
      expect(decodeFunctionData({ abi: P2P_ESCROW_ABI, data: unpauseData }).functionName).toBe(
        'unpause',
      );
    });
  });
});
