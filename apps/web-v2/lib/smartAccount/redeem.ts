import { encodeFunctionData, Address } from 'viem';
import { CONTROLLER_ABI } from '../contracts/controller';
import { DEPLOYED_CONTRACTS_MAINNET, TOKENS_BY_CHAIN } from '../../constants';
import { base } from 'viem/chains';
import { GaslessRedeemParams, SmartAccountCall } from './types';

/**
 * Builds the call for sponsored gasless redeem:
 * UnifyVaultController.redeem(USDC, shares, minAssetsOut, receiver, deadline)
 */
export function buildGaslessRedeemCalls(params: GaslessRedeemParams): SmartAccountCall[] {
  const {
    shares,
    minAssetsOut,
    receiver,
    deadline = BigInt(Math.floor(Date.now() / 1000) + 3600), // Default 1 hour deadline
    usdcAddress = TOKENS_BY_CHAIN[base.id].USDC,
    controllerAddress = DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController,
  } = params;

  if (shares <= 0n) {
    throw new Error('Redeem share amount must be strictly greater than zero.');
  }

  if (!receiver) {
    throw new Error('Receiver address is required.');
  }

  const redeemCall: SmartAccountCall = {
    to: controllerAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: CONTROLLER_ABI,
      functionName: 'redeem',
      args: [usdcAddress, shares, minAssetsOut, receiver, deadline],
    }),
  };

  return [redeemCall];
}
