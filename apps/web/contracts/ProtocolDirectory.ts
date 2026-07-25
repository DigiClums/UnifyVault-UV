import { readContract } from 'wagmi/actions';
import { keccak256, toHex } from 'viem';
import { PROTOCOL_DIRECTORY_ABI } from './ABIs';
import { config } from '../lib/config/config';
import { getContractAddresses } from '../lib/config/contracts';
import { executeMulticall } from '../utils/multicall';

export const MODULE_KEYS = {
  ORACLE: keccak256(toHex('OracleManager')),
  VAULT: keccak256(toHex('CustodyVault')),
  TREASURY: keccak256(toHex('Treasury')),
  TOKEN: keccak256(toHex('IndexToken')),
  DEPOSIT_MANAGER: keccak256(toHex('DepositManager')),
  STRATEGY_MANAGER: keccak256(toHex('StrategyManager')),
  PORTFOLIO_MANAGER: keccak256(toHex('PortfolioManager')),
  SWAP_ADAPTER: keccak256(toHex('SwapAdapter')),
  LIQUIDITY_MANAGER: keccak256(toHex('LiquidityManager')),
} as const;

export interface ResolvedProtocolAddresses {
  directory: `0x${string}`;
  controller: `0x${string}`;
  vault: `0x${string}`;
  treasury: `0x${string}`;
  token: `0x${string}`;
  oracleManager: `0x${string}`;
  strategyManager: `0x${string}`;
  portfolioManager: `0x${string}`;
  swapAdapter: `0x${string}`;
  liquidityManager: `0x${string}`;
}

export const ProtocolDirectoryContract = {
  async getAddress(id: `0x${string}`, chainId?: number): Promise<`0x${string}` | undefined> {
    try {
      const addresses = getContractAddresses(chainId || 84532);
      if (!addresses?.directory) return undefined;

      const result = await readContract(config, {
        address: addresses.directory,
        abi: PROTOCOL_DIRECTORY_ABI,
        functionName: 'getAddress',
        args: [id],
      });
      return result as `0x${string}`;
    } catch (error) {
      return undefined;
    }
  },

  async resolveAllModules(chainId?: number): Promise<ResolvedProtocolAddresses> {
    const addresses = getContractAddresses(chainId || 84532);
    const directory = addresses.directory;

    const keys = [
      MODULE_KEYS.DEPOSIT_MANAGER,
      MODULE_KEYS.VAULT,
      MODULE_KEYS.TREASURY,
      MODULE_KEYS.TOKEN,
      MODULE_KEYS.ORACLE,
      MODULE_KEYS.STRATEGY_MANAGER,
      MODULE_KEYS.PORTFOLIO_MANAGER,
      MODULE_KEYS.SWAP_ADAPTER,
      MODULE_KEYS.LIQUIDITY_MANAGER,
    ] as const;

    const calls = keys.map((key) => ({
      address: directory,
      abi: PROTOCOL_DIRECTORY_ABI,
      functionName: 'getAddress',
      args: [key],
    }));

    const results = await executeMulticall<
      [
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
      ]
    >(calls as any);

    const getRes = (index: number): `0x${string}` => {
      const item = results[index];
      if (
        item?.status === 'success' &&
        item.result &&
        item.result !== '0x0000000000000000000000000000000000000000'
      ) {
        return item.result as `0x${string}`;
      }
      return '0x0000000000000000000000000000000000000000';
    };

    return {
      directory,
      controller: getRes(0),
      vault: getRes(1),
      treasury: getRes(2),
      token: getRes(3),
      oracleManager: getRes(4),
      strategyManager: getRes(5),
      portfolioManager: getRes(6),
      swapAdapter: getRes(7),
      liquidityManager: getRes(8),
    };
  },
};
