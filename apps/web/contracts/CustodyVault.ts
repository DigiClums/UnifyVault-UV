import { readContract } from 'wagmi/actions';
import { CUSTODY_VAULT_ABI } from './ABIs';
import { config } from '../lib/config/config';

export interface VaultAssetConfig {
  decimals: number;
  enabled: boolean;
}

export const CustodyVaultContract = {
  async totalAssets(vaultAddress: `0x${string}`, asset: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: vaultAddress,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [asset],
      });
      return result as bigint;
    } catch (error) {
      return 0n;
    }
  },

  async surplusAssets(vaultAddress: `0x${string}`, asset: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: vaultAddress,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'surplusAssets',
        args: [asset],
      });
      return result as bigint;
    } catch (error) {
      return 0n;
    }
  },

  async balance(vaultAddress: `0x${string}`, asset: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: vaultAddress,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'balance',
        args: [asset],
      });
      return result as bigint;
    } catch (error) {
      return 0n;
    }
  },

  async isSupported(vaultAddress: `0x${string}`, asset: `0x${string}`): Promise<boolean> {
    try {
      const result = await readContract(config, {
        address: vaultAddress,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'isSupported',
        args: [asset],
      });
      return Boolean(result);
    } catch (error) {
      return false;
    }
  },

  async assetConfig(
    vaultAddress: `0x${string}`,
    asset: `0x${string}`,
  ): Promise<VaultAssetConfig | undefined> {
    try {
      const result = await readContract(config, {
        address: vaultAddress,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'assetConfig',
        args: [asset],
      });
      if (!result) return undefined;
      const resObj = result as unknown as { decimals: number; enabled: boolean };
      return { decimals: Number(resObj.decimals), enabled: Boolean(resObj.enabled) };
    } catch (error) {
      return undefined;
    }
  },
};
