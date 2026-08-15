import { describe, it, expect } from 'vitest';
import { parseUnits, decodeFunctionData, getAddress } from 'viem';
import { buildGaslessDepositCalls } from '../deposit';
import { buildGaslessRedeemCalls } from '../redeem';
import { buildSmartAccountTransferCall } from '../transfer';
import { ERC20_ABI, APPROVED_SEPOLIA_TARGETS } from '../constants';
import { CONTROLLER_ABI } from '../../contracts/controller';

describe('Phase 2A — UserOperation Builder & Batching Tests', () => {
  const mockReceiver = '0x1111111111111111111111111111111111111111' as const;
  const usdc = getAddress(APPROVED_SEPOLIA_TARGETS.USDC);
  const controller = getAddress(APPROVED_SEPOLIA_TARGETS.CONTROLLER);
  const uvbe = getAddress(APPROVED_SEPOLIA_TARGETS.UVBE);

  // 1. Gasless Deposit Batch Encoding
  it('builds an exact 2-call batch for deposit (USDC.approve + Controller.deposit)', () => {
    const amount = parseUnits('250', 6);
    const minSharesOut = parseUnits('245', 18);

    const calls = buildGaslessDepositCalls({
      amount,
      minSharesOut,
      receiver: mockReceiver,
      usdcAddress: usdc,
      controllerAddress: controller,
    });

    expect(calls.length).toBe(2);

    // Verify Call 1 (Approve)
    expect(calls[0].to).toBe(usdc);
    expect(calls[0].value).toBe(0n);
    const decodedApprove = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data,
    });
    expect(decodedApprove.functionName).toBe('approve');
    expect(getAddress(decodedApprove.args[0] as string)).toBe(controller);
    expect(decodedApprove.args[1]).toBe(amount);

    // Verify Call 2 (Deposit)
    expect(calls[1].to).toBe(controller);
    expect(calls[1].value).toBe(0n);
    const decodedDeposit = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data: calls[1].data,
    });
    expect(decodedDeposit.functionName).toBe('deposit');
    expect(getAddress(decodedDeposit.args[0] as string)).toBe(usdc);
    expect(decodedDeposit.args[1]).toBe(amount);
    expect(decodedDeposit.args[2]).toBe(minSharesOut);
    expect(getAddress(decodedDeposit.args[3] as string)).toBe(mockReceiver);
  });

  // 2. Deposit with invalid amount throws error
  it('throws error when deposit amount is zero or negative', () => {
    expect(() =>
      buildGaslessDepositCalls({
        amount: 0n,
        minSharesOut: 0n,
        receiver: mockReceiver,
      }),
    ).toThrow('Deposit amount must be strictly greater than zero.');
  });

  // 3. Gasless Redeem Encoding
  it('builds a single Controller.redeem call', () => {
    const shares = parseUnits('75', 18);
    const minAssetsOut = parseUnits('74', 6);
    const deadline = 1750000000n;

    const calls = buildGaslessRedeemCalls({
      shares,
      minAssetsOut,
      receiver: mockReceiver,
      deadline,
      usdcAddress: usdc,
      controllerAddress: controller,
    });

    expect(calls.length).toBe(1);
    expect(calls[0].to).toBe(controller);
    expect(calls[0].value).toBe(0n);

    const decoded = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data: calls[0].data,
    });
    expect(decoded.functionName).toBe('redeem');
    expect(getAddress(decoded.args[0] as string)).toBe(usdc);
    expect(decoded.args[1]).toBe(shares);
    expect(decoded.args[2]).toBe(minAssetsOut);
    expect(getAddress(decoded.args[3] as string)).toBe(mockReceiver);
    expect(decoded.args[4]).toBe(deadline);
  });

  // 4. Smart Account Transfer Call Encoding
  it('builds a standard ERC-20 transfer call for UVBE shares', () => {
    const amount = parseUnits('10', 18);

    const call = buildSmartAccountTransferCall({
      recipient: mockReceiver,
      amount,
      tokenAddress: uvbe,
    });

    expect(call.to).toBe(uvbe);
    expect(call.value).toBe(0n);

    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: call.data,
    });
    expect(decoded.functionName).toBe('transfer');
    expect(getAddress(decoded.args[0] as string)).toBe(mockReceiver);
    expect(decoded.args[1]).toBe(amount);
  });
});
