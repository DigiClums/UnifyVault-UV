import { encodeFunctionData, Address } from 'viem';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { ERC20_ABI } from './constants';
import { SmartAccountCall } from './types';

export interface SmartAccountTransferParams {
  recipient: Address;
  amount: bigint;
  tokenAddress?: Address;
}

/**
 * Builds the call for UVBE token transfer from Smart Account to Recipient:
 * UVBE.transfer(recipient, amount)
 */
export function buildSmartAccountTransferCall(
  params: SmartAccountTransferParams,
): SmartAccountCall {
  const { recipient, amount, tokenAddress = DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken } = params;

  if (amount <= 0n) {
    throw new Error('Transfer amount must be strictly greater than zero.');
  }

  if (!recipient) {
    throw new Error('Recipient address is required.');
  }

  return {
    to: tokenAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipient, amount],
    }),
  };
}
