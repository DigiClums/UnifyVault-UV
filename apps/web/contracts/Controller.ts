import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { CONTROLLER_ABI } from './ABIs';
import { config } from '../lib/config/config';

export interface DepositQuote {
  assetId: `0x${string}`;
  asset: `0x${string}`;
  receiver: `0x${string}`;
  depositAmount: bigint;
  rawPrice: bigint;
  normalizedPrice: bigint;
  sharesPreview: bigint;
  protocolFee: bigint;
  netDeposit: bigint;
  timestamp: bigint;
}

export const ControllerContract = {
  async getDepositQuote(
    controllerAddress: `0x${string}`,
    asset: `0x${string}`,
    amount: bigint,
    receiver: `0x${string}`,
  ): Promise<DepositQuote | undefined> {
    try {
      const result = await readContract(config, {
        address: controllerAddress,
        abi: CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [asset, amount, 0n, receiver],
      });
      return result as unknown as DepositQuote;
    } catch (error) {
      console.warn('⚠️ getDepositQuote error:', error);
      return undefined;
    }
  },

  async previewRedeem(
    controllerAddress: `0x${string}`,
    asset: `0x${string}`,
    shares: bigint,
  ): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: controllerAddress,
        abi: CONTROLLER_ABI,
        functionName: 'previewRedeem',
        args: [asset, shares],
      });
      return result as bigint;
    } catch (error) {
      console.warn('⚠️ previewRedeem error:', error);
      return 0n;
    }
  },

  async isPaused(controllerAddress: `0x${string}`): Promise<boolean> {
    try {
      const result = await readContract(config, {
        address: controllerAddress,
        abi: CONTROLLER_ABI,
        functionName: 'paused',
      });
      return Boolean(result);
    } catch (error) {
      console.warn('⚠️ isPaused error:', error);
      return false;
    }
  },

  async getMaxDeposit(controllerAddress: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: controllerAddress,
        abi: CONTROLLER_ABI,
        functionName: 'maxDeposit',
      });
      return result as bigint;
    } catch (error) {
      console.warn('⚠️ getMaxDeposit error:', error);
      return 0n;
    }
  },

  async getSwapSlippageBps(controllerAddress: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: controllerAddress,
        abi: CONTROLLER_ABI,
        functionName: 'swapSlippageBps',
      });
      return result as bigint;
    } catch (error) {
      console.warn('⚠️ getSwapSlippageBps error:', error);
      return 100n; // 1% default
    }
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
