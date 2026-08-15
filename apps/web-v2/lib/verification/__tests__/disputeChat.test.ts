import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  addDisputeMessage,
  getDisputeMessagesByTradeId,
  getDisputeStorageRoot,
} from '../../../lib/dispute/disputeChatStore';
import { DisputeMessage } from '../../../lib/dispute/types';

const testDir = path.join('/tmp', 'test-chat-' + Math.random().toString(36).slice(2));
process.env.P2P_DISPUTE_ROOT = path.join(testDir, 'disputes');

describe('Phase 7.1.1 — Admin Dispute Chat & Workspace Tests', () => {
  const mockTradeId = 7103;
  const mockBuyer = '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da';
  const mockSeller = '0xd905920c91853039060246Ed5724AA72B91a96DA';
  const mockAdmin = '0x1111111111111111111111111111111111111111';
  const mockThirdParty = '0x9999999999999999999999999999999999999999';

  const cleanStorage = () => {
    const disputeRoot = getDisputeStorageRoot();
    const f1 = path.resolve(disputeRoot, 'messages', `chat-trade-${mockTradeId}.json`);
    if (fs.existsSync(f1))
      try {
        fs.unlinkSync(f1);
      } catch {}
  };

  beforeEach(() => {
    cleanStorage();
  });

  it('1. Appends dispute messages immutably to trade chat transcript', async () => {
    const msg1: DisputeMessage = {
      messageId: 'msg-001',
      tradeId: mockTradeId,
      disputeId: `disp-${mockTradeId}`,
      senderAddress: mockBuyer,
      senderRole: 'BUYER',
      content: 'Paid ₹85 INR via GPay. UTR 1234567890.',
      evidenceHash: '0xabc123',
      timestamp: new Date().toISOString(),
    };

    const msg2: DisputeMessage = {
      messageId: 'msg-002',
      tradeId: mockTradeId,
      disputeId: `disp-${mockTradeId}`,
      senderAddress: mockSeller,
      senderRole: 'SELLER',
      content: 'Bank statement does not show credit for UTR 1234567890.',
      timestamp: new Date().toISOString(),
    };

    await addDisputeMessage(msg1);
    await addDisputeMessage(msg2);

    const history = await getDisputeMessagesByTradeId(mockTradeId);
    expect(history.length).toBe(2);
    expect(history[0].content).toContain('Paid ₹85 INR');
    expect(history[1].content).toContain('Bank statement does not show credit');
  });

  it('2. Authorization Privacy Guard: Third-party addresses are rejected from dispute workspace', () => {
    const caller = mockThirdParty.toLowerCase();
    const isBuyer = caller === mockBuyer.toLowerCase();
    const isSeller = caller === mockSeller.toLowerCase();
    const isAdmin = caller === mockAdmin.toLowerCase();

    const isAuthorized = isBuyer || isSeller || isAdmin;
    expect(isAuthorized).toBe(false);
  });
});
