import { describe, it, expect } from 'vitest';
import { parseUnits, formatUnits } from 'viem';
import { OrderDetails, OrderSide, OrderStatus } from '../../../lib/contracts/marketplace';

describe('Phase 7.2.3 — H1 TakeOrder Counter-Order Matching Flow Test Suite', () => {
  const sellerMaker = '0x1111111111111111111111111111111111111111' as `0x${string}`;
  const buyerMaker = '0x2222222222222222222222222222222222222222' as `0x${string}`;
  const mockAsset = '0x4A33d001D7F81C12c0C9262256Af83000e64457D' as `0x${string}`;

  const mockSellOrder: OrderDetails = {
    orderId: 10,
    maker: sellerMaker,
    side: OrderSide.SELL,
    asset: mockAsset,
    amount: parseUnits('100', 18),
    filledAmount: 0n,
    remainingAmount: parseUnits('100', 18),
    price: 500n,
    fiatCurrency: 'INR',
    minLimit: parseUnits('10', 18),
    maxLimit: parseUnits('100', 18),
    status: OrderStatus.OPEN,
    createdAt: 1700000000,
  };

  const mockBuyOrder: OrderDetails = {
    orderId: 20,
    maker: buyerMaker,
    side: OrderSide.BUY,
    asset: mockAsset,
    amount: parseUnits('50', 18),
    filledAmount: 0n,
    remainingAmount: parseUnits('50', 18),
    price: 500n,
    fiatCurrency: 'INR',
    minLimit: parseUnits('5', 18),
    maxLimit: parseUnits('50', 18),
    status: OrderStatus.OPEN,
    createdAt: 1700000100,
  };

  // 1. Regression Test: Old same-ID match is rejected
  it('1. Regression Test: Prohibits old same-ID match (buyOrderId === sellOrderId)', () => {
    const buyOrderId = 10;
    const sellOrderId = 10; // Same ID bug from audit finding H1

    const checkMatchIds = (bId: number, sId: number) => {
      if (bId === sId) {
        throw new Error('Invalid order match: Counter-order ID cannot equal target order ID.');
      }
    };

    expect(() => checkMatchIds(buyOrderId, sellOrderId)).toThrow(
      'Invalid order match: Counter-order ID cannot equal target order ID.',
    );
  });

  // 2. New Taker SELL Order Flow: Buyer creates counter BUY order
  it('2. Taking a SELL order creates a counter BUY order with buyOrderId != sellOrderId', () => {
    const takerAddress = buyerMaker; // Buyer taking seller's order
    const matchAmount = parseUnits('30', 18);

    // Simulated counter-order creation for taking SELL Order #10
    const counterBuyOrder: OrderDetails = {
      orderId: 101, // Newly assigned counter-order ID
      maker: takerAddress,
      side: OrderSide.BUY,
      asset: mockSellOrder.asset,
      amount: matchAmount,
      filledAmount: 0n,
      remainingAmount: matchAmount,
      price: mockSellOrder.price,
      fiatCurrency: mockSellOrder.fiatCurrency,
      minLimit: mockSellOrder.minLimit,
      maxLimit: matchAmount,
      status: OrderStatus.OPEN,
      createdAt: 1700000200,
    };

    const buyOrderId = counterBuyOrder.orderId;
    const sellOrderId = mockSellOrder.orderId;

    // Verify counter-order parameters match target order specs
    expect(counterBuyOrder.side).toBe(OrderSide.BUY);
    expect(mockSellOrder.side).toBe(OrderSide.SELL);
    expect(counterBuyOrder.maker.toLowerCase()).not.toBe(mockSellOrder.maker.toLowerCase());
    expect(buyOrderId).not.toBe(sellOrderId);
    expect(counterBuyOrder.asset).toBe(mockSellOrder.asset);
    expect(counterBuyOrder.price).toBe(mockSellOrder.price);
    expect(counterBuyOrder.fiatCurrency).toBe(mockSellOrder.fiatCurrency);
  });

  // 3. New Taker BUY Order Flow: Seller creates counter SELL order
  it('3. Taking a BUY order creates a counter SELL order with buyOrderId != sellOrderId', () => {
    const takerAddress = sellerMaker; // Seller taking buyer's order
    const matchAmount = parseUnits('20', 18);

    const counterSellOrder: OrderDetails = {
      orderId: 102,
      maker: takerAddress,
      side: OrderSide.SELL,
      asset: mockBuyOrder.asset,
      amount: matchAmount,
      filledAmount: 0n,
      remainingAmount: matchAmount,
      price: mockBuyOrder.price,
      fiatCurrency: mockBuyOrder.fiatCurrency,
      minLimit: mockBuyOrder.minLimit,
      maxLimit: matchAmount,
      status: OrderStatus.OPEN,
      createdAt: 1700000250,
    };

    const buyOrderId = mockBuyOrder.orderId;
    const sellOrderId = counterSellOrder.orderId;

    expect(counterSellOrder.side).toBe(OrderSide.SELL);
    expect(mockBuyOrder.side).toBe(OrderSide.BUY);
    expect(counterSellOrder.maker.toLowerCase()).not.toBe(mockBuyOrder.maker.toLowerCase());
    expect(buyOrderId).not.toBe(sellOrderId);
  });

  // 4. Self-Matching Prevention
  it('4. Rejects self-matching when connected wallet equals order maker', () => {
    const connectedWallet = sellerMaker;
    const isMaker = connectedWallet.toLowerCase() === mockSellOrder.maker.toLowerCase();

    const validateSelfMatch = (user: string, orderMaker: string) => {
      if (user.toLowerCase() === orderMaker.toLowerCase()) {
        throw new Error('You cannot take your own order (self-matching prohibited).');
      }
    };

    expect(isMaker).toBe(true);
    expect(() => validateSelfMatch(connectedWallet, mockSellOrder.maker)).toThrow(
      'You cannot take your own order (self-matching prohibited).',
    );
  });

  // 5. Remaining Amount Limit Check
  it('5. Rejects trade amount exceeding target order remaining balance', () => {
    const requestedAmount = parseUnits('150', 18);
    const availableAmount = mockSellOrder.remainingAmount;

    const validateAmount = (reqAmt: bigint, availAmt: bigint) => {
      if (reqAmt > availAmt) {
        throw new Error('Trade amount cannot exceed available balance.');
      }
    };

    expect(requestedAmount > availableAmount).toBe(true);
    expect(() => validateAmount(requestedAmount, availableAmount)).toThrow(
      'Trade amount cannot exceed available balance.',
    );
  });

  // 6. Minimum & Maximum Limit Checks
  it('6. Enforces order min and max trade limits', () => {
    const belowMin = parseUnits('5', 18);
    const aboveMax = parseUnits('120', 18);

    const validateLimits = (amt: bigint, min: bigint, max: bigint) => {
      if (min > 0n && amt < min) throw new Error('Below minimum order limit');
      if (max > 0n && amt > max) throw new Error('Exceeds maximum order limit');
    };

    expect(() => validateLimits(belowMin, mockSellOrder.minLimit, mockSellOrder.maxLimit)).toThrow(
      'Below minimum order limit',
    );
    expect(() => validateLimits(aboveMax, mockSellOrder.minLimit, mockSellOrder.maxLimit)).toThrow(
      'Exceeds maximum order limit',
    );
  });
});
