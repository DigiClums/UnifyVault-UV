import { encodeFunctionData, Address, Hex, isAddress } from 'viem';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { ERC20_ABI, P2P_ESCROW_ABI } from './constants';
import {
  SmartAccountCall,
  P2PCreateTradeParams,
  P2PFundTradeParams,
  P2PSubmitPaymentParams,
  P2PConfirmReleaseParams,
  P2PRefundParams,
  P2PCancelUnfundedParams,
  P2PRaiseDisputeParams,
} from './types';

/**
 * Builds the call to create a new P2P Trade:
 * P2PEscrow.createTrade(params)
 */
export function buildP2PCreateTradeCall(params: P2PCreateTradeParams): SmartAccountCall {
  const {
    buyer,
    seller,
    asset,
    amount,
    fiatAmount,
    fiatCurrency,
    paymentWindow,
    escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address,
  } = params;

  if (!isAddress(buyer) || !isAddress(seller) || !isAddress(asset)) {
    throw new Error('Invalid address format in trade parameters.');
  }

  if (amount <= 0n) {
    throw new Error('Trade amount must be strictly greater than zero.');
  }

  if (paymentWindow < 300n) {
    throw new Error('Payment window must be at least 300 seconds (5 minutes).');
  }

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'createTrade',
      args: [
        {
          buyer,
          seller,
          asset,
          amount,
          fiatAmount,
          fiatCurrency,
          paymentWindow,
        },
      ],
    }),
  };
}

/**
 * Builds a 2-call batch to approve and fund a P2P trade:
 * 1. ERC20.approve(escrow, amount)
 * 2. P2PEscrow.fundTrade(tradeId)
 */
export function buildP2PFundTradeBatch(params: P2PFundTradeParams): SmartAccountCall[] {
  const {
    tradeId,
    amount,
    assetAddress,
    escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address,
  } = params;

  if (tradeId <= 0n) {
    throw new Error('Invalid trade ID.');
  }

  if (amount <= 0n) {
    throw new Error('Fund amount must be strictly greater than zero.');
  }

  return [
    {
      to: assetAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress, amount],
      }),
    },
    {
      to: escrowAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: P2P_ESCROW_ABI,
        functionName: 'fundTrade',
        args: [tradeId],
      }),
    },
  ];
}

/**
 * Builds single call for fundTrade:
 * P2PEscrow.fundTrade(tradeId)
 */
export function buildP2PFundTradeCall(
  tradeId: bigint,
  escrowAddress: Address = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address,
): SmartAccountCall {
  if (tradeId <= 0n) throw new Error('Invalid trade ID.');

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'fundTrade',
      args: [tradeId],
    }),
  };
}

/**
 * Builds the call to submit payment reference/evidence:
 * P2PEscrow.submitPayment(tradeId, paymentReference, evidenceHash)
 */
export function buildP2PSubmitPaymentCall(params: P2PSubmitPaymentParams): SmartAccountCall {
  const {
    tradeId,
    paymentReference,
    evidenceHash,
    escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address,
  } = params;

  if (tradeId <= 0n) throw new Error('Invalid trade ID.');
  if (
    !paymentReference ||
    paymentReference === '0x' ||
    paymentReference === '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    throw new Error('Valid payment reference hash is required.');
  }
  if (
    !evidenceHash ||
    evidenceHash === '0x' ||
    evidenceHash === '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    throw new Error('Valid evidence hash is required.');
  }

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'submitPayment',
      args: [tradeId, paymentReference, evidenceHash],
    }),
  };
}

/**
 * Builds the call for seller to confirm and release crypto:
 * P2PEscrow.confirmAndRelease(tradeId)
 */
export function buildP2PConfirmReleaseCall(params: P2PConfirmReleaseParams): SmartAccountCall {
  const { tradeId, escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address } = params;

  if (tradeId <= 0n) throw new Error('Invalid trade ID.');

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'confirmAndRelease',
      args: [tradeId],
    }),
  };
}

/**
 * Builds the call to refund a trade:
 * P2PEscrow.refund(tradeId)
 */
export function buildP2PRefundCall(params: P2PRefundParams): SmartAccountCall {
  const { tradeId, escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address } = params;

  if (tradeId <= 0n) throw new Error('Invalid trade ID.');

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'refund',
      args: [tradeId],
    }),
  };
}

/**
 * Builds the call to cancel an unfunded trade:
 * P2PEscrow.cancelUnfundedTrade(tradeId)
 */
export function buildP2PCancelUnfundedCall(params: P2PCancelUnfundedParams): SmartAccountCall {
  const { tradeId, escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address } = params;

  if (tradeId <= 0n) throw new Error('Invalid trade ID.');

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'cancelUnfundedTrade',
      args: [tradeId],
    }),
  };
}

/**
 * Builds the call to raise a dispute:
 * P2PEscrow.raiseDispute(tradeId, reasonHash)
 */
export function buildP2PRaiseDisputeCall(params: P2PRaiseDisputeParams): SmartAccountCall {
  const {
    tradeId,
    reasonHash,
    escrowAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow as Address,
  } = params;

  if (tradeId <= 0n) throw new Error('Invalid trade ID.');
  if (
    !reasonHash ||
    reasonHash === '0x' ||
    reasonHash === '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    throw new Error('Valid reason hash is required to raise a dispute.');
  }

  return {
    to: escrowAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: P2P_ESCROW_ABI,
      functionName: 'raiseDispute',
      args: [tradeId, reasonHash],
    }),
  };
}
