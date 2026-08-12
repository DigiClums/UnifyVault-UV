import { describe, it, expect } from 'vitest';
import { parseUnits, formatUnits } from 'viem';
import {
  computeSellOrderPreflight,
  ETH_GAS_RESERVE,
  NATIVE_ETH_ADDRESS,
} from '../../../lib/p2p/sellOrderPreflight';

describe('Phase 7.1.4 — Sell Order Hardening & Pre-Flight Tests', () => {
  const mockUserAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
  const mockUSDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e' as `0x${string}`; // 6 decimals
  const mockcbBTC = '0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29' as `0x${string}`; // 8 decimals
  const mockWETH = '0xd116ab1c943cf15904ec4c8dd701086f175fa323' as `0x${string}`; // 18 decimals
  const mockUVBE = '0x4A33d001D7F81C12c0C9262256Af83000e64457D' as `0x${string}`; // 18 decimals
  const targetChainId = 84532; // Base Sepolia

  // 1. Sufficient balance test
  it('1. Allows order creation when requested sell amount is less than available balance (sufficient balance)', () => {
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
  it('2. Allows order creation when requested sell amount exactly equals available balance (exact balance)', () => {
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
  it('3. Disables order creation and shows error when requested sell amount exceeds balance (insufficient balance)', () => {
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
  it('4. Handles zero wallet balance state correctly', () => {
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

  // 5. 6-decimal USDC test
  it('5. Compares exact BigInt raw units for 6-decimal USDC token', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUSDC,
      amountStr: '50.5',
      rawBalance: parseUnits('100', 6), // 100_000_000n
      rawAllowance: parseUnits('100', 6),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.decimals).toBe(6);
    expect(res.symbol).toBe('USDC');
    expect(res.requestedAmountBigInt).toBe(50_500_000n);
    expect(res.availableBalanceBigInt).toBe(100_000_000n);
    expect(res.remainingBalanceBigInt).toBe(49_500_000n);
    expect(res.isInsufficientBalance).toBe(false);

    // Insufficient case by 1 micro-USDC (0.000001)
    const insufficientRes = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUSDC,
      amountStr: '100.000001',
      rawBalance: parseUnits('100', 6),
      rawAllowance: parseUnits('100', 6),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });
    expect(insufficientRes.isInsufficientBalance).toBe(true);
  });

  // 6. 8-decimal cbBTC test
  it('6. Compares exact BigInt raw units for 8-decimal cbBTC token', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockcbBTC,
      amountStr: '0.5',
      rawBalance: parseUnits('1.25', 8), // 125_000_000 satoshis
      rawAllowance: parseUnits('2.0', 8),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.decimals).toBe(8);
    expect(res.symbol).toBe('cbBTC');
    expect(res.requestedAmountBigInt).toBe(50_000_000n);
    expect(res.availableBalanceBigInt).toBe(125_000_000n);
    expect(res.remainingBalanceBigInt).toBe(75_000_000n);
    expect(res.isInsufficientBalance).toBe(false);
  });

  // 7. 18-decimal UVBE/WETH test
  it('7. Compares exact BigInt raw units for 18-decimal UVBE and WETH tokens', () => {
    const resWeth = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockWETH,
      amountStr: '0.999999999999999999',
      rawBalance: parseUnits('1', 18),
      rawAllowance: parseUnits('1', 18),
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(resWeth.decimals).toBe(18);
    expect(resWeth.symbol).toBe('WETH');
    expect(resWeth.isInsufficientBalance).toBe(false);
    expect(resWeth.remainingBalanceBigInt).toBe(1n); // 1 wei remaining!
  });

  // 8. Seller wallet change test
  it('8. Enforces wallet connection requirement when seller wallet changes or disconnects', () => {
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

  // 9. Wrong-network state test
  it('9. Blocks order creation and flags error when connected to wrong network', () => {
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

  // 10. Balance read failure test
  it('10. Blocks order creation when on-chain balance read fails', () => {
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

  // 11. Native ETH test
  it('11. Account for 0.001 ETH gas reserve when asset is Native ETH', () => {
    const ethBalance = parseUnits('1.0', 18); // 1 ETH
    const ethAsset = NATIVE_ETH_ADDRESS as `0x${string}`;

    const resSufficient = computeSellOrderPreflight({
      side: 'SELL',
      asset: ethAsset,
      amountStr: '0.999', // 0.999 ETH requested + 0.001 ETH reserve = 1.0 ETH total
      rawBalance: ethBalance,
      rawAllowance: null,
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(resSufficient.isNative).toBe(true);
    expect(resSufficient.availableBalanceBigInt).toBe(parseUnits('0.999', 18));
    expect(resSufficient.isInsufficientBalance).toBe(false);
    expect(resSufficient.canSubmitSellOrder).toBe(true);

    // Requesting 1.0 ETH when balance is 1.0 ETH -> triggers insufficient balance due to gas reserve
    const resOver = computeSellOrderPreflight({
      side: 'SELL',
      asset: ethAsset,
      amountStr: '1.0',
      rawBalance: ethBalance,
      rawAllowance: null,
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(resOver.isInsufficientBalance).toBe(true);
    expect(resOver.canSubmitSellOrder).toBe(false);
  });

  // 12. Insufficient allowance warning test
  it('12. Emits a clear warning when ERC20 allowance is less than requested sell amount', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUSDC,
      amountStr: '50',
      rawBalance: parseUnits('100', 6),
      rawAllowance: parseUnits('20', 6), // Allowance 20 < Requested 50
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.isInsufficientBalance).toBe(false);
    expect(res.isInsufficientAllowance).toBe(true);
    expect(res.warningMessage).toBe('Token approval will be required before this order can be funded.');
    expect(res.canSubmitSellOrder).toBe(true); // Warning only — does NOT hard block order creation
  });

  // 13. Un-deployed contract test
  it('13. Hard-blocks order creation when asset contract is not deployed on active network', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUSDC,
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

  // 14. Contract state read failure test
  it('14. Hard-blocks order creation when token state (decimals) read fails', () => {
    const res = computeSellOrderPreflight({
      side: 'SELL',
      asset: mockUSDC,
      amountStr: '50',
      rawBalance: null,
      rawAllowance: null,
      contractReadError: 'Failed to read token contract state (bytecode/decimals) from chain.',
      userAddress: mockUserAddress,
      connectedChainId: targetChainId,
    });

    expect(res.canSubmitSellOrder).toBe(false);
    expect(res.errorMessage).toBe('Failed to read token contract state (bytecode/decimals) from chain.');
  });

  // 15. BUY side invariant test
  it('15. Bypasses balance checks for BUY side orders', () => {
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
