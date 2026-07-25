import { ProtocolDirectoryContract } from '../../contracts/ProtocolDirectory';
import { CONTROLLER_ABI } from '../../contracts/ABIs';
import { executeMulticall } from '../../utils/multicall';

export interface GovernanceState {
  isPaused: boolean;
  maxDeposit: bigint;
  swapSlippageBps: bigint;
  roles?: {
    isGovernance: boolean;
    isGuardian: boolean;
  };
}

export const GovernanceService = {
  async getGovernanceState(
    userAddress?: `0x${string}`,
    chainId?: number,
  ): Promise<GovernanceState> {
    try {
      const addresses = await ProtocolDirectoryContract.resolveAllModules(chainId);
      if (addresses.controller === '0x0000000000000000000000000000000000000000') {
        return {
          isPaused: false,
          maxDeposit: 0n,
          swapSlippageBps: 100n,
        };
      }

      const calls = [
        { address: addresses.controller, abi: CONTROLLER_ABI, functionName: 'paused' },
        { address: addresses.controller, abi: CONTROLLER_ABI, functionName: 'maxDeposit' },
        { address: addresses.controller, abi: CONTROLLER_ABI, functionName: 'swapSlippageBps' },
      ];

      const results = await executeMulticall(calls);

      const isPaused = results[0]?.status === 'success' ? Boolean(results[0].result) : false;
      const maxDeposit = results[1]?.status === 'success' ? (results[1].result as bigint) : 0n;
      const swapSlippageBps =
        results[2]?.status === 'success' ? (results[2].result as bigint) : 100n;

      return {
        isPaused,
        maxDeposit,
        swapSlippageBps,
      };
    } catch (error) {
      console.error('❌ GovernanceService: Error fetching governance state:', error);
      return {
        isPaused: false,
        maxDeposit: 0n,
        swapSlippageBps: 100n,
      };
    }
  },
};
