import { isAddress, getAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getDefaultChainId, TOKENS_BY_CHAIN, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

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

/**
 * Returns explicitly supported P2P assets for a given chain ID.
 * NEVER silently falls back to another chain's token address.
 */
export function getSupportedP2PAssetsForChain(chainId?: number): P2PAssetInfo[] {
  const targetChainId = chainId ?? getDefaultChainId();

  if (targetChainId === baseSepolia.id) {
    const tokens = TOKENS_BY_CHAIN[baseSepolia.id];
    return [
      {
        symbol: 'UVBTCETH',
        name: 'Vault Basket Token',
        address: getAddress(DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken),
        isNative: false,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: getAddress(tokens.USDC),
        isNative: false,
      },
      {
        symbol: 'cbBTC',
        name: 'Wrapped BTC',
        address: getAddress(tokens.cbBTC),
        isNative: false,
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: getAddress(tokens.WETH),
        isNative: false,
      },
      {
        symbol: 'ETH',
        name: 'Native Ether',
        address: NATIVE_ETH_ADDRESS,
        isNative: true,
      },
    ];
  }

  if (targetChainId === base.id) {
    const tokens = TOKENS_BY_CHAIN[base.id];
    return [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: getAddress(tokens.USDC),
        isNative: false,
      },
      {
        symbol: 'cbBTC',
        name: 'Wrapped BTC',
        address: getAddress(tokens.cbBTC),
        isNative: false,
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: getAddress(tokens.WETH),
        isNative: false,
      },
      {
        symbol: 'ETH',
        name: 'Native Ether',
        address: NATIVE_ETH_ADDRESS,
        isNative: true,
      },
    ];
  }

  // Unsupported chain: return empty array so we never fall back to another chain's tokens
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
 * Validates address checksum, checks active chain support, and handles Native ETH vs ERC20.
 */
export function validateP2PAsset(asset: string, chainId?: number): ValidateAssetResult {
  if (!asset || typeof asset !== 'string') {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Selected asset is not supported on the active network.',
    };
  }

  const targetChainId = chainId ?? getDefaultChainId();
  const supportedAssets = getSupportedP2PAssetsForChain(targetChainId);

  // Handle Native ETH
  if (isNativeETHAsset(asset)) {
    const ethAsset = supportedAssets.find((a) => a.isNative);
    if (!ethAsset) {
      return {
        isValid: false,
        isNative: true,
        errorMessage: 'Selected asset is not supported on the active network.',
      };
    }
    return {
      isValid: true,
      isNative: true,
      checksummedAddress: NATIVE_ETH_ADDRESS,
      assetInfo: ethAsset,
    };
  }

  // ERC20 asset: verify EVM address format
  if (!isAddress(asset)) {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Selected asset is not supported on the active network.',
    };
  }

  let checksummed: `0x${string}`;
  try {
    checksummed = getAddress(asset);
  } catch {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Selected asset is not supported on the active network.',
    };
  }

  // Reject zero address if not Native ETH
  if (checksummed === NATIVE_ETH_ADDRESS) {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Selected asset is not supported on the active network.',
    };
  }

  // Match against supported assets for this specific active chain
  const matchedAsset = supportedAssets.find(
    (a) => !a.isNative && getAddress(a.address) === checksummed
  );

  if (!matchedAsset) {
    return {
      isValid: false,
      isNative: false,
      errorMessage: 'Selected asset is not supported on the active network.',
    };
  }

  return {
    isValid: true,
    isNative: false,
    checksummedAddress: checksummed,
    assetInfo: matchedAsset,
  };
}
