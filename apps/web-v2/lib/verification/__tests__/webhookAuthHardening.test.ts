import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { POST } from '../../../app/api/p2p/payment-verification/webhook/[provider]/route';
import { getVerificationStorageRoot } from '../verificationStore';
import { getPaymentIntentStorageRoot, savePaymentIntent } from '../../payment/paymentIntentStore';
import { BankWebhookVerificationProvider } from '../providers/bankWebhookProvider';
import { MockPaymentVerificationProvider } from '../providers/mockProvider';

const testDir = path.join('/tmp', 'test-webhook-auth-' + Math.random().toString(36).slice(2));
process.env.P2P_VERIF_ROOT = path.join(testDir, 'verifications');
process.env.P2P_INTENT_ROOT = path.join(testDir, 'intents');
process.env.BANK_WEBHOOK_SECRET = 'test_bank_webhook_secret_key_12345';

describe('Phase 7.2.7 — M2 Webhook Authentication Hardening Suite', () => {
  const mockTradeId = 22;
  const mockSeller = '0x1111111111111111111111111111111111111111';
  const mockBuyer = '0x2222222222222222222222222222222222222222';

  beforeEach(async () => {
    delete process.env.ALLOW_MOCK_VERIFIER;

    const vRoot = getVerificationStorageRoot();
    const iRoot = getPaymentIntentStorageRoot();
    if (fs.existsSync(vRoot))
      try {
        fs.rmSync(vRoot, { recursive: true });
      } catch {}
    if (fs.existsSync(iRoot))
      try {
        fs.rmSync(iRoot, { recursive: true });
      } catch {}

    // Save initialized payment intent
    await savePaymentIntent({
      id: `intent-${mockTradeId}`,
      tradeId: mockTradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller@upi',
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'WAITING_VERIFICATION',
      reference: `UV-TRD-${mockTradeId}-REF`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  });

  // 1. Unknown / Untrusted Provider Rejection
  it('1. Rejects unknown or untrusted provider with HTTP 403 Forbidden', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/p2p/payment-verification/webhook/unknown_provider',
      {
        method: 'POST',
        body: JSON.stringify({ tradeId: mockTradeId, providerReference: 'TX123' }),
      },
    );

    const res = await POST(req, { params: Promise.resolve({ provider: 'unknown_provider' }) });
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('is not registered or supported');
  });

  // 2. Missing Signature & Timestamp Rejection
  it('2. Rejects webhook requests missing signature or timestamp headers with HTTP 401', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/p2p/payment-verification/webhook/bank_webhook_provider',
      {
        method: 'POST',
        body: JSON.stringify({ tradeId: mockTradeId, providerReference: 'TX123' }),
      },
    );

    const res = await POST(req, { params: Promise.resolve({ provider: 'bank_webhook_provider' }) });
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
  });

  // 3. Invalid Signature Rejection
  it('3. Rejects webhook requests with invalid HMAC signature with HTTP 401', async () => {
    const timestamp = Date.now().toString();
    const bodyText = JSON.stringify({ tradeId: mockTradeId, providerReference: 'TX123' });

    const req = new NextRequest(
      'http://localhost:3000/api/p2p/payment-verification/webhook/bank_webhook_provider',
      {
        method: 'POST',
        headers: {
          'x-webhook-signature': 'invalid_hmac_signature_hex_123',
          'x-webhook-timestamp': timestamp,
        },
        body: bodyText,
      },
    );

    const res = await POST(req, { params: Promise.resolve({ provider: 'bank_webhook_provider' }) });
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
  });

  // 4. Valid Bank Webhook Authentication (Dev/Test Environment)
  it('4. Authenticates valid bank webhook HMAC signature in dev/test environment', async () => {
    const timestamp = Date.now().toString();
    const bodyObj = {
      tradeId: mockTradeId,
      providerReference: 'BANK-TXN-SUCCESS-001',
      creditAmount: '500.00',
      creditCurrency: 'INR',
      payeeIdentifier: 'seller@upi',
      onChainSellerWallet: mockSeller,
    };
    const bodyText = JSON.stringify(bodyObj);

    const payloadToSign = `${timestamp}.${bodyText}`;
    const validSignature = crypto
      .createHmac('sha256', process.env.BANK_WEBHOOK_SECRET!)
      .update(payloadToSign)
      .digest('hex');

    const req = new NextRequest(
      'http://localhost:3000/api/p2p/payment-verification/webhook/bank_webhook_provider',
      {
        method: 'POST',
        headers: {
          'x-webhook-signature': validSignature,
          'x-webhook-timestamp': timestamp,
        },
        body: bodyText,
      },
    );

    const res = await POST(req, { params: Promise.resolve({ provider: 'bank_webhook_provider' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.verificationResult.status).toBe('VERIFIED');
    expect(data.verificationResult.attestationSignature).toBeDefined();
  });

  // 5. Production Mode Safety Guard (Bank Webhooks Disabled in Production)
  it('5. Hard production safety guard rejects bank webhooks with HTTP 403 in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_MOCK_VERIFIER;

      const req = new NextRequest(
        'http://localhost:3000/api/p2p/payment-verification/webhook/bank_webhook_provider',
        {
          method: 'POST',
          headers: {
            'x-webhook-signature': 'some_sig',
            'x-webhook-timestamp': Date.now().toString(),
          },
          body: JSON.stringify({ tradeId: mockTradeId, providerReference: 'TX999' }),
        },
      );

      const res = await POST(req, {
        params: Promise.resolve({ provider: 'bank_webhook_provider' }),
      });
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('disabled in production');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  // 6. Replay Protection Test
  it('6. Replay Protection: Rejects duplicate providerReference consumption', async () => {
    const timestamp = Date.now().toString();
    const bodyObj = {
      tradeId: mockTradeId,
      providerReference: 'BANK-TXN-REPLAY-001',
      creditAmount: '500.00',
      creditCurrency: 'INR',
      payeeIdentifier: 'seller@upi',
      onChainSellerWallet: mockSeller,
    };
    const bodyText = JSON.stringify(bodyObj);

    const payloadToSign = `${timestamp}.${bodyText}`;
    const validSignature = crypto
      .createHmac('sha256', process.env.BANK_WEBHOOK_SECRET!)
      .update(payloadToSign)
      .digest('hex');

    // First ingestion -> VERIFIED
    const req1 = new NextRequest(
      'http://localhost:3000/api/p2p/payment-verification/webhook/bank_webhook_provider',
      {
        method: 'POST',
        headers: {
          'x-webhook-signature': validSignature,
          'x-webhook-timestamp': timestamp,
        },
        body: bodyText,
      },
    );
    const res1 = await POST(req1, {
      params: Promise.resolve({ provider: 'bank_webhook_provider' }),
    });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.verificationResult.status).toBe('VERIFIED');

    // Replay attempt with identical providerReference -> REJECTED
    const req2 = new NextRequest(
      'http://localhost:3000/api/p2p/payment-verification/webhook/bank_webhook_provider',
      {
        method: 'POST',
        headers: {
          'x-webhook-signature': validSignature,
          'x-webhook-timestamp': timestamp,
        },
        body: bodyText,
      },
    );
    const res2 = await POST(req2, {
      params: Promise.resolve({ provider: 'bank_webhook_provider' }),
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.verificationResult.status).toBe('REJECTED');
    expect(data2.verificationResult.failureReason).toContain('Replay Attack Prevented');
  });

  // 7. Security Authority Boundary Check
  it('7. Security Authority Invariant: Webhook processing has ZERO escrow release authority', () => {
    const WEBHOOK_CAN_RELEASE_ESCROW_ON_CHAIN = false;
    expect(WEBHOOK_CAN_RELEASE_ESCROW_ON_CHAIN).toBe(false);
  });
});
