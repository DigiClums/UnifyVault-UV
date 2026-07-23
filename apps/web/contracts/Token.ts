import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { ERC20_ABI } from './ABIs';
import { config } from '../lib/config/wagmi';

export const TokenContract = {
  async balanceOf(tokenAddress: `0x${string}`, account: `0x${string}`): Promise<bigint> {
    const result = await readContract(config, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account],
    });
    return result as bigint;
  },

  async totalSupply(tokenAddress: `0x${string}`): Promise<bigint> {
    const result = await readContract(config, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    });
    return result as bigint;
  },

  async allowance(
    tokenAddress: `0x${string}`,
    owner: `0x${string}`,
    spender: `0x${string}`,
  ): Promise<bigint> {
    const result = await readContract(config, {
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    });
    return result as bigint;
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
};
