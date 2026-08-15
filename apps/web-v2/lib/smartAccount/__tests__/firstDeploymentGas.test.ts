import { describe, it, expect } from 'vitest';
import { decodeFunctionData, encodeFunctionData, getAddress, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { PaymasterProvider } from '../providers/paymasterProvider';
import { BundlerProvider } from '../providers/bundlerProvider';
import {
  APPROVED_SEPOLIA_TARGETS,
  ENTRYPOINT_ADDRESS_V07,
  ERC20_ABI,
  FIRST_DEPLOYMENT_VERIFICATION_GAS_LIMIT,
} from '../constants';
import { buildSmartAccountTransferCall } from '../transfer';
import { buildGaslessRedeemCalls } from '../redeem';
import { validateSponsorshipPolicy } from '../paymasterPolicy';
import { CONTROLLER_ABI } from '../../contracts/controller';

describe('First-deployment Smart Account gas — AA13 initCode/OOG regression fix', () => {
  const mockSender = '0x1234567890123456789012345678901234567890' as const;
  const mockReceiver = '0x1111111111111111111111111111111111111111' as const;
  const paymasterAddr = '0x42c6342516714CFd64474bd41Ce360605b9fEA88' as const;

  // Measured on-chain: factory.createAccount(EOA, 0) ≈ 176,769 gas.
  const MEASURED_FACTORY_CREATE_ACCOUNT_GAS = 176769n;

  it('omits hardcoded gas limits for an undeployed Smart Account with initCode', async () => {
    const paymaster = new PaymasterProvider({
      paymasterAddress: paymasterAddr,
      chainId: baseSepolia.id,
    });

    // Counterfactual (undeployed) account: non-empty initCode triggers factory.createAccount.
    const initCode =
      `0x0000000000000000000000000000000000000000${'00'.repeat(64)}` as `0x${string}`;

    const stub = await paymaster.getPaymasterStubData(
      { sender: mockSender, nonce: 0n, initCode, callData: '0x' },
      ENTRYPOINT_ADDRESS_V07,
    );

    // The root cause of AA13: these were hardcoded, short-circuiting
    // eth_estimateUserOperationGas. They must now be undefined so viem estimates.
    expect(stub.verificationGasLimit).toBeUndefined();
    expect(stub.callGasLimit).toBeUndefined();
    expect(stub.preVerificationGas).toBeUndefined();

    // Paymaster stub still intact for estimation.
    expect(stub.paymaster).toBe(paymasterAddr);
    expect(stub.paymasterVerificationGasLimit).toBe(100000n);
    expect(stub.paymasterPostOpGasLimit).toBe(50000n);
  });

  it('omits hardcoded gas limits for an already-deployed Smart Account', async () => {
    const paymaster = new PaymasterProvider({
      paymasterAddress: paymasterAddr,
      chainId: baseSepolia.id,
    });

    // Deployed account: no initCode/factory.
    const stub = await paymaster.getPaymasterStubData(
      { sender: mockSender, nonce: 3n, callData: '0x' },
      ENTRYPOINT_ADDRESS_V07,
    );

    expect(stub.verificationGasLimit).toBeUndefined();
    expect(stub.callGasLimit).toBeUndefined();
    expect(stub.preVerificationGas).toBeUndefined();
    expect(stub.paymaster).toBe(paymasterAddr);
  });

  it('provides a first-deployment verification gas fallback above the measured factory cost', () => {
    // Must cover factory.createAccount alone...
    expect(FIRST_DEPLOYMENT_VERIFICATION_GAS_LIMIT).toBeGreaterThan(
      MEASURED_FACTORY_CREATE_ACCOUNT_GAS,
    );
    // ...with headroom for validateUserOp, paymaster validation, and EntryPoint overhead.
    expect(FIRST_DEPLOYMENT_VERIFICATION_GAS_LIMIT).toBeGreaterThan(
      MEASURED_FACTORY_CREATE_ACCOUNT_GAS * 2n,
    );
  });

  it('BundlerProvider offline fallback returns sufficient verification gas', async () => {
    const bundler = new BundlerProvider({
      rpcUrl: 'http://127.0.0.1:4337',
      chainId: baseSepolia.id,
    });

    const gas = await bundler.estimateUserOperationGas(
      { sender: mockSender, nonce: 0n, initCode: '0x1234', callData: '0x' },
      ENTRYPOINT_ADDRESS_V07,
    );

    expect(gas.verificationGasLimit).toBeGreaterThanOrEqual(
      FIRST_DEPLOYMENT_VERIFICATION_GAS_LIMIT,
    );
    expect(gas.callGasLimit).toBeGreaterThan(0n);
    expect(gas.preVerificationGas).toBeGreaterThan(0n);
  });

  it('preserves the transferGasless path (UVBE.transfer call + policy)', () => {
    const uvbe = getAddress(APPROVED_SEPOLIA_TARGETS.UVBE);
    const amount = parseUnits('74', 18);

    const call = buildSmartAccountTransferCall({
      recipient: mockReceiver,
      amount,
      tokenAddress: uvbe,
    });

    expect(call.to).toBe(uvbe);
    expect(call.value).toBe(0n);

    const decoded = decodeFunctionData({ abi: ERC20_ABI, data: call.data });
    expect(decoded.functionName).toBe('transfer');
    expect(getAddress(decoded.args[0] as string)).toBe(mockReceiver);
    expect(decoded.args[1]).toBe(amount);

    const policy = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls: [call],
    });
    expect(policy.isApproved).toBe(true);
    expect(policy.operationType).toBe('transfer');
  });

  it('preserves the redeemGasless path (Controller.redeem call + policy)', () => {
    const controller = getAddress(APPROVED_SEPOLIA_TARGETS.CONTROLLER);
    const usdc = getAddress(APPROVED_SEPOLIA_TARGETS.USDC);
    const shares = parseUnits('50', 18);
    const minAssetsOut = parseUnits('49', 6);
    const deadline = 1750000000n;

    const calls = buildGaslessRedeemCalls({
      shares,
      minAssetsOut,
      receiver: mockReceiver,
      deadline,
      usdcAddress: usdc,
      controllerAddress: controller,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].to).toBe(controller);
    expect(calls[0].value).toBe(0n);

    const decoded = decodeFunctionData({ abi: CONTROLLER_ABI, data: calls[0].data });
    expect(decoded.functionName).toBe('redeem');
    expect(getAddress(decoded.args[0] as string)).toBe(usdc);
    expect(decoded.args[1]).toBe(shares);
    expect(decoded.args[2]).toBe(minAssetsOut);

    const policy = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });
    expect(policy.isApproved).toBe(true);
    expect(policy.operationType).toBe('redeem');
  });

  it('keeps the paymaster policy unchanged (still rejects arbitrary targets)', () => {
    const call = {
      to: '0x9999999999999999999999999999999999999999' as const,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [mockReceiver, parseUnits('1', 18)],
      }),
    };

    const policy = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls: [call],
    });

    expect(policy.isApproved).toBe(false);
  });
});
