import { readContracts } from 'wagmi/actions';
import { config } from '../lib/config/config';

export interface MulticallItem {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}

export interface MulticallResult<T = unknown> {
  status: 'success' | 'failure';
  result?: T;
  error?: Error;
}

/**
 * Batch executes multiple contract reads using multicall via Wagmi/Viem.
 * Catches individual contract errors gracefully so a single failure never crashes the application.
 */
export async function executeMulticall<T extends readonly unknown[]>(calls: {
  [K in keyof T]: MulticallItem;
}): Promise<{ [K in keyof T]: MulticallResult<T[K]> }> {
  if (!calls || calls.length === 0) {
    return [] as unknown as { [K in keyof T]: MulticallResult<T[K]> };
  }

  try {
    const rawResults = await readContracts(config, {
      contracts: calls as any,
    });

    return rawResults.map((item: any) => {
      if (item.status === 'success') {
        return {
          status: 'success',
          result: item.result,
        };
      }
      return {
        status: 'failure',
        error: item.error || new Error('Contract read failed'),
      };
    }) as unknown as { [K in keyof T]: MulticallResult<T[K]> };
  } catch (error) {
    console.error('Multicall batch execution error:', error);
    return calls.map(() => ({
      status: 'failure',
      error: error instanceof Error ? error : new Error('Multicall execution error'),
    })) as unknown as { [K in keyof T]: MulticallResult<T[K]> };
  }
}
