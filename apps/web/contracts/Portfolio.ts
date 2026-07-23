import { readContract } from 'wagmi/actions';
import { PORTFOLIO_MANAGER_ABI, STRATEGY_MANAGER_ABI } from './ABIs';
import { config } from '../lib/config/wagmi';

export interface NAVData {
  totalPortfolioValueUSD: bigint;
  navPerShare: bigint;
}

export interface StrategyWeights {
  assets: readonly `0x${string}`[];
  weightsBps: readonly bigint[];
}

export const PortfolioContract = {
  async calculateNAV(portfolioManagerAddress: `0x${string}`): Promise<NAVData> {
    const result = await readContract(config, {
      address: portfolioManagerAddress,
      abi: PORTFOLIO_MANAGER_ABI,
      functionName: 'calculateNAV',
    });
    const [totalPortfolioValueUSD, navPerShare] = result as [bigint, bigint];
    return { totalPortfolioValueUSD, navPerShare };
  },

  async calculatePortfolioValue(portfolioManagerAddress: `0x${string}`): Promise<bigint> {
    const result = await readContract(config, {
      address: portfolioManagerAddress,
      abi: PORTFOLIO_MANAGER_ABI,
      functionName: 'calculatePortfolioValue',
    });
    return result as bigint;
  },

  async getTargetWeights(strategyManagerAddress: `0x${string}`): Promise<StrategyWeights> {
    const result = await readContract(config, {
      address: strategyManagerAddress,
      abi: STRATEGY_MANAGER_ABI,
      functionName: 'getTargetWeights',
    });
    const [assets, weightsBps] = result as [readonly `0x${string}`[], readonly bigint[]];
    return { assets, weightsBps };
  },
};
