import { getTokens, type TokenConfig } from './network';

export type Asset = TokenConfig;

/**
 * Supported assets per chain — delegates to the centralized `getTokens` from network.ts.
 */
export const SUPPORTED_ASSETS: Record<number, Asset[]> = {};
// Populate from centralized config to maintain backward compatibility
// with existing code that uses SUPPORTED_ASSETS[chainId]
const populateAssets = () => {
  const chains = [8453, 84532];
  for (const chainId of chains) {
    SUPPORTED_ASSETS[chainId] = getTokens(chainId);
  }
};
populateAssets();
