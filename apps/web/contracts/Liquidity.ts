import { readContract } from 'wagmi/actions';
import { LIQUIDITY_MANAGER_ABI } from './ABIs';
import { config } from '../lib/config/wagmi';

export interface LiquidityCheckResult {
  needsRefill: boolean;
  needsSweep: boolean;
  amount: bigint;
}

export interface LiquidityBalances {
  operationalBalance: bigint;
  reserveBalance: bigint;
  totalBalance: bigint;
}

export const LiquidityContract = {
  async checkLiquidity(
    liquidityManagerAddress: `0x${string}`,
    asset: `0x${string}`,
  ): Promise<LiquidityCheckResult> {
    const result = await readContract(config, {
      address: liquidityManagerAddress,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'checkLiquidity',
      args: [asset],
    });
    const [needsRefill, needsSweep, amount] = result as [boolean, boolean, bigint];
    return { needsRefill, needsSweep, amount };
  },

  async getLiquidityBalances(
    liquidityManagerAddress: `0x${string}`,
    asset: `0x${string}`,
  ): Promise<LiquidityBalances> {
    const result = await readContract(config, {
      address: liquidityManagerAddress,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'getLiquidityBalances',
      args: [asset],
    });
    const [operationalBalance, reserveBalance, totalBalance] = result as [bigint, bigint, bigint];
    return { operationalBalance, reserveBalance, totalBalance };
  },
};
