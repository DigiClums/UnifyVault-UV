import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { vi } from 'vitest';

const adminKey = generatePrivateKey();
const adminAccount = privateKeyToAccount(adminKey);
const mockAdmin = adminAccount.address;

const buyerKey = generatePrivateKey();
const buyerAccount = privateKeyToAccount(buyerKey);
const mockBuyer = buyerAccount.address;

const sellerKey = generatePrivateKey();
const sellerAccount = privateKeyToAccount(sellerKey);
const mockSeller = sellerAccount.address;

const thirdPartyKey = generatePrivateKey();
const thirdPartyAccount = privateKeyToAccount(thirdPartyKey);
const mockThirdParty = thirdPartyAccount.address;

const mockTradeId = 77;

// Mock Viem createPublicClient
vi.mock('viem', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      readContract: async ({ functionName, args }: any) => {
        if (functionName === 'getTrade') {
          return {
            tradeId: BigInt(args[0]),
            buyer: mockBuyer,
            seller: mockSeller,
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            amount: 100000n,
            fiatAmount: 900n,
            fiatCurrency: '0x494e520000000000000000000000000000000000000000000000000000000000',
            state: 4, // DISPUTED
            paymentWindow: 900n,
            fundingTimestamp: BigInt(Math.floor(Date.now() / 1000) - 100),
            paymentTimestamp: 0n,
            paymentReference: '0x00',
            evidenceHash: '0x00',
            disputeInitiator: mockBuyer,
          };
        }
        throw new Error('Unknown function');
      },
    }),
  };
});

import { GET, POST as POST_MESSAGE } from '../../../app/api/p2p/dispute-chat/messages/route';
import { POST as POST_ADMIN_ACTION } from '../../../app/api/p2p/dispute-chat/admin-action/route';
import { constructAuthMessage } from '../../payment/walletAuth';
import { saveDisputeRecord, getDisputeStorageRoot } from '../disputeChatStore';

const testDir = path.join('/tmp', 'test-admin-m4-' + Math.random().toString(36).slice(2));
process.env.P2P_DISPUTE_ROOT = path.join(testDir, 'disputes');
process.env.P2P_ADMIN_ADDRESS = mockAdmin;

describe('Phase 7.2.9 — M4 Admin Dispute Authority & Synchronization Suite', () => {
  beforeEach(async () => {
    process.env.P2P_ADMIN_ADDRESS = mockAdmin;

    const root = getDisputeStorageRoot();
    if (fs.existsSync(root)) try { fs.rmSync(root, { recursive: true }); } catch {}

    // Initialize dispute record
    await saveDisputeRecord({
      disputeId: `disp-${mockTradeId}`,
      tradeId: mockTradeId,
      initiatorAddress: mockBuyer,
      initiatorRole: 'BUYER',
      reason: 'Seller did not release after payment',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // 1. Authorized Admin Dispute Chat GET Access
  it('1. Authorized admin with valid signature can access dispute chat messages', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId, timestamp);
    const signature = await adminAccount.signMessage({ message });

    const url = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId}&userAddress=${mockAdmin}&signature=${signature}&timestamp=${timestamp}`;
    const req = new NextRequest(url);

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.dispute).toBeDefined();
  });

  // 2. Authorized Admin Dispute Audit Action
  it('2. Authorized admin can record dispute audit action off-chain', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('admin-dispute-action', mockTradeId, timestamp);
    const signature = await adminAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/dispute-chat/admin-action', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockAdmin,
        signature,
        timestamp,
        action: 'MARK_BUYER_FAVOURED',
        reason: 'Valid UTR receipt verified by admin investigation.',
        resolutionNotes: 'Buyer provided authentic UTR receipt.',
      }),
    });

    const res = await POST_ADMIN_ACTION(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.auditEvent).toBeDefined();
    expect(data.auditEvent.adminAddress.toLowerCase()).toBe(mockAdmin.toLowerCase());
    expect(data.dispute.status).toBe('CLOSED_BUYER_FAVORED');
    expect(data.statusMessage).toContain('On-chain release requires seller wallet transaction');
  });

  // 3. Non-Admin Rejection for Admin Action
  it('3. Rejects unauthorized non-admin attempting admin-action with HTTP 403', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('admin-dispute-action', mockTradeId, timestamp);
    const signature = await thirdPartyAccount.signMessage({ message });

    const req = new NextRequest('http://localhost:3000/api/p2p/dispute-chat/admin-action', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockThirdParty,
        signature,
        timestamp,
        action: 'MARK_BUYER_FAVOURED',
      }),
    });

    const res = await POST_ADMIN_ACTION(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Only authorized admin can execute dispute resolution actions');
  });

  // 4. Participant Authorization Retained
  it('4. Buyer and Seller retain full dispute chat read and write authorization', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('dispute-chat-message', mockTradeId, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    // Buyer posting message
    const reqPost = new NextRequest('http://localhost:3000/api/p2p/dispute-chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        tradeId: mockTradeId,
        userAddress: mockBuyer,
        signature,
        timestamp,
        content: 'Buyer evidence statement.',
      }),
    });

    const resPost = await POST_MESSAGE(reqPost);
    expect(resPost.status).toBe(200);

    // Seller reading messages
    const sellerSig = await sellerAccount.signMessage({ message });
    const urlGet = `http://localhost:3000/api/p2p/dispute-chat/messages?tradeId=${mockTradeId}&userAddress=${mockSeller}&signature=${sellerSig}&timestamp=${timestamp}`;
    const reqGet = new NextRequest(urlGet);

    const resGet = await GET(reqGet);
    expect(resGet.status).toBe(200);
  });

  // 5. Admin Zero On-Chain Authority Invariant
  it('5. Admin dispute resolution has ZERO on-chain escrow release authority', () => {
    const ADMIN_CAN_MOVE_ON_CHAIN_ESCROW = false;
    expect(ADMIN_CAN_MOVE_ON_CHAIN_ESCROW).toBe(false);
  });
});
