import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  GET as sellerProfileGET,
  POST as sellerProfilePOST,
} from '../../../app/api/p2p/seller-profile/route';
import { saveSellerProfile, getSellerProfileStorageRoot } from '../paymentProfileStore';
import {
  saveSellerPaymentProfile,
  getPaymentIntentStorageRoot,
  savePaymentIntent,
  getPaymentIntentByTradeId,
} from '../paymentIntentStore';
import { PaymentIntent } from '../types';

describe('P2P Seller Profile API Comprehensive Regression Suite', () => {
  const sellerKey = generatePrivateKey();
  const sellerAccount = privateKeyToAccount(sellerKey);
  const mockSeller = sellerAccount.address;

  const buyerKey = generatePrivateKey();
  const buyerAccount = privateKeyToAccount(buyerKey);
  const mockBuyer = buyerAccount.address;

  const cleanupFiles: string[] = [];

  beforeEach(() => {
    const profileRoot = getSellerProfileStorageRoot();
    const intentRoot = getPaymentIntentStorageRoot();

    const pFile = path.resolve(profileRoot, `profile-${mockSeller.toLowerCase()}.json`);
    const sFile = path.resolve(intentRoot, `seller-profile-${mockSeller.toLowerCase()}.json`);

    if (fs.existsSync(pFile)) fs.unlinkSync(pFile);
    if (fs.existsSync(sFile)) fs.unlinkSync(sFile);
  });

  afterEach(() => {
    for (const f of cleanupFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // Ignore cleanup error
        }
      }
    }
  });

  // 1. Valid Seller UPI
  it('1. returns decrypted UPI with 200 OK for valid registered seller', async () => {
    const rawUpi = 'valid.seller@okhdfcbank';
    await saveSellerProfile({
      walletAddress: mockSeller,
      paymentRail: 'UPI',
      upiVpa: rawUpi,
      verificationStatus: 'PENDING_VERIFICATION',
    });

    const req = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockSeller}`,
    );
    const res = await sellerProfileGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile.walletAddress.toLowerCase()).toBe(mockSeller.toLowerCase());
    expect(body.profile.upiVpa).toBe(rawUpi);
    expect(body.profile.upiId).toBe(rawUpi);
    expect(body.profile.paymentRail).toBe('UPI');
  });

  // 2. Missing Seller Profile
  it('2. returns structured 404 for missing seller profile', async () => {
    const unknownAddress = privateKeyToAccount(generatePrivateKey()).address;
    const req = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${unknownAddress}`,
    );
    const res = await sellerProfileGET(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Seller payment profile not found.');
  });

  // 3. Invalid Address
  it('3. returns structured 400 for missing or invalid userAddress', async () => {
    const reqNoParam = new NextRequest('http://localhost:3000/api/p2p/seller-profile');
    const resNoParam = await sellerProfileGET(reqNoParam);
    expect(resNoParam.status).toBe(400);
    const bodyNoParam = await resNoParam.json();
    expect(bodyNoParam.error).toContain('Missing or invalid userAddress parameter');

    const reqInvalid = new NextRequest(
      'http://localhost:3000/api/p2p/seller-profile?userAddress=0xInvalidAddress123',
    );
    const resInvalid = await sellerProfileGET(reqInvalid);
    expect(resInvalid.status).toBe(400);
    const bodyInvalid = await resInvalid.json();
    expect(bodyInvalid.error).toContain('Missing or invalid userAddress parameter');
  });

  // 4. Decrypt Failure
  it('4. returns 500 without silently swallowing on corrupted ciphertext', async () => {
    const corruptedSeller = privateKeyToAccount(generatePrivateKey()).address;
    const root = getSellerProfileStorageRoot();
    const filePath = path.resolve(root, `profile-${corruptedSeller.toLowerCase()}.json`);
    cleanupFiles.push(filePath);

    fs.writeFileSync(
      filePath,
      JSON.stringify({
        walletAddress: corruptedSeller.toLowerCase(),
        paymentRail: 'UPI',
        upiVpa: 'enc:0102030405060708090a0b0c:deadbeefcafebabe:0011223344',
        verificationStatus: 'PENDING_VERIFICATION',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }),
    );

    const req = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${corruptedSeller}`,
    );
    const res = await sellerProfileGET(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  // 5. Storage / No UPI Deterministic 404
  it('5. returns deterministic 404 when profile exists but has empty or whitespace UPI', async () => {
    const emptyUpiSeller = privateKeyToAccount(generatePrivateKey()).address;
    const root = getSellerProfileStorageRoot();
    const filePath = path.resolve(root, `profile-${emptyUpiSeller.toLowerCase()}.json`);
    cleanupFiles.push(filePath);

    fs.writeFileSync(
      filePath,
      JSON.stringify({
        walletAddress: emptyUpiSeller.toLowerCase(),
        paymentRail: 'UPI',
        upiVpa: '   ',
        verificationStatus: 'PENDING_VERIFICATION',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      }),
    );

    const req = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${emptyUpiSeller}`,
    );
    const res = await sellerProfileGET(req);
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Seller payment details unavailable: No valid UPI ID registered.');
  });

  // 6. Buyer / Seller Separation
  it('6. strictly separates buyer and seller profiles and never returns buyer UPI for seller', async () => {
    const sellerUpi = 'merchant.seller@okaxis';
    const buyerUpi = 'personal.buyer@okaxis';

    // Save seller profile
    await saveSellerProfile({
      walletAddress: mockSeller,
      paymentRail: 'UPI',
      upiVpa: sellerUpi,
      verificationStatus: 'PENDING_VERIFICATION',
    });

    // Save buyer profile
    await saveSellerProfile({
      walletAddress: mockBuyer,
      paymentRail: 'UPI',
      upiVpa: buyerUpi,
      verificationStatus: 'PENDING_VERIFICATION',
    });

    // Request seller profile
    const reqSeller = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockSeller}`,
    );
    const resSeller = await sellerProfileGET(reqSeller);
    const bodySeller = await resSeller.json();

    expect(resSeller.status).toBe(200);
    expect(bodySeller.profile.upiVpa).toBe(sellerUpi);
    expect(bodySeller.profile.upiVpa).not.toBe(buyerUpi);

    // Request buyer profile
    const reqBuyer = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockBuyer}`,
    );
    const resBuyer = await sellerProfileGET(reqBuyer);
    const bodyBuyer = await resBuyer.json();

    expect(resBuyer.status).toBe(200);
    expect(bodyBuyer.profile.upiVpa).toBe(buyerUpi);
    expect(bodyBuyer.profile.upiVpa).not.toBe(sellerUpi);
  });

  // 7. Historical Snapshot Immutability
  it('7. preserves historical PaymentIntent sellerPaymentIdentifier snapshot immutability', async () => {
    const tradeId = 88219;
    const initialSellerUpi = 'trade88219.original@okaxis';

    // Create payment intent snapshot bound to trade
    const initialIntent: PaymentIntent = {
      id: `intent-${tradeId}`,
      tradeId,
      buyerAddress: mockBuyer,
      sellerAddress: mockSeller,
      sellerPaymentIdentifier: initialSellerUpi,
      fiatAmount: '500.00',
      fiatCurrency: 'INR',
      status: 'QR_READY',
      reference: 'UV-TRD-88219-91A2',
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await savePaymentIntent(initialIntent);

    // Seller updates profile later
    const updatedSellerUpi = 'new.profile.upi@okhdfcbank';
    await saveSellerPaymentProfile(mockSeller, updatedSellerUpi);
    await saveSellerProfile({
      walletAddress: mockSeller,
      paymentRail: 'UPI',
      upiVpa: updatedSellerUpi,
      verificationStatus: 'PENDING_VERIFICATION',
    });

    // Trade intent retrieved from storage must still be the historical snapshot
    const retrievedIntent = await getPaymentIntentByTradeId(tradeId);
    expect(retrievedIntent?.sellerPaymentIdentifier).toBe(initialSellerUpi);
    expect(retrievedIntent?.sellerPaymentIdentifier).not.toBe(updatedSellerUpi);

    // GET /api/p2p/seller-profile reflects the seller's active profile
    const req = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${mockSeller}`,
    );
    const res = await sellerProfileGET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.profile.upiVpa).toBe(updatedSellerUpi);
  });

  // 8. End-to-end POST save -> GET retrieve cycle with AES-256-GCM verification
  it('8. executes full POST save and GET retrieve cycle with AES-256-GCM encrypted storage', async () => {
    const freshSellerKey = generatePrivateKey();
    const freshSeller = privateKeyToAccount(freshSellerKey).address;
    const upi = 'fresh.merchant@okicici';

    const postReq = new NextRequest('http://localhost:3000/api/p2p/seller-profile', {
      method: 'POST',
      body: JSON.stringify({
        userAddress: freshSeller,
        upiVpa: upi,
        paymentRail: 'UPI',
      }),
    });

    const postRes = await sellerProfilePOST(postReq);
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.success).toBe(true);

    // Verify on-disk file is AES-256-GCM encrypted
    const root = getSellerProfileStorageRoot();
    const filePath = path.resolve(root, `profile-${freshSeller.toLowerCase()}.json`);
    cleanupFiles.push(filePath);

    expect(fs.existsSync(filePath)).toBe(true);
    const rawDiskContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(rawDiskContent.upiVpa).toMatch(/^enc:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    expect(rawDiskContent.upiVpa).not.toBe(upi);

    // Verify GET endpoint decrypts it correctly
    const getReq = new NextRequest(
      `http://localhost:3000/api/p2p/seller-profile?userAddress=${freshSeller}`,
    );
    const getRes = await sellerProfileGET(getReq);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.profile.upiVpa).toBe(upi);
    expect(getBody.profile.upiId).toBe(upi);
  });
});
