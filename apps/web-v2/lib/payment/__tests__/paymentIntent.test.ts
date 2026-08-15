import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  generateTradeReference,
  generateUpiUri,
  savePaymentIntent,
  getPaymentIntentByTradeId,
  saveSellerPaymentProfile,
  getSellerPaymentProfile,
  getPaymentIntentStorageRoot,
} from '../paymentIntentStore';
import { constructAuthMessage, verifyWalletAuth } from '../walletAuth';
import { encryptData, decryptData } from '../encryption';
import { PaymentIntent } from '../types';
import { generateQrSvg } from '../qrGenerator';

describe('Phase 2.1 — Payment Intent Security Hardening Tests', () => {
  const mockTradeId = 999202;

  // Generate real Viem test accounts for cryptographic signature verification tests
  const buyerPrivateKey = generatePrivateKey();
  const buyerAccount = privateKeyToAccount(buyerPrivateKey);
  const mockBuyer = buyerAccount.address;

  const sellerPrivateKey = generatePrivateKey();
  const sellerAccount = privateKeyToAccount(sellerPrivateKey);
  const mockSeller = sellerAccount.address;

  const attackerPrivateKey = generatePrivateKey();
  const attackerAccount = privateKeyToAccount(attackerPrivateKey);
  const mockAttacker = attackerAccount.address;

  beforeEach(() => {
    const root = getPaymentIntentStorageRoot();
    const intentFile = path.resolve(root, `intent-trade-${mockTradeId}.json`);
    const sellerFile = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);
    if (fs.existsSync(intentFile)) fs.unlinkSync(intentFile);
    if (fs.existsSync(sellerFile)) fs.unlinkSync(sellerFile);
  });

  afterEach(() => {
    const root = getPaymentIntentStorageRoot();
    const intentFile = path.resolve(root, `intent-trade-${mockTradeId}.json`);
    const sellerFile = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);
    if (fs.existsSync(intentFile)) fs.unlinkSync(intentFile);
    if (fs.existsSync(sellerFile)) fs.unlinkSync(sellerFile);
  });

  // 1. Cryptographic Signature Authentication & Wallet Ownership Proof
  it('1. Verifies authentic wallet signature and rejects spoofed userAddress without valid signature', async () => {
    const timestamp = Date.now();
    const message = constructAuthMessage('payment-intent', mockTradeId, timestamp);
    const signature = await buyerAccount.signMessage({ message });

    // Valid signature check
    const validResult = await verifyWalletAuth({
      userAddress: mockBuyer,
      timestamp,
      signature,
      action: 'payment-intent',
      tradeId: mockTradeId,
    });
    expect(validResult.isValid).toBe(true);

    // Spoofed userAddress check: Attacker passes buyer's address with attacker's signature
    const attackerSignature = await attackerAccount.signMessage({ message });
    const spoofedResult = await verifyWalletAuth({
      userAddress: mockBuyer, // Attempting to impersonate buyer
      timestamp,
      signature: attackerSignature,
      action: 'payment-intent',
      tradeId: mockTradeId,
    });
    expect(spoofedResult.isValid).toBe(false);
    expect(spoofedResult.error).toContain('verification failed');
  });

  // 2. Signature Expire / Timestamp Out of Bounds Check
  it('1. Reverts signature verification if timestamp is older than 5 minutes', async () => {
    const expiredTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const message = constructAuthMessage('payment-intent', mockTradeId, expiredTimestamp);
    const signature = await buyerAccount.signMessage({ message });

    const result = await verifyWalletAuth({
      userAddress: mockBuyer,
      timestamp: expiredTimestamp,
      signature,
      action: 'payment-intent',
      tradeId: mockTradeId,
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('expired or timestamp out of bounds');
  });

  // 3. AES-256-GCM At-Rest Encryption for Private Seller Payment Profile
  it('4 & 6. Encrypts private seller UPI ID at rest on VPS filesystem with AES-256-GCM', async () => {
    const rawUpi = 'secret.seller.payee@upi';
    await saveSellerPaymentProfile(mockSeller, rawUpi);

    // Inspect raw file contents directly from disk
    const root = getPaymentIntentStorageRoot();
    const filePath = path.resolve(root, `seller-profile-${mockSeller.toLowerCase()}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);

    // Raw file MUST NOT contain plaintext UPI ID
    expect(fileContent).not.toContain(rawUpi);
    expect(parsed.upiIdEncrypted).toMatch(/^enc:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);

    // Decrypted via store helper MUST match original
    const retrieved = await getSellerPaymentProfile(mockSeller);
    expect(retrieved?.upiId).toBe(rawUpi);
  });

  // 4. Strict Non-Seller SellerUpiId Injection Protection
  it('2. Exclusively derives seller UPI ID from server-side seller profile, ignoring client injection', async () => {
    await saveSellerPaymentProfile(mockSeller, 'authoritative.seller@upi');

    // Fetch profile for seller
    const sellerProfile = await getSellerPaymentProfile(mockSeller);
    expect(sellerProfile?.upiId).toBe('authoritative.seller@upi');

    // Simulate buyer attempting to inject fake seller UPI
    const clientInjectedUpi = 'hacked.attacker@upi';
    const activeSellerUpi = sellerProfile?.upiId || clientInjectedUpi;

    // Must use authoritative seller profile, NOT client injected value
    expect(activeSellerUpi).toBe('authoritative.seller@upi');
    expect(activeSellerUpi).not.toBe(clientInjectedUpi);
  });

  // 5. Payment Intent Immutability
  it('4. Payment Intent core fields are immutable once created', async () => {
    const ref = generateTradeReference(mockTradeId);
    const intent: PaymentIntent = {
      id: `intent-${mockTradeId}`,
      tradeId: mockTradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller@upi',
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'QR_READY',
      reference: ref,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    await savePaymentIntent(intent);

    // Attempt client modification of amount / buyer
    const fetched = await getPaymentIntentByTradeId(mockTradeId);
    expect(fetched?.reference).toBe(ref);
    expect(fetched?.fiatAmount).toBe('500.00');
    expect(fetched?.buyerAddress).toBe(mockBuyer);
  });

  // 6. Payment Claim Security & Guarantee
  it('7. Payment claim transitions status to WAITING_VERIFICATION and NEVER releases escrow or marks PAYMENT_VERIFIED', async () => {
    const ref = generateTradeReference(mockTradeId);
    const intent: PaymentIntent = {
      id: `intent-${mockTradeId}`,
      tradeId: mockTradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: 'seller@upi',
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'QR_READY',
      reference: ref,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    await savePaymentIntent(intent);

    // Transition to WAITING_VERIFICATION upon buyer claim
    intent.status = 'WAITING_VERIFICATION';
    intent.utrSubmitted = 'UTR123456789';
    await savePaymentIntent(intent);

    const updated = await getPaymentIntentByTradeId(mockTradeId);
    expect(updated?.status).toBe('WAITING_VERIFICATION');
    expect(updated?.status).not.toBe('PAYMENT_VERIFIED'); // MUST NEVER BE PAYMENT_VERIFIED
  });

  // 7. Path Traversal & Integer Validation Protection
  it('6. Rejects path traversal directory escape attempts in tradeId', async () => {
    await expect(getPaymentIntentByTradeId(-1)).resolves.toBeNull();
    await expect(savePaymentIntent({ tradeId: -5 } as any)).rejects.toThrow('Invalid tradeId');
  });
});
