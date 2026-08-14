import { describe, it, expect } from 'vitest';
import { encodeFunctionData, parseUnits, getAddress } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { validateSponsorshipPolicy } from '../paymasterPolicy';
import { buildGaslessDepositCalls } from '../deposit';
import { buildGaslessRedeemCalls } from '../redeem';
import { ENTRYPOINT_ADDRESS_V07, ERC20_ABI, APPROVED_SEPOLIA_TARGETS } from '../constants';
import { CONTROLLER_ABI } from '../../contracts/controller';

describe('Phase 2A — Paymaster Sponsorship Policy Engine Tests', () => {
  const mockSender = '0x1234567890123456789012345678901234567890' as const;
  const mockReceiver = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const;
  const usdcAddress = getAddress(APPROVED_SEPOLIA_TARGETS.USDC);
  const controllerAddress = getAddress(APPROVED_SEPOLIA_TARGETS.CONTROLLER);

  // 1. Valid Deposit Batch
  it('approves a valid exact USDC approve + Controller deposit batch', () => {
    const amount = parseUnits('100', 6);
    const minSharesOut = parseUnits('99', 18);

    const calls = buildGaslessDepositCalls({
      amount,
      minSharesOut,
      receiver: mockReceiver,
      usdcAddress,
      controllerAddress,
    });

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(true);
    expect(result.operationType).toBe('batch_deposit');
  });

  // 2. Valid Redeem Single Call
  it('approves a valid Controller redeem call', () => {
    const shares = parseUnits('50', 18);
    const minAssetsOut = parseUnits('49', 6);

    const calls = buildGaslessRedeemCalls({
      shares,
      minAssetsOut,
      receiver: mockReceiver,
      usdcAddress,
      controllerAddress,
    });

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(true);
    expect(result.operationType).toBe('redeem');
  });

  // 3. Rejects Non-Sepolia Chain ID
  it('rejects sponsorship request for unauthorized chain ID (Base Mainnet)', () => {
    const calls = buildGaslessDepositCalls({
      amount: parseUnits('100', 6),
      minSharesOut: parseUnits('99', 18),
      receiver: mockReceiver,
      usdcAddress,
      controllerAddress,
    });

    const result = validateSponsorshipPolicy({
      chainId: base.id, // Mainnet forbidden in Phase 2A
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('Unsupported chain ID');
  });

  // 4. Rejects Non-Canonical EntryPoint Address
  it('rejects sponsorship request for unverified or custom EntryPoint', () => {
    const calls = buildGaslessDepositCalls({
      amount: parseUnits('100', 6),
      minSharesOut: parseUnits('99', 18),
      receiver: mockReceiver,
      usdcAddress,
      controllerAddress,
    });

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: '0x1111111111111111111111111111111111111111' as const,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('Invalid EntryPoint');
  });

  // 5. Rejects Native ETH Transfers
  it('strictly rejects any call attempting native ETH value transfers', () => {
    const calls = [
      {
        to: mockReceiver,
        value: parseUnits('1', 18), // Attacker trying to drain ETH
        data: '0x' as const,
      },
    ];

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('Native ETH transfers are strictly prohibited');
  });

  // 6. Rejects Non-Exact Approval (Excessive allowance vulnerability)
  it('rejects deposit batch when approved amount exceeds deposit amount', () => {
    const depositAmount = parseUnits('100', 6);
    const excessiveApproveAmount = parseUnits('1000', 6); // Excessive approval

    const calls = [
      {
        to: usdcAddress,
        value: 0n,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [controllerAddress, excessiveApproveAmount],
        }),
      },
      {
        to: controllerAddress,
        value: 0n,
        data: encodeFunctionData({
          abi: CONTROLLER_ABI,
          functionName: 'deposit',
          args: [usdcAddress, depositAmount, 0n, mockReceiver],
        }),
      },
    ];

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('Exact approval violation');
  });

  // 7. Rejects Unapproved Spender
  it('rejects USDC approval if spender is not UnifyVaultController', () => {
    const amount = parseUnits('100', 6);
    const attackerSpender = '0x6666666666666666666666666666666666666666' as const;

    const calls = [
      {
        to: usdcAddress,
        value: 0n,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [attackerSpender, amount],
        }),
      },
      {
        to: controllerAddress,
        value: 0n,
        data: encodeFunctionData({
          abi: CONTROLLER_ABI,
          functionName: 'deposit',
          args: [usdcAddress, amount, 0n, mockReceiver],
        }),
      },
    ];

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('must be UnifyVaultController');
  });

  // 8. Rejects Arbitrary Contract Calls
  it('rejects arbitrary non-whitelisted target contracts', () => {
    const randomContract = '0x9999999999999999999999999999999999999999' as const;

    const calls = [
      {
        to: randomContract,
        value: 0n,
        data: '0x12345678' as const,
      },
    ];

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('not approved UnifyVaultController contract');
  });

  // 9. Rejects Invalid / Unrecognized Functions
  it('rejects unapproved function selectors on controller target', () => {
    const calls = [
      {
        to: controllerAddress,
        value: 0n,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [mockReceiver, parseUnits('10', 18)],
        }),
      },
    ];

    const result = validateSponsorshipPolicy({
      chainId: baseSepolia.id,
      entryPoint: ENTRYPOINT_ADDRESS_V07,
      sender: mockSender,
      calls,
    });

    expect(result.isApproved).toBe(false);
    expect(result.reason).toContain('Failed to decode');
  });
});
