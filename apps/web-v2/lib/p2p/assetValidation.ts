import { isAddress, getAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getDefaultChainId, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

export const CANONICAL_UVBE_ADDRESS = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
export const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface P2PAssetInfo {
  symbol: string;
  name: string;
  address: `0x${string}`;
  isNative: boolean;
}

export interface ValidateAssetResult {
  isValid: boolean;
  isNative: boolean;
  checksummedAddress?: `0x${string}`;
  assetInfo?: P2PAssetInfo;
  errorMessage?: string;
}

export function getCanonicalUVBEAddress(): `0x${string}` {
  return (DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken as `0x${string}`) || CANONICAL_UVBE_ADDRESS;
}

/**
 * Returns explicitly supported P2P assets for a given chain ID.
 * Exclusively supports UVBE (UnifyVault BTC-ETH Index Token).
 * Rejects BTC, ETH, WETH, cbBTC, USDC and all other tokens.
 */
export function getSupportedP2PAssetsForChain(chainId?: number): P2PAssetInfo[] {
  const targetChainId = chainId ?? getDefaultChainId();

  if (targetChainId === baseSepolia.id || targetChainId === base.id) {
    return [
      {
        symbol: 'UVBE',
        name: 'UnifyVault BTC-ETH Index Token',
        address: getAddress(getCanonicalUVBEAddress()),
        isNative: false,
      },
    ];
  }

  // Unsupported chain: return empty array
  return [];
}

/**
 * Checks whether an asset string represents Native ETH.
 */
export function isNativeETHAsset(asset?: string): boolean {
  if (!asset) return false;
  return asset.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase() || asset.toUpperCase() === 'ETH';
}

/**
 * Single authoritative validation function for P2P assets.
 * Strictly enforces UVBE-only policy. Rejects Native ETH and all non-UVBE tokens.
 */
export function validateP2PAsset(asset: string, chainId?: number): ValidateAssetResult {
  if (!asset || typeof asset !== 'string') {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'P2P marketplace exclusively supports UVBE token.',
    };
  }

  // Reject Native ETH explicitly
  if (isNativeETHAsset(asset)) {
    return {
      isValid: false,
      isNative: true,
      errorMessage: 'P2P marketplace exclusively supports UVBE token. Native ETH is prohibited.',
    };
  }

  // ERC20 asset: verify EVM address format
  if (!isAddress(asset)) {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Invalid token address format for P2P order.',
    };
  }

  let checksummed: `0x${string}`;
  try {
    checksummed = getAddress(asset);
  } catch {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Invalid checksummed token address for P2P order.',
    };
  }

  const targetChainId = chainId ?? getDefaultChainId();
  const supportedAssets = getSupportedP2PAssetsForChain(targetChainId);

  // Match against supported assets for this specific active chain (strictly UVBE)
  const matchedAsset = supportedAssets.find(
    (a) => !a.isNative && getAddress(a.address) === checksummed,
  );

  if (!matchedAsset) {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'P2P marketplace exclusively supports UVBE token.',
    };
  }

  return {
    isValid: true,
    isNative: false,
    checksummedAddress: checksummed,
    assetInfo: matchedAsset,
  };
}
