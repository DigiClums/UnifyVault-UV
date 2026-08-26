import { encodeFunctionData, Address } from 'viem';
import { CONTROLLER_ABI } from '../contracts/controller';
import { DEPLOYED_CONTRACTS_MAINNET, TOKENS_BY_CHAIN } from '../../constants';
import { base } from 'viem/chains';
import { ERC20_ABI } from './constants';
import { GaslessDepositParams, SmartAccountCall } from './types';

/**
 * Builds the exact 2-call batch for sponsored gasless deposit:
 * 1. USDC.approve(controller, amount) [Exact approval, no excess allowance]
 * 2. UnifyVaultController.deposit(USDC, amount, minSharesOut, receiver)
 */
export function buildGaslessDepositCalls(params: GaslessDepositParams): SmartAccountCall[] {
  const {
    amount,
    minSharesOut,
    receiver,
    usdcAddress = TOKENS_BY_CHAIN[base.id].USDC,
    controllerAddress = DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController,
  } = params;

  if (amount <= 0n) {
    throw new Error('Deposit amount must be strictly greater than zero.');
  }

  if (!receiver) {
    throw new Error('Receiver address is required.');
  }

  // Call 1: Exact USDC approval to Controller
  const approveCall: SmartAccountCall = {
    to: usdcAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [controllerAddress, amount],
    }),
  };

  // Call 2: Controller.deposit
  const depositCall: SmartAccountCall = {
    to: controllerAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: CONTROLLER_ABI,
      functionName: 'deposit',
      args: [usdcAddress, amount, minSharesOut, receiver],
    }),
  };

  return [approveCall, depositCall];
}
