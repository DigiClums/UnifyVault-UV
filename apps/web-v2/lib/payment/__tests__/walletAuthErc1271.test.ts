import { describe, it, expect, vi } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { hashMessage, PublicClient } from 'viem';
import { constructAuthMessage, verifyWalletAuth, ERC1271_MAGIC_VALUE } from '../walletAuth';

describe('Phase 2A — ERC-1271 Smart Account & EOA Authentication Tests', () => {
  const eoaAccount = privateKeyToAccount(generatePrivateKey());
  const attackerAccount = privateKeyToAccount(generatePrivateKey());
  const mockSmartAccount = '0x2222222222222222222222222222222222222222' as const;

  // 1. EOA authentic signature
  it('authenticates valid EOA cryptographic signature', async () => {
    const timestamp = Date.now();
    const action = 'deposit-intent';
    const tradeId = 101;
    const message = constructAuthMessage(action, tradeId, timestamp);
    const signature = await eoaAccount.signMessage({ message });

    const result = await verifyWalletAuth({
      userAddress: eoaAccount.address,
      timestamp,
      signature,
      action,
      tradeId,
    });

    expect(result.isValid).toBe(true);
    expect(result.isSmartAccount).toBe(false);
  });

  // 2. EOA spoofed signature rejection
  it('rejects spoofed signature where signer address does not match userAddress', async () => {
    const timestamp = Date.now();
    const action = 'deposit-intent';
    const tradeId = 101;
    const message = constructAuthMessage(action, tradeId, timestamp);
    const attackerSignature = await attackerAccount.signMessage({ message });

    const result = await verifyWalletAuth({
      userAddress: eoaAccount.address, // Victim's address claimed
      timestamp,
      signature: attackerSignature, // Attacker's signature provided
      action,
      tradeId,
    });

    expect(result.isValid).toBe(false);
  });

  // 3. Smart Account ERC-1271 Authentic Signature Verification
  it('authenticates valid Smart Account signature returning ERC-1271 magic value 0x1626ba7e', async () => {
    const timestamp = Date.now();
    const action = 'redeem-intent';
    const tradeId = 102;
    const mockSignature =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c';

    // Mock public client that returns standard ERC1271 magic value
    const mockPublicClient = {
      readContract: vi.fn().mockResolvedValue(ERC1271_MAGIC_VALUE),
    } as unknown as PublicClient;

    const result = await verifyWalletAuth(
      {
        userAddress: mockSmartAccount,
        timestamp,
        signature: mockSignature,
        action,
        tradeId,
      },
      { publicClient: mockPublicClient },
    );

    expect(result.isValid).toBe(true);
    expect(result.isSmartAccount).toBe(true);
    expect(mockPublicClient.readContract).toHaveBeenCalledTimes(1);
  });

  // 4. Smart Account ERC-1271 Invalid Signature Rejection
  it('rejects Smart Account signature when contract returns invalid magic value or reverts', async () => {
    const timestamp = Date.now();
    const action = 'redeem-intent';
    const tradeId = 102;
    const mockSignature = '0xdeadbeef';

    // Mock public client returning invalid magic value
    const mockPublicClientInvalid = {
      readContract: vi.fn().mockResolvedValue('0xffffffff'),
    } as unknown as PublicClient;

    const result1 = await verifyWalletAuth(
      {
        userAddress: mockSmartAccount,
        timestamp,
        signature: mockSignature,
        action,
        tradeId,
      },
      { publicClient: mockPublicClientInvalid },
    );

    expect(result1.isValid).toBe(false);

    // Mock public client reverting on contract call
    const mockPublicClientRevert = {
      readContract: vi.fn().mockRejectedValue(new Error('Contract execution reverted')),
    } as unknown as PublicClient;

    const result2 = await verifyWalletAuth(
      {
        userAddress: mockSmartAccount,
        timestamp,
        signature: mockSignature,
        action,
        tradeId,
      },
      { publicClient: mockPublicClientRevert },
    );

    expect(result2.isValid).toBe(false);
  });

  // 5. Expired timestamp rejection
  it('rejects signature when timestamp is expired (> 5 minutes ago)', async () => {
    const expiredTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const message = constructAuthMessage('test', 0, expiredTimestamp);
    const signature = await eoaAccount.signMessage({ message });

    const result = await verifyWalletAuth({
      userAddress: eoaAccount.address,
      timestamp: expiredTimestamp,
      signature,
      action: 'test',
    });

    expect(result.isValid).toBe(false);
    expect(result.error).toContain('expired');
  });

  // 6. Malformed address or signature rejection
  it('rejects invalid address format or missing signature', async () => {
    const validTimestamp = Date.now();

    const invalidAddressResult = await verifyWalletAuth({
      userAddress: 'not-an-eth-address',
      timestamp: validTimestamp,
      signature: '0x1234',
      action: 'test',
    });
    expect(invalidAddressResult.isValid).toBe(false);
    expect(invalidAddressResult.error).toContain('Invalid userAddress');

    const missingSigResult = await verifyWalletAuth({
      userAddress: eoaAccount.address,
      timestamp: validTimestamp,
      signature: '',
      action: 'test',
    });
    expect(missingSigResult.isValid).toBe(false);
    expect(missingSigResult.error).toContain('Missing or invalid cryptographic signature');
  });
});
