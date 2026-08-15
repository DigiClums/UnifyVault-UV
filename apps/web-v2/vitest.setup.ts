import { generatePrivateKey } from 'viem/accounts';

// Explicit test-only environment fixtures for Vitest test suite.
// These are test-only mock values and must never be restored as hardcoded fallbacks in production source files.
if (!process.env.VERIFIER_SIGNER_PRIVATE_KEY) {
  process.env.VERIFIER_SIGNER_PRIVATE_KEY = generatePrivateKey();
}
if (!process.env.BANK_WEBHOOK_SECRET) {
  process.env.BANK_WEBHOOK_SECRET = 'test-fixture-bank-webhook-secret-32b!!';
}
if (!process.env.PAYMENT_DATA_ENCRYPTION_KEY) {
  process.env.PAYMENT_DATA_ENCRYPTION_KEY = 'test-fixture-p2p-payment-encryption-key-32b!';
}
