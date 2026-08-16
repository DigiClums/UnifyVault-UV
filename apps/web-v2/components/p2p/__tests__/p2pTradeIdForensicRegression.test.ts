import { describe, it, expect } from 'vitest';
import {
  decodeEventLog,
  encodeEventTopics,
  encodeAbiParameters,
  parseAbiParameters,
  padHex,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import { MARKETPLACE_ABI } from '../../../lib/contracts/marketplace';
import {
  isSaneTradeId,
  isSaneOrderId,
  extractEscrowTradeIdFromReceipt,
} from '../../../hooks/useMarketplace';

describe('P2P Escrow Trade ID Forensic & Regression Test Suite', () => {
  const marketplaceAddress: Address = '0xe908377f96F313a6b7771570ff6Fb414D38F451A';
  const makerAddress: Address = '0xd905920c91853039060246Ed5724AA72B91a96DA';
  const takerAddress: Address = '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da';
  const uvbeAsset: Address = '0x006c5DF13C716E5224b33956651C4356BB90DEc0';

  // Test 1: Maker address topic MUST NOT become trade ID
  it('strictly prohibits maker address topic from becoming trade ID', () => {
    // A 20-byte address formatted as 32-byte topic
    const makerTopic = padHex(makerAddress, { size: 32 });

    // The legacy faulty behavior produced scientific notation 1.2389752236653299e+48
    const legacyParsedNumber = Number(BigInt(makerTopic));
    expect(legacyParsedNumber).toBeCloseTo(1.2389752236653299e48);

    // Hardened sanity check MUST reject it
    expect(isSaneTradeId(legacyParsedNumber)).toBe(false);
    expect(isSaneTradeId(BigInt(makerTopic))).toBe(false);
  });

  // Test 2: EscrowTradeLinked correctly decodes tradeId
  it('accurately decodes EscrowTradeLinked event from canonical Marketplace.sol log', () => {
    const matchId = 18n;
    const tradeId = 27n;
    const buyOrderId = 0n;
    const sellOrderId = 26n;
    const matchAmount = 1000000000000000000n; // 1 UVBE

    const topics = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'EscrowTradeLinked',
      args: {
        matchId,
        tradeId,
        buyOrderId,
      },
    });

    const data = encodeAbiParameters(
      parseAbiParameters(
        'uint256 sellOrderId, address buyer, address seller, address asset, uint256 matchAmount',
      ),
      [sellOrderId, takerAddress, makerAddress, uvbeAsset, matchAmount],
    );

    const decoded = decodeEventLog({
      abi: MARKETPLACE_ABI,
      data,
      topics: topics as [Hex, ...Hex[]],
    });

    expect(decoded.eventName).toBe('EscrowTradeLinked');
    expect(decoded.args.matchId).toBe(18n);
    expect(decoded.args.tradeId).toBe(27n);
    expect(decoded.args.buyOrderId).toBe(0n);
    expect(decoded.args.sellOrderId).toBe(26n);
    expect(decoded.args.buyer.toLowerCase()).toBe(takerAddress.toLowerCase());
    expect(decoded.args.seller.toLowerCase()).toBe(makerAddress.toLowerCase());
    expect(decoded.args.asset.toLowerCase()).toBe(uvbeAsset.toLowerCase());
    expect(decoded.args.matchAmount).toBe(matchAmount);
  });

  // Test 3: Non-indexed parameters are in data, indexed tradeId is in topics[2]
  it('correctly maps indexed topics and data parameters according to Solidity spec', () => {
    const topics = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'EscrowTradeLinked',
      args: {
        matchId: 5n,
        tradeId: 14n,
        buyOrderId: 0n,
      },
    });

    // 4 topics: topic0, matchId, tradeId, buyOrderId
    expect(topics.length).toBe(4);
    expect(BigInt(topics[1]!)).toBe(5n);
    expect(BigInt(topics[2]!)).toBe(14n);
    expect(BigInt(topics[3]!)).toBe(0n);
  });

  // Test 4: Invalid decode does not navigate and is rejected by isSaneTradeId
  it('rejects invalid, negative, zero, float, NaN, and absurd values from trade navigation', () => {
    expect(isSaneTradeId(null)).toBe(false);
    expect(isSaneTradeId(undefined)).toBe(false);
    expect(isSaneTradeId(0)).toBe(false);
    expect(isSaneTradeId(0n)).toBe(false);
    expect(isSaneTradeId(-1)).toBe(false);
    expect(isSaneTradeId(-10n)).toBe(false);
    expect(isSaneTradeId(NaN)).toBe(false);
    expect(isSaneTradeId(1.2389752236653299e48)).toBe(false);
    expect(isSaneTradeId(BigInt('1238975223665329900000000000000000000000000000000'))).toBe(false);
    expect(isSaneTradeId(1_000_000_001n)).toBe(false); // Exceeds realistic trade ID range
    expect(isSaneTradeId(Number.MAX_SAFE_INTEGER + 100)).toBe(false);
  });

  // Test 5: Huge uint256 / address values are never converted blindly with Number()
  it('safely handles 256-bit large values without IEEE-754 precision distortion or acceptance', () => {
    const largeAddressBigInt = BigInt('0xd905920c91853039060246Ed5724AA72B91a96DA');
    expect(isSaneTradeId(largeAddressBigInt)).toBe(false);

    const maxUint256 = 2n ** 256n - 1n;
    expect(isSaneTradeId(maxUint256)).toBe(false);
  });

  // Test 6: Multi-log receipt simulating takeOrder() extracts the correct tradeId without tripping on OrderFilled
  it('extracts correct tradeId from realistic takeOrder receipt containing OrderFilled, OrderMatched, and EscrowTradeLinked', async () => {
    // 1. OrderFilled log (topic[2] is maker address!)
    const orderFilledTopic0 = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'OrderFilled',
    })[0];
    const orderFilledLog = {
      address: marketplaceAddress,
      topics: [
        orderFilledTopic0,
        padHex(toHex(26), { size: 32 }), // orderId = 26
        padHex(makerAddress, { size: 32 }), // maker = 0xd905... (THE BUG VECTOR!)
      ],
      data: padHex(toHex(1000000000000000000n), { size: 32 }),
    };

    // 2. OrderMatched log
    const orderMatchedTopic0 = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'OrderMatched',
    })[0];
    const orderMatchedLog = {
      address: marketplaceAddress,
      topics: [
        orderMatchedTopic0,
        padHex(toHex(18), { size: 32 }), // matchId = 18
        padHex(toHex(0), { size: 32 }), // buyOrderId = 0
        padHex(toHex(26), { size: 32 }), // sellOrderId = 26
      ],
      data: encodeAbiParameters(
        parseAbiParameters(
          'address buyer, address seller, address asset, uint256 matchAmount, uint256 executionPrice, uint256 fiatAmount, bytes32 fiatCurrency, uint256 timestamp',
        ),
        [
          takerAddress,
          makerAddress,
          uvbeAsset,
          1000000000000000000n,
          200n,
          200n,
          padHex('0x494e52', { size: 32 }),
          1723750000n,
        ],
      ),
    };

    // 3. EscrowTradeLinked log
    const escrowTradeLinkedTopic0 = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'EscrowTradeLinked',
    })[0];
    const escrowTradeLinkedLog = {
      address: marketplaceAddress,
      topics: [
        escrowTradeLinkedTopic0,
        padHex(toHex(18), { size: 32 }), // matchId = 18
        padHex(toHex(27), { size: 32 }), // tradeId = 27 (THE CORRECT ESCROW TRADE ID)
        padHex(toHex(0), { size: 32 }), // buyOrderId = 0
      ],
      data: encodeAbiParameters(
        parseAbiParameters(
          'uint256 sellOrderId, address buyer, address seller, address asset, uint256 matchAmount',
        ),
        [26n, takerAddress, makerAddress, uvbeAsset, 1000000000000000000n],
      ),
    };

    const receipt = {
      logs: [orderFilledLog, orderMatchedLog, escrowTradeLinkedLog],
    };

    const mockPublicClient = {
      readContract: async () => ({ escrowTradeId: 27n }),
    };

    const result = await extractEscrowTradeIdFromReceipt({
      publicClient: mockPublicClient,
      receipt,
      marketplaceAddress,
    });

    // MUST return exactly 27, NEVER 1.2389752236653299e+48
    expect(result.escrowTradeId).toBe(27);
    expect(result.matchId).toBe(18n);
    expect(result.escrowTradeId).not.toBeCloseTo(1.2389752236653299e48);
  });

  // Test 7: getMatch(matchId) fallback resolves the correct trade if EscrowTradeLinked is missing
  it('safely resolves escrowTradeId via getMatch(matchId) fallback when only OrderMatched is present', async () => {
    const orderMatchedTopic0 = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'OrderMatched',
    })[0];
    const orderMatchedLog = {
      address: marketplaceAddress,
      topics: [
        orderMatchedTopic0,
        padHex(toHex(18), { size: 32 }), // matchId = 18
        padHex(toHex(0), { size: 32 }),
        padHex(toHex(26), { size: 32 }),
      ],
      data: encodeAbiParameters(
        parseAbiParameters(
          'address buyer, address seller, address asset, uint256 matchAmount, uint256 executionPrice, uint256 fiatAmount, bytes32 fiatCurrency, uint256 timestamp',
        ),
        [
          takerAddress,
          makerAddress,
          uvbeAsset,
          1000000000000000000n,
          200n,
          200n,
          padHex('0x494e52', { size: 32 }),
          1723750000n,
        ],
      ),
    };

    const receipt = {
      logs: [orderMatchedLog],
    };

    const mockPublicClient = {
      readContract: async ({ functionName, args }: any) => {
        if (functionName === 'getMatch' && args[0] === 18n) {
          return {
            matchId: 18n,
            buyOrderId: 0n,
            sellOrderId: 26n,
            buyer: takerAddress,
            seller: makerAddress,
            asset: uvbeAsset,
            matchAmount: 1000000000000000000n,
            executionPrice: 200n,
            fiatAmount: 200n,
            fiatCurrency: padHex('0x494e52', { size: 32 }),
            escrowTradeId: 27n,
            timestamp: 1723750000n,
          };
        }
        throw new Error('Unexpected call');
      },
    };

    const result = await extractEscrowTradeIdFromReceipt({
      publicClient: mockPublicClient,
      receipt,
      marketplaceAddress,
    });

    expect(result.escrowTradeId).toBe(27);
    expect(result.matchId).toBe(18n);
  });

  // Test 8: Valid trade IDs (1, 17, 25, 26, 27) are all recognized as valid
  it('accepts small sequential uint256 trade IDs as valid', () => {
    const validTradeIds = [1, 17, 20, 24, 25, 26, 27, 100, 5000];
    for (const id of validTradeIds) {
      expect(isSaneTradeId(id)).toBe(true);
      expect(isSaneTradeId(BigInt(id))).toBe(true);
      expect(isSaneOrderId(id)).toBe(true);
    }
  });
});
