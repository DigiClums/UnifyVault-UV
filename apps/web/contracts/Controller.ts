import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { CONTROLLER_ABI } from './ABIs';
import { config } from '../lib/config/wagmi';

export interface DepositQuote {
  grossDeposit: bigint;
  protocolFee: bigint;
  netDeposit: bigint;
  sharesPreview: bigint;
}

export const ControllerContract = {
  async getDepositQuote(
    controllerAddress: `0x${string}`,
    asset: `0x${string}`,
    amount: bigint,
    receiver: `0x${string}`,
  ): Promise<DepositQuote> {
    const result = await readContract(config, {
      address: controllerAddress,
      abi: CONTROLLER_ABI,
      functionName: 'getDepositQuote',
      args: [asset, amount, 0n, receiver],
    });
    return result as DepositQuote;
  },

  async previewRedeem(
    controllerAddress: `0x${string}`,
    asset: `0x${string}`,
    shares: bigint,
  ): Promise<bigint> {
    const result = await readContract(config, {
      address: controllerAddress,
      abi: CONTROLLER_ABI,
      functionName: 'previewRedeem',
      args: [asset, shares],
    });
    return result as bigint;
  },

  async deposit(
    controllerAddress: `0x${string}`,
    asset: `0x${string}`,
    amount: bigint,
    minSharesOut: bigint,
    receiver: `0x${string}`,
  ): Promise<`0x${string}`> {
    const hash = await writeContract(config, {
      address: controllerAddress,
      abi: CONTROLLER_ABI,
      functionName: 'deposit',
      args: [asset, amount, minSharesOut, receiver],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  },

  async redeem(
    controllerAddress: `0x${string}`,
    asset: `0x${string}`,
    shares: bigint,
    minAssetsOut: bigint,
    receiver: `0x${string}`,
    deadline: bigint,
  ): Promise<`0x${string}`> {
    const hash = await writeContract(config, {
      address: controllerAddress,
      abi: CONTROLLER_ABI,
      functionName: 'redeem',
      args: [asset, shares, minAssetsOut, receiver, deadline],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  },
};
