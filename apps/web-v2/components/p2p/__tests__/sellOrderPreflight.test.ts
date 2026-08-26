import { describe, it, expect } from 'vitest';
import { parseUnits, formatUnits } from 'viem';
import {
  computeSellOrderPreflight,
  ETH_GAS_RESERVE,
  NATIVE_ETH_ADDRESS,
} from '../../../lib/p2p/sellOrderPreflight';
import { CANONICAL_UVBE_ADDRESS } from '../../../lib/p2p/assetValidation';

describe('Phase 1 — Sell UVBE Pre-Flight & Hardening Tests', () => {
  const mockUserAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
  const mockUVBE = CANONICAL_UVBE_ADDRESS as `0x${string}`; // Canonical UVBE
  const mockUSDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;
  const targetChainId = 8453; // Base Mainnet

  // 1. Sufficient balance test
  it('1. Allows order creation when requested sell amount is less than available UVBE balance', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '50',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('100', 18),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isInsufficientBalance).toBe(false);
    expect(res.requestedAmountBigInt).toBe(parseUnits('50', 18));
    expect(res.availableBalanceBigInt).toBe(parseUnits('100', 18));
    expect(res.remainingBalanceBigInt).toBe(parseUnits('50', 18));
    expect(res.canSubmitSellOrder).toBe(true);
    expect(res.errorMessage).toBeNull();
  });

  // 2. Exact balance test
  it('2. Allows order creation when requested sell amount exactly equals available UVBE balance', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '100',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('100', 18),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isInsufficientBalance).toBe(false);
    expect(res.requestedAmountBigInt).toBe(parseUnits('100', 18));
    expect(res.availableBalanceBigInt).toBe(parseUnits('100', 18));
    expect(res.remainingBalanceBigInt).toBe(0n);
    expect(res.canSubmitSellOrder).toBe(true);
    expect(res.errorMessage).toBeNull();
  });

  // 3. Insufficient balance test
  it('3. Disables order creation and shows error when requested sell amount exceeds UVBE balance', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '150',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('200', 18),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isInsufficientBalance).toBe(true);
    expect(res.canSubmitSellOrder).toBe(false);
    expect(res.errorMessage).toContain('Insufficient balance');
    expect(res.errorMessage).toContain('100');
    expect(res.errorMessage).toContain('150');
  });

  // 4. Zero balance test
  it('4. Handles zero UVBE wallet balance state correctly', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '10',
      rawBalance: 0n,
      rawAllowance: 0n,
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.availableBalanceBigInt).toBe(0n);
    expect(res.remainingBalanceBigInt).toBe(0n);
    expect(res.isInsufficientBalance).toBe(true);
    expect(res.canSubmitSellOrder).toBe(false);
    expect(res.errorMessage).toContain('Insufficient balance');
  });

  // 5. Compares exact BigInt raw units for 18-decimal UVBE
  it('5. Compares exact BigInt raw units for 18-decimal UVBE token', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '50.5',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('100', 18),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.decimals).toBe(18);
    expect(res.symbol).toBe('UVBE');
    expect(res.requestedAmountBigInt).toBe(parseUnits('50.5', 18));
    expect(res.availableBalanceBigInt).toBe(parseUnits('100', 18));
    expect(res.remainingBalanceBigInt).toBe(parseUnits('49.5', 18));
    expect(res.isInsufficientBalance).toBe(false);

    // Insufficient case by 1 wei
    const insufficientRes = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '100.000000000000000001',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('100', 18),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });
    expect(insufficientRes.isInsufficientBalance).toBe(true);
  });

  // 6. Non-UVBE asset rejection
  it('6. Strictly rejects non-UVBE asset in preflight calculation', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUSDC,
      amountStr: '50',
      rawBalance: parseUnits('100', 6),
      rawAllowance: parseUnits('100', 6),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isAssetSupported).toBe(false);
    expect(res.canSubmitSellOrder).toBe(false);
    expect(res.errorMessage).toBe('P2P marketplace exclusively supports UVBE token.');
  });

  // 7. Seller wallet connection test
  it('7. Enforces wallet connection requirement when seller wallet is not connected', () => {
    const disconnectedRes = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '10',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('100', 18),
      userAddress: undefined,
      connectedChainId: targetChainId,
    });

    expect(disconnectedRes.canSubmitSellOrder).toBe(false);
    expect(disconnectedRes.errorMessage).toBe('Please connect your wallet first.');
  });

  // 8. Wrong-network state test
  it('8. Blocks order creation and flags error when connected to wrong network', () => {
    const wrongNetRes = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '10',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('100', 18),
      userAddress: mockUserAddress,
      connectedChainId: 1, // Ethereum Mainnet instead of Base Sepolia 84532
      targetChainId,
    });

    expect(wrongNetRes.isWrongNetwork).toBe(true);
    expect(wrongNetRes.canSubmitSellOrder).toBe(false);
    expect(wrongNetRes.errorMessage).toBe('Wrong network. Please switch to the supported network.');
  });

  // 9. Balance read failure test
  it('9. Blocks order creation when on-chain balance read fails', () => {
    const failRes = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '10',
      rawBalance: null,
      rawAllowance: null,
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
      balanceError: 'RPC Request Timeout',
    });

    expect(failRes.canSubmitSellOrder).toBe(false);
    expect(failRes.errorMessage).toContain('RPC Request Timeout');
  });

  // 10. Insufficient allowance warning test for UVBE
  it('10. Emits a clear warning when ERC20 allowance is less than requested sell amount', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '50',
      rawBalance: parseUnits('100', 18),
      rawAllowance: parseUnits('20', 18), // Allowance 20 < Requested 50
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isInsufficientBalance).toBe(false);
    expect(res.isInsufficientAllowance).toBe(true);
    expect(res.warningMessage).toBe(
      'Token approval will be required before this order can be funded.',
    );
    expect(res.canSubmitSellOrder).toBe(true); // Warning only — does NOT hard block order creation
  });

  // 11. Un-deployed contract test
  it('11. Hard-blocks order creation when asset contract is not deployed on active network', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '50',
      rawBalance: null,
      rawAllowance: null,
      isContractDeployed: false,
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isContractDeployed).toBe(false);
    expect(res.canSubmitSellOrder).toBe(false);
    expect(res.errorMessage).toBe('Selected asset contract is not deployed on the active network.');
  });

  // 12. Contract state read failure test
  it('12. Hard-blocks order creation when token state (decimals) read fails', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUVBE,
      amountStr: '50',
      rawBalance: null,
      rawAllowance: null,
      contractReadError: 'Failed to read token contract state (bytecode/decimals) from chain.',
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.canSubmitSellOrder).toBe(false);
    expect(res.errorMessage).toBe(
      'Failed to read token contract state (bytecode/decimals) from chain.',
    );
  });

  // 13. BUY side invariant test
  it('13. Bypasses balance checks for BUY side orders', () => {
    const resBuy = computeSellOrderPreflight({
      side: 'BUY',
      asset: mockUVBE,
      amountStr: '1000',
      rawBalance: 0n,
      rawAllowance: 0n,
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(resBuy.isInsufficientBalance).toBe(false);
    expect(resBuy.canSubmitSellOrder).toBe(true);
    expect(resBuy.errorMessage).toBeNull();
  });
});
