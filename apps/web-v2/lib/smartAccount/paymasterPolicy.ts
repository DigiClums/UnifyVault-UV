import { decodeFunctionData, isAddressEqual, getAddress, isAddress, Hex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTROLLER_ABI } from '../contracts/controller';
import {
  ENTRYPOINT_ADDRESS_V07,
  ERC20_ABI,
  P2P_ESCROW_ABI,
  APPROVED_SEPOLIA_TARGETS,
} from './constants';
import {
  SmartAccountCall,
  SponsorshipValidationRequest,
  SponsorshipValidationResult,
} from './types';

/**
 * Validates whether a UserOperation's batched or single calls satisfy the strict Phase 2B Paymaster Sponsorship Policy.
 *
 * Rules:
 * 1. Chain must be Base Sepolia (84532).
 * 2. EntryPoint must be canonical ERC-4337 v0.7.
 * 3. Calls must have value == 0 (no ETH draining / transfers).
 * 4. Must be one of the explicitly whitelisted operations:
 *    A. Batched Deposit: [USDC.approve(Controller, exactAmount), Controller.deposit(USDC, exactAmount, minShares, receiver)]
 *    B. Batched P2P Fund: [UVBE.approve(P2PEscrow, exactAmount), P2PEscrow.fundTrade(tradeId)]
 *    C. Single Redeem: [Controller.redeem(USDC, shares, minAssetsOut, receiver, deadline)]
 *    D. Single UVBE Transfer: [UVBE.transfer(recipient, amount)]
 *    E. Single P2PEscrow User Actions:
 *       - P2PEscrow.createTrade(...)
 *       - P2PEscrow.fundTrade(...)
 *       - P2PEscrow.submitPayment(...)
 *       - P2PEscrow.confirmAndRelease(...)
 *       - P2PEscrow.refund(...)
 *       - P2PEscrow.cancelUnfundedTrade(...)
 *       - P2PEscrow.raiseDispute(...)
 * 5. Rejects any arbitrary target, arbitrary selector, admin/arbitrator function (e.g. resolveDispute),
 *    unapproved spender, native ETH value, or mismatched approval amount.
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

  // Check Scenario A: 2-Call Batches (Batched Deposit or Batched P2P Fund)
  if (calls.length === 2) {
    return validateTwoCallBatch(calls);
  }

  // Check Scenario B: Single Operations
  if (calls.length === 1) {
    return validateSingleCall(calls[0]);
  }

  return {
    isApproved: false,
    reason: `Invalid call count (${calls.length}). Only 2-call batches or single authorized operations are permitted.`,
  };
}

/**
 * Validates a 2-call batch: either Deposit Batch or P2P Fund Batch
 */
function validateTwoCallBatch(calls: SmartAccountCall[]): SponsorshipValidationResult {
  const [call0, call1] = calls;

  let target0: string;
  let target1: string;
  try {
    target0 = getAddress(call0.to).toLowerCase();
    target1 = getAddress(call1.to).toLowerCase();
  } catch {
    return { isApproved: false, reason: 'Invalid target contract address format in batch.' };
  }

  // Batch Case 1: Deposit Batch [USDC.approve, Controller.deposit]
  if (
    target0 === APPROVED_SEPOLIA_TARGETS.USDC &&
    target1 === APPROVED_SEPOLIA_TARGETS.CONTROLLER
  ) {
    return validateDepositBatch(calls);
  }

  // Batch Case 2: P2P Fund Batch [Token.approve, P2PEscrow.fundTrade]
  if (
    (target0 === APPROVED_SEPOLIA_TARGETS.UVBE || target0 === APPROVED_SEPOLIA_TARGETS.USDC) &&
    target1 === APPROVED_SEPOLIA_TARGETS.P2P_ESCROW
  ) {
    return validateP2PFundBatch(calls);
  }

  return {
    isApproved: false,
    reason: `Invalid batch targets: Call 1 (${target0}), Call 2 (${target1}). Expected approved deposit or P2P fund batch.`,
  };
}

/**
 * Validates a 2-call batched deposit (Approve + Deposit)
 */
function validateDepositBatch(calls: SmartAccountCall[]): SponsorshipValidationResult {
  const [approveCall, depositCall] = calls;

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

  if (approvedSpender !== APPROVED_SEPOLIA_TARGETS.CONTROLLER) {
    return {
      isApproved: false,
      reason: `Call 1 approve spender (${approvedSpender}) must be UnifyVaultController (${APPROVED_SEPOLIA_TARGETS.CONTROLLER}).`,
    };
  }

  if (approvedAmount <= 0n) {
    return {
      isApproved: false,
      reason: 'Approval amount must be strictly greater than zero.',
    };
  }

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

  if (depositAsset !== APPROVED_SEPOLIA_TARGETS.USDC) {
    return {
      isApproved: false,
      reason: `Controller deposit asset (${depositAsset}) must be USDC (${APPROVED_SEPOLIA_TARGETS.USDC}).`,
    };
  }

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
 * Validates a 2-call batched P2P fund (Approve + FundTrade)
 */
function validateP2PFundBatch(calls: SmartAccountCall[]): SponsorshipValidationResult {
  const [approveCall, fundCall] = calls;

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
        reason: `Batch Call 1 function (${decodedApprove.functionName}) must be 'approve'.`,
      };
    }

    const [spender, amount] = decodedApprove.args as [string, bigint];
    approvedSpender = getAddress(spender).toLowerCase();
    approvedAmount = amount;
  } catch (err: any) {
    return {
      isApproved: false,
      reason: `Failed to decode Batch Call 1 approve: ${err?.message || 'invalid calldata'}`,
    };
  }

  if (approvedSpender !== APPROVED_SEPOLIA_TARGETS.P2P_ESCROW) {
    return {
      isApproved: false,
      reason: `Batch Call 1 approve spender (${approvedSpender}) must be P2PEscrow (${APPROVED_SEPOLIA_TARGETS.P2P_ESCROW}).`,
    };
  }

  if (approvedAmount <= 0n) {
    return {
      isApproved: false,
      reason: 'P2P approval amount must be strictly greater than zero.',
    };
  }

  try {
    const decodedFund = decodeFunctionData({
      abi: P2P_ESCROW_ABI,
      data: fundCall.data,
    });

    if (decodedFund.functionName !== 'fundTrade') {
      return {
        isApproved: false,
        reason: `Batch Call 2 function (${decodedFund.functionName}) must be 'fundTrade'.`,
      };
    }

    const [tradeId] = decodedFund.args as [bigint];
    if (tradeId <= 0n) {
      return {
        isApproved: false,
        reason: 'Trade ID in fundTrade must be strictly greater than zero.',
      };
    }
  } catch (err: any) {
    return {
      isApproved: false,
      reason: `Failed to decode Batch Call 2 fundTrade: ${err?.message || 'invalid calldata'}`,
    };
  }

  return {
    isApproved: true,
    operationType: 'p2p_batch_fund',
  };
}

/**
 * Validates a single call (Redeem, UVBE Transfer, or P2PEscrow User Actions)
 */
function validateSingleCall(call: SmartAccountCall): SponsorshipValidationResult {
  let target: string;
  try {
    target = getAddress(call.to).toLowerCase();
  } catch {
    return { isApproved: false, reason: 'Invalid target contract address format.' };
  }

  // Scenario 1: Controller Redeem
  if (target === APPROVED_SEPOLIA_TARGETS.CONTROLLER) {
    try {
      const decoded = decodeFunctionData({
        abi: CONTROLLER_ABI,
        data: call.data,
      });

      if (decoded.functionName !== 'redeem') {
        return {
          isApproved: false,
          reason: `Single call function on Controller (${decoded.functionName}) must be 'redeem'.`,
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

  // Scenario 2: UVBE Wallet-to-Wallet Transfer
  if (target === APPROVED_SEPOLIA_TARGETS.UVBE) {
    try {
      const decoded = decodeFunctionData({
        abi: ERC20_ABI,
        data: call.data,
      });

      if (decoded.functionName !== 'transfer') {
        return {
          isApproved: false,
          reason: `Single call function on UVBE token (${decoded.functionName}) must be 'transfer'.`,
        };
      }

      const [recipient, amount] = decoded.args as [string, bigint];
      let formattedRecipient: string;
      try {
        formattedRecipient = getAddress(recipient);
      } catch {
        return {
          isApproved: false,
          reason: 'Invalid recipient address for UVBE transfer.',
        };
      }

      if (formattedRecipient === '0x0000000000000000000000000000000000000000') {
        return {
          isApproved: false,
          reason: 'Transfer to zero address is forbidden.',
        };
      }

      if (amount <= 0n) {
        return {
          isApproved: false,
          reason: 'Transfer amount must be strictly greater than zero.',
        };
      }

      return {
        isApproved: true,
        operationType: 'transfer',
      };
    } catch (err: any) {
      return {
        isApproved: false,
        reason: `Failed to decode UVBE transfer: ${err?.message || 'invalid calldata'}`,
      };
    }
  }

  // Scenario 3: P2PEscrow User Actions
  if (target === APPROVED_SEPOLIA_TARGETS.P2P_ESCROW) {
    return validateP2PEscrowCall(call.data);
  }

  return {
    isApproved: false,
    reason: `Call target (${target}) is not an approved contract for sponsorship.`,
  };
}

/**
 * Validates single P2PEscrow calls against approved user-facing actions
 */
function validateP2PEscrowCall(callData: Hex): SponsorshipValidationResult {
  try {
    const decoded = decodeFunctionData({
      abi: P2P_ESCROW_ABI,
      data: callData,
    });

    const fnName = decoded.functionName;

    // 1. createTrade
    if (fnName === 'createTrade') {
      const [params] = decoded.args as [
        {
          buyer: string;
          seller: string;
          asset: string;
          amount: bigint;
          fiatAmount: bigint;
          fiatCurrency: Hex;
          paymentWindow: bigint;
        },
      ];

      if (!isAddress(params.buyer) || !isAddress(params.seller) || !isAddress(params.asset)) {
        return { isApproved: false, reason: 'Invalid address in createTrade parameters.' };
      }

      if (params.buyer === params.seller) {
        return { isApproved: false, reason: 'Buyer and seller cannot be identical.' };
      }

      const assetAddr = getAddress(params.asset).toLowerCase();
      if (
        assetAddr !== APPROVED_SEPOLIA_TARGETS.UVBE &&
        assetAddr !== APPROVED_SEPOLIA_TARGETS.USDC
      ) {
        return {
          isApproved: false,
          reason: `createTrade asset (${assetAddr}) is not an approved token.`,
        };
      }

      if (params.amount <= 0n) {
        return {
          isApproved: false,
          reason: 'createTrade amount must be strictly greater than zero.',
        };
      }

      if (params.paymentWindow < 300n) {
        return {
          isApproved: false,
          reason: 'createTrade paymentWindow must be at least 300 seconds.',
        };
      }

      return { isApproved: true, operationType: 'p2p_create' };
    }

    // 2. fundTrade
    if (fnName === 'fundTrade') {
      const [tradeId] = decoded.args as [bigint];
      if (tradeId <= 0n) return { isApproved: false, reason: 'Invalid trade ID in fundTrade.' };
      return { isApproved: true, operationType: 'p2p_fund' };
    }

    // 3. submitPayment
    if (fnName === 'submitPayment') {
      const [tradeId, paymentRef, evidenceHash] = decoded.args as [bigint, Hex, Hex];
      if (tradeId <= 0n) return { isApproved: false, reason: 'Invalid trade ID in submitPayment.' };
      if (!paymentRef || paymentRef === '0x' || /^0x0+$/.test(paymentRef)) {
        return { isApproved: false, reason: 'Payment reference cannot be empty or zero.' };
      }
      if (!evidenceHash || evidenceHash === '0x' || /^0x0+$/.test(evidenceHash)) {
        return { isApproved: false, reason: 'Evidence hash cannot be empty or zero.' };
      }
      return { isApproved: true, operationType: 'p2p_submit_payment' };
    }

    // 4. confirmAndRelease
    if (fnName === 'confirmAndRelease') {
      const [tradeId] = decoded.args as [bigint];
      if (tradeId <= 0n)
        return { isApproved: false, reason: 'Invalid trade ID in confirmAndRelease.' };
      return { isApproved: true, operationType: 'p2p_release' };
    }

    // 5. refund
    if (fnName === 'refund') {
      const [tradeId] = decoded.args as [bigint];
      if (tradeId <= 0n) return { isApproved: false, reason: 'Invalid trade ID in refund.' };
      return { isApproved: true, operationType: 'p2p_refund' };
    }

    // 6. cancelUnfundedTrade
    if (fnName === 'cancelUnfundedTrade') {
      const [tradeId] = decoded.args as [bigint];
      if (tradeId <= 0n)
        return { isApproved: false, reason: 'Invalid trade ID in cancelUnfundedTrade.' };
      return { isApproved: true, operationType: 'p2p_cancel' };
    }

    // 7. raiseDispute
    if (fnName === 'raiseDispute') {
      const [tradeId, reasonHash] = decoded.args as [bigint, Hex];
      if (tradeId <= 0n) return { isApproved: false, reason: 'Invalid trade ID in raiseDispute.' };
      if (!reasonHash || reasonHash === '0x' || /^0x0+$/.test(reasonHash)) {
        return { isApproved: false, reason: 'Dispute reason hash cannot be empty or zero.' };
      }
      return { isApproved: true, operationType: 'p2p_dispute' };
    }

    return {
      isApproved: false,
      reason: `Function (${fnName}) on P2PEscrow is not authorized for user Paymaster sponsorship.`,
    };
  } catch (err: any) {
    return {
      isApproved: false,
      reason: `Failed to decode P2PEscrow function or unauthorized selector: ${err?.message || 'invalid calldata'}`,
    };
  }
}
