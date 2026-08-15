import type { Address } from 'viem';

export const ERC20_ALLOWANCE_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface CheckAllowanceResult {
  currentAllowance: bigint;
  requiredAmount: bigint;
  isSufficient: boolean;
}

/**
 * Checks if the current ERC20 allowance for user -> spender is >= requiredAmount.
 * Returns currentAllowance and boolean isSufficient.
 */
export async function checkERC20Allowance(params: {
  publicClient: any;
  userAddress: Address;
  assetAddress: Address;
  spenderAddress: Address;
  requiredAmount: bigint;
}): Promise<CheckAllowanceResult> {
  const { publicClient, userAddress, assetAddress, spenderAddress, requiredAmount } = params;

  if (
    !userAddress ||
    !assetAddress ||
    !spenderAddress ||
    assetAddress === '0x0000000000000000000000000000000000000000'
  ) {
    return {
      currentAllowance: 0n,
      requiredAmount,
      isSufficient: true, // Native asset or zero address requires no ERC20 approval
    };
  }

  try {
    const currentAllowance = (await publicClient.readContract({
      address: assetAddress,
      abi: ERC20_ALLOWANCE_ABI,
      functionName: 'allowance',
      args: [userAddress, spenderAddress],
    })) as bigint;

    const isSufficient = currentAllowance >= requiredAmount;

    return {
      currentAllowance,
      requiredAmount,
      isSufficient,
    };
  } catch (err) {
    console.warn('Failed to check ERC20 allowance:', err);
    return {
      currentAllowance: 0n,
      requiredAmount,
      isSufficient: false,
    };
  }
}
