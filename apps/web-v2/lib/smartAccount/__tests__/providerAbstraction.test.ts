import { describe, it, expect, vi } from 'vitest';
import { parseUnits, getAddress, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { BundlerProvider } from '../providers/bundlerProvider';
import { PaymasterProvider } from '../providers/paymasterProvider';
import {
  createAAInfrastructureClient,
  createSimpleAccount,
  getSponsoredSmartAccountClient,
} from '../client';
import { buildGaslessDepositCalls } from '../deposit';
import { buildGaslessRedeemCalls } from '../redeem';
import { ENTRYPOINT_ADDRESS_V07, APPROVED_SEPOLIA_TARGETS } from '../constants';

describe('Phase 2A.5 — Provider Abstraction Architecture Tests', () => {
  const dummyPrivateKey =
    '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d' as const;
  const localAccount = privateKeyToAccount(dummyPrivateKey);
  const mockWallet = createWalletClient({
    account: localAccount,
    chain: baseSepolia,
    transport: http(),
  });

  const mockReceiver = '0x2222222222222222222222222222222222222222' as const;
  const usdc = getAddress(APPROVED_SEPOLIA_TARGETS.USDC);
  const controller = getAddress(APPROVED_SEPOLIA_TARGETS.CONTROLLER);

  // 1. BundlerProvider initialization and gas pricing
  it('initializes BundlerProvider and fetches UserOperation gas fees', async () => {
    const bundler = new BundlerProvider({
      rpcUrl: 'http://127.0.0.1:4337',
      chainId: baseSepolia.id,
    });

    expect(bundler.rpcUrl).toBe('http://127.0.0.1:4337');
    expect(bundler.chainId).toBe(baseSepolia.id);

    const gasPrice = await bundler.getUserOperationGasPrice();
    expect(gasPrice.maxFeePerGas).toBeGreaterThan(0n);
    expect(gasPrice.maxPriorityFeePerGas).toBeGreaterThan(0n);
  });

  // 2. BundlerProvider simulation & fallback for local dev
  it('provides safe fallback responses in offline/local dev environment', async () => {
    const bundler = new BundlerProvider({
      rpcUrl: 'http://127.0.0.1:4337',
      chainId: baseSepolia.id,
    });

    const dummyUserOp = { sender: localAccount.address, nonce: 0n };
    const userOpHash = await bundler.sendUserOperation(dummyUserOp, ENTRYPOINT_ADDRESS_V07);
    expect(userOpHash).toMatch(/^0x[0-9a-fA-F]{64}$/);

    const gasLimits = await bundler.estimateUserOperationGas(dummyUserOp, ENTRYPOINT_ADDRESS_V07);
    expect(gasLimits.callGasLimit).toBeGreaterThan(0n);
    expect(gasLimits.verificationGasLimit).toBeGreaterThan(0n);
    expect(gasLimits.preVerificationGas).toBeGreaterThan(0n);

    const receipt = await bundler.getUserOperationReceipt(userOpHash);
    expect(receipt.success).toBe(true);
    expect(receipt.receipt.transactionHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  // 3. PaymasterProvider client-side policy validation
  it('validates sponsorship policy via PaymasterProvider before calling server', async () => {
    const paymaster = new PaymasterProvider({
      paymasterAddress: '0x1234567890123456789012345678901234567890',
      chainId: baseSepolia.id,
    });

    const validDepositCalls = buildGaslessDepositCalls({
      amount: parseUnits('100', 6),
      minSharesOut: parseUnits('99', 18),
      receiver: mockReceiver,
      usdcAddress: usdc,
      controllerAddress: controller,
    });

    const validResult = await paymaster.validatePolicy({
      sender: localAccount.address,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      calls: validDepositCalls,
    });

    expect(validResult.isApproved).toBe(true);
    expect(validResult.operationType).toBe('batch_deposit');

    // Invalid call (arbitrary target)
    const invalidCalls = [
      {
        to: '0x9999999999999999999999999999999999999999' as const,
        value: 0n,
        data: '0x1234' as const,
      },
    ];

    const invalidResult = await paymaster.validatePolicy({
      sender: localAccount.address,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      calls: invalidCalls,
    });

    expect(invalidResult.isApproved).toBe(false);
  });

  // 4. PaymasterProvider generates ERC-4337 v0.7 stub and paymaster data
  it('generates standard ERC-4337 v0.7 paymasterAndData structure', async () => {
    const paymasterAddr = '0x1111111111111111111111111111111111111111' as const;
    const paymaster = new PaymasterProvider({
      paymasterAddress: paymasterAddr,
      chainId: baseSepolia.id,
    });

    const stub = await paymaster.getPaymasterStubData({ sender: localAccount.address });
    expect(stub.paymaster).toBe(paymasterAddr);
    expect(stub.paymasterAndData).toMatch(/^0x[0-9a-fA-F]+/);
    expect(stub.paymasterVerificationGasLimit).toBe(100000n);
    expect(stub.paymasterPostOpGasLimit).toBe(50000n);

    const data = await paymaster.getPaymasterData({ sender: localAccount.address });
    expect(data.paymaster).toBe(paymasterAddr);
  });

  // 5. createAAInfrastructureClient helper
  it('creates initialized bundler and paymaster providers from config', () => {
    const client = createAAInfrastructureClient({
      chainId: baseSepolia.id,
      bundlerRpcUrl: 'http://127.0.0.1:4337',
    });

    expect(client.bundlerProvider).toBeDefined();
    expect(client.paymasterProvider).toBeDefined();
    expect(client.bundlerProvider.rpcUrl).toBe('http://127.0.0.1:4337');
  });

  // 6. Simple Account deterministic creation without Pimlico
  it('derives Simple Account deterministically without vendor lock-in', async () => {
    const account = await createSimpleAccount({
      owner: localAccount,
    });

    expect(account.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(account.entryPoint.address).toBe(ENTRYPOINT_ADDRESS_V07);
    expect(account.entryPoint.version).toBe('0.7');
  });

  // 7. getSponsoredSmartAccountClient constructs standard client
  it('constructs SmartAccountClient using provider abstraction without Pimlico SDK', async () => {
    const client = await getSponsoredSmartAccountClient({
      owner: localAccount,
      chainId: baseSepolia.id,
      bundlerRpcUrl: 'http://127.0.0.1:4337',
      paymasterAddress: '0x1111111111111111111111111111111111111111',
    });

    expect(client.account).toBeDefined();
    expect(client.account.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(client.paymaster).toBeDefined();
  }, 15000);
});
