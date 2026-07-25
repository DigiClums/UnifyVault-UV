import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { ERC20_ABI } from './ABIs';
import { config } from '../lib/config/config';

export interface TokenMetadata {
  symbol: string;
  decimals: number;
}

export const TokenContract = {
  async balanceOf(tokenAddress: `0x${string}`, account: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account],
      });
      return result as bigint;
    } catch (error) {
      return 0n;
    }
  },

  async totalSupply(tokenAddress: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      });
      return result as bigint;
    } catch (error) {
      return 0n;
    }
  },

  async allowance(
    tokenAddress: `0x${string}`,
    owner: `0x${string}`,
    spender: `0x${string}`,
  ): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      });
      return result as bigint;
    } catch (error) {
      return 0n;
    }
  },

  async approve(
    tokenAddress: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint,
  ): Promise<`0x${string}`> {
    const hash = await writeContract(config, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  },

  async getMetadata(tokenAddress: `0x${string}`): Promise<TokenMetadata> {
    try {
      const [symbolRes, decimalsRes] = await Promise.all([
        readContract(config, { address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
        readContract(config, { address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' }),
      ]);
      return {
        symbol: (symbolRes as string) || 'TOKEN',
        decimals: Number(decimalsRes) || 18,
      };
    } catch (error) {
      return { symbol: 'TOKEN', decimals: 18 };
    }
  },
};
