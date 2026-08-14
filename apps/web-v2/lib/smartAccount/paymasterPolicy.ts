import { decodeFunctionData, isAddressEqual, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTROLLER_ABI } from '../contracts/controller';
import { ENTRYPOINT_ADDRESS_V07, ERC20_ABI, APPROVED_SEPOLIA_TARGETS } from './constants';
import {
  SmartAccountCall,
  SponsorshipValidationRequest,
  SponsorshipValidationResult,
} from './types';

/**
 * Validates whether a UserOperation's batched or single calls satisfy the strict Phase 2A Paymaster Sponsorship Policy.
 *
 * Rules:
 * 1. Chain must be Base Sepolia (84532).
 * 2. EntryPoint must be canonical ERC-4337 v0.7.
 * 3. Calls must have value == 0 (no ETH draining / transfers).
 * 4. Must be either:
 *    A. Batched Deposit: [USDC.approve(Controller, exactAmount), Controller.deposit(USDC, exactAmount, minShares, receiver)]
 *    B. Redeem: [Controller.redeem(USDC, shares, minAssetsOut, receiver, deadline)]
 * 5. Rejects any arbitrary target, arbitrary token transfer, unapproved spender, or mismatched approval amount.
 */
export function validateSponsorshipPolicy(
  req: SponsorshipValidationRequest,
): SponsorshipValidationResult {
  const { chainId, entryPoint, sender, calls } = req;

  // 1. Chain Validation
  if (chainId !== baseSepolia.id) {
    return {
      isApproved: false,
      reason: `Unsupported chain ID ${chainId}. Paymaster sponsorship is currently restricted to Base Sepolia (${baseSepolia.id}).`,
    };
  }

  // 2. EntryPoint Validation
  if (!entryPoint || !isAddressEqual(entryPoint, ENTRYPOINT_ADDRESS_V07)) {
    return {
      isApproved: false,
      reason: `Invalid EntryPoint address ${entryPoint}. Must match canonical EntryPoint v0.7 (${ENTRYPOINT_ADDRESS_V07}).`,
    };
  }

  // 3. Sender Validation
  if (!sender) {
    return {
      isApproved: false,
      reason: 'Sender address is missing.',
    };
  }

  // 4. Calls array validation
  if (!calls || calls.length === 0) {
    return {
      isApproved: false,
      reason: 'No calls provided in UserOperation.',
    };
  }

  // 5. Zero native value check (Prevent ETH transfers)
  for (const call of calls) {
    if (call.value && call.value > 0n) {
      return {
        isApproved: false,
        reason: 'Native ETH transfers are strictly prohibited from Paymaster sponsorship.',
      };
    }
  }

  // Check Scenario A: Batched Deposit (Call 1 = USDC.approve, Call 2 = Controller.deposit)
  if (calls.length === 2) {
    return validateDepositBatch(calls);
  }

  // Check Scenario B: Single Redeem (Call 1 = Controller.redeem)
  if (calls.length === 1) {
    return validateSingleCall(calls[0]);
  }

  return {
    isApproved: false,
    reason: `Invalid call count (${calls.length}). Only 2-call batched deposit or single redeem operations are permitted.`,
  };
}

/**
 * Validates a 2-call batched deposit (Approve + Deposit)
 */
function validateDepositBatch(calls: SmartAccountCall[]): SponsorshipValidationResult {
  const [approveCall, depositCall] = calls;

  // Target 1 must be USDC on Base Sepolia
  let approveTarget: string;
  let depositTarget: string;
  try {
    approveTarget = getAddress(approveCall.to).toLowerCase();
    depositTarget = getAddress(depositCall.to).toLowerCase();
  } catch {
    return { isApproved: false, reason: 'Invalid target contract address format in batch.' };
  }

  if (approveTarget !== APPROVED_SEPOLIA_TARGETS.USDC) {
    return {
      isApproved: false,
      reason: `Call 1 target (${approveTarget}) is not approved USDC contract (${APPROVED_SEPOLIA_TARGETS.USDC}).`,
    };
  }

  if (depositTarget !== APPROVED_SEPOLIA_TARGETS.CONTROLLER) {
    return {
      isApproved: false,
      reason: `Call 2 target (${depositTarget}) is not approved UnifyVaultController contract (${APPROVED_SEPOLIA_TARGETS.CONTROLLER}).`,
    };
  }

  // Decode Call 1: USDC.approve
  let approvedSpender: string;
  let approvedAmount: bigint;
  try {
    const decodedApprove = decodeFunctionData({
      abi: ERC20_ABI,
      data: approveCall.data,
    });

    if (decodedApprove.functionName !== 'approve') {
      return {
        isApproved: false,
        reason: `Call 1 function (${decodedApprove.functionName}) must be 'approve'.`,
      };
    }

    const [spender, amount] = decodedApprove.args as [string, bigint];
    approvedSpender = getAddress(spender).toLowerCase();
    approvedAmount = amount;
  } catch (err: any) {
    return {
      isApproved: false,
      reason: `Failed to decode Call 1 ERC20 approve: ${err?.message || 'invalid calldata'}`,
    };
  }

  // Ensure spender is UnifyVaultController
  if (approvedSpender !== APPROVED_SEPOLIA_TARGETS.CONTROLLER) {
    return {
      isApproved: false,
      reason: `USDC approve spender (${approvedSpender}) must be UnifyVaultController (${APPROVED_SEPOLIA_TARGETS.CONTROLLER}).`,
    };
  }

  if (approvedAmount <= 0n) {
    return {
      isApproved: false,
      reason: 'Approval amount must be strictly greater than zero.',
    };
  }

  // Decode Call 2: Controller.deposit
  let depositAsset: string;
  let depositAmount: bigint;
  try {
    const decodedDeposit = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data: depositCall.data,
    });

    if (decodedDeposit.functionName !== 'deposit') {
      return {
        isApproved: false,
        reason: `Call 2 function (${decodedDeposit.functionName}) must be 'deposit'.`,
      };
    }

    const [asset, amount] = decodedDeposit.args as [string, bigint, bigint, string];
    depositAsset = getAddress(asset).toLowerCase();
    depositAmount = amount;
  } catch (err: any) {
    return {
      isApproved: false,
      reason: `Failed to decode Call 2 Controller deposit: ${err?.message || 'invalid calldata'}`,
    };
  }

  // Ensure deposit asset is USDC
  if (depositAsset !== APPROVED_SEPOLIA_TARGETS.USDC) {
    return {
      isApproved: false,
      reason: `Controller deposit asset (${depositAsset}) must be USDC (${APPROVED_SEPOLIA_TARGETS.USDC}).`,
    };
  }

  // CRITICAL: Exact approval validation. Approved amount MUST match deposit amount exactly.
  if (approvedAmount !== depositAmount) {
    return {
      isApproved: false,
      reason: `Exact approval violation: approve amount (${approvedAmount.toString()}) does not match deposit amount (${depositAmount.toString()}).`,
    };
  }

  return {
    isApproved: true,
    operationType: 'batch_deposit',
  };
}

/**
 * Validates a single call (Redeem)
 */
function validateSingleCall(call: SmartAccountCall): SponsorshipValidationResult {
  let target: string;
  try {
    target = getAddress(call.to).toLowerCase();
  } catch {
    return { isApproved: false, reason: 'Invalid target contract address format.' };
  }

  if (target !== APPROVED_SEPOLIA_TARGETS.CONTROLLER) {
    return {
      isApproved: false,
      reason: `Call target (${target}) is not approved UnifyVaultController contract.`,
    };
  }

  // Decode Call: Controller.redeem
  try {
    const decoded = decodeFunctionData({
      abi: CONTROLLER_ABI,
      data: call.data,
    });

    if (decoded.functionName !== 'redeem') {
      return {
        isApproved: false,
        reason: `Single call function (${decoded.functionName}) must be 'redeem'.`,
      };
    }

    const [asset, shares] = decoded.args as [string, bigint, bigint, string, bigint];
    const redeemAsset = getAddress(asset).toLowerCase();

    if (redeemAsset !== APPROVED_SEPOLIA_TARGETS.USDC) {
      return {
        isApproved: false,
        reason: `Redeem payout asset (${redeemAsset}) must be USDC (${APPROVED_SEPOLIA_TARGETS.USDC}).`,
      };
    }

    if (shares <= 0n) {
      return {
        isApproved: false,
        reason: 'Redeem share amount must be strictly greater than zero.',
      };
    }

    return {
      isApproved: true,
      operationType: 'redeem',
    };
  } catch (err: any) {
    return {
      isApproved: false,
      reason: `Failed to decode Controller redeem: ${err?.message || 'invalid calldata'}`,
    };
  }
}
