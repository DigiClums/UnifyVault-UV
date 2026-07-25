import { readContract } from 'wagmi/actions';
import { TREASURY_ABI } from './ABIs';
import { config } from '../lib/config/config';

export const TreasuryContract = {
  async balance(treasuryAddress: `0x${string}`, asset: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'balance',
        args: [asset],
      });
      return result as bigint;
    } catch (error) {
      console.warn(`⚠️ Treasury.balance error for ${asset}:`, error);
      return 0n;
    }
  },

  async totalAssetBalance(treasuryAddress: `0x${string}`, asset: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [asset],
      });
      return result as bigint;
    } catch (error) {
      console.warn(`⚠️ Treasury.totalAssetBalance error for ${asset}:`, error);
      return 0n;
    }
  },

  async nativeBalance(treasuryAddress: `0x${string}`): Promise<bigint> {
    try {
      const result = await readContract(config, {
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'nativeBalance',
      });
      return result as bigint;
    } catch (error) {
      console.warn('⚠️ Treasury.nativeBalance error:', error);
      return 0n;
    }
  },

  async isSupported(treasuryAddress: `0x${string}`, asset: `0x${string}`): Promise<boolean> {
    try {
      const result = await readContract(config, {
        address: treasuryAddress,
        abi: TREASURY_ABI,
        functionName: 'isSupported',
        args: [asset],
      });
      return Boolean(result);
    } catch (error) {
      console.warn(`⚠️ Treasury.isSupported error for ${asset}:`, error);
      return false;
    }
  },
};
