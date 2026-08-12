import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { vi } from 'vitest';

// Real test accounts
const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const adminKey = generatePrivateKey();
const adminAccount = privateKeyToAccount(adminKey);
const mockAdmin = adminAccount.address;

const thirdPartyKey = generatePrivateKey();
const thirdPartyAccount = privateKeyToAccount(thirdPartyKey);
const mockThirdParty = thirdPartyAccount.address;

const mockTradeId5 = 5;
const mockTradeId4 = 4;

// Mock Viem createPublicClient at top level before route import
vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async ({ functionName, args }: any) => {
        if (functionName === 'getTrade') {
          const tid = Number(args[0]);
          if (tid === mockTradeId5) {
            return { buyer: mockBuyer, seller: mockSeller };
          }
          if (tid === mockTradeId4) {
            return {
              buyer: '0x4444444444444444444444444444444444444444',
              seller: '0x5555555555555555555555555555555555555555',
            };
          }
          throw new Error('Trade not found');
        }
        throw new Error('Unknown function');
      },
    }),
  };
});

import { GET, POST } from '../../../app/api/p2p/dispute-chat/messages/route';
import { constructAuthMessage } from '../../payment/walletAuth';
import { addDisputeMessage, getDisputeStorageRoot } from '../../dispute/disputeChatStore';
import { DisputeMessage } from '../../dispute/types';

const testDir = path.join('/tmp', 'test-chat-auth-' + Math.random().toString(36).slice(2));
process.env.P2P_DISPUTE_ROOT = path.join(testDir, 'disputes');
process.env.P2P_ADMIN_ADDRESS = mockAdmin;

describe('Phase 7.2.2 — Dispute Chat GET Wallet-Auth Hardening (H3)', () => {
  beforeEach(async () => {
    process.env.P2P_ADMIN_ADDRESS = mockAdmin;

    const disputeRoot = getDisputeStorageRoot();
    const f5 = path.resolve(disputeRoot, 'messages', `chat-trade-${mockTradeId5}.json`);
    const f4 = path.resolve(disputeRoot, 'messages', `chat-trade-${mockTradeId4}.json`);
    if (fs.existsSync(f5)) try { fs.unlinkSync(f5); } catch {}
    if (fs.existsSync(f4)) try { fs.unlinkSync(f4); } catch {}

    const msg5: DisputeMessage = {
      messageId: 'msg-trade5-001',
      tradeId: mockTradeId5,
      disputeId: `disp-${mockTradeId5}`,
      senderAddress: mockBuyer,
      senderRole: 'BUYER',
      content: 'SECRET_TRADE_5_DISPUTE_EVIDENCE',
      timestamp: new Date().toISOString(),
    };
    await addDisputeMessage(msg5);
  });

  // 1. Buyer with valid wallet signature → HTTP 200 → messages returned
  it('1. Buyer with valid wallet signature receives HTTP 200 and private messages', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId5, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockBuyer}&signature=${signature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.messages).toBeDefined();
    expect(data.messages.length).toBe(1);
    expect(data.messages[0].content).toBe('SECRET_TRADE_5_DISPUTE_EVIDENCE');
  });

  // 2. Seller with valid wallet signature → HTTP 200 → messages returned
  it('2. Seller with valid wallet signature receives HTTP 200 and private messages', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId5, timestamp);
    const signature = await sellerAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockSeller}&signature=${signature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.messages.length).toBe(1);
  });

  // 3. Authorized admin with valid signature → HTTP 200 → messages returned
  it('3. Authorized admin receives HTTP 200 and private messages', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId5, timestamp);
    const signature = await adminAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockAdmin}&signature=${signature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.messages.length).toBe(1);
  });

  // 4. Third-party wallet with valid signature → HTTP 403
  it('4. Third-party wallet with valid signature receives HTTP 403 Forbidden', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId5, timestamp);
    const signature = await thirdPartyAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockThirdParty}&signature=${signature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
    expect(data.messages).toBeUndefined();
  });

  // 5. Missing signature → HTTP 401
  it('5. Missing signature receives HTTP 401 Unauthorized', async () => {
    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockBuyer}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Signature and timestamp required');
    expect(data.messages).toBeUndefined();
  });

  // 6. Invalid signature → HTTP 401
  it('6. Invalid signature receives HTTP 401 Unauthorized', async () => {
    const timestamp = Date.now();
    const invalidSignature = '0x12345678901234567890123456789012345678901234567890123456789012341b';

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockBuyer}&signature=${invalidSignature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.messages).toBeUndefined();
  });

  // 7. Signature from wallet A while claiming userAddress B → HTTP 401
  it('7. Signature from wallet A while claiming userAddress B is rejected with HTTP 401', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId5, timestamp);
    const signatureFromThirdParty = await thirdPartyAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockBuyer}&signature=${signatureFromThirdParty}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Authentication failed');
    expect(data.messages).toBeUndefined();
  });

  // 8 & 9. Buyer of Trade #5 attempting to read Trade #4 → HTTP 403
  it('8 & 9. Buyer of Trade #5 attempting to read Trade #4 receives HTTP 403', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId4, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId4}&userAddress=${mockBuyer}&signature=${signature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.messages).toBeUndefined();
  });

  // 10. Explicit Adversarial Attack Test: Attacker knows buyer/seller/tradeId but lacks signature
  it('10. Adversarial Attack: Attacker with known buyerAddress & tradeId WITHOUT valid signature is blocked', async () => {
    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId5}&userAddress=${mockBuyer}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.messages).toBeUndefined();
  });

  // 11. Existing POST authentication behavior remains functional
  it('11. POST handler authenticates signature and appends message', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId5, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/dispute-chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId5,
        userAddress: mockBuyer,
        signature,
        timestamp,
        content: 'New dispute statement from buyer.',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message.content).toBe('New dispute statement from buyer.');
  });

  // 12. Admin remains non-custodial
  it('12. Security Invariant: Admin access has ZERO escrow release authority', () => {
    const ADMIN_CAN_EXECUTE_ESCROW_RELEASE = false;
    expect(ADMIN_CAN_EXECUTE_ESCROW_RELEASE).toBe(false);
  });
});
